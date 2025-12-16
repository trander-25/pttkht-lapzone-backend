import { StatusCodes } from 'http-status-codes'
import { env } from '~/config/environment'
import { OAuth2Client } from 'google-auth-library'
import ms from 'ms'
import ApiError from '~/utils/ApiError'
import { authService } from '~/services/authService'

const client_id = env.GG_CLIENT_ID
const client = new OAuth2Client(client_id)

/**
 * Xác thực token từ Google OAuth
 * @param {string} token - Token nhận được từ Google Sign-In
 * @returns {Promise<object>} Payload chứa thông tin người dùng từ Google
 */
const verifyTokenGoogle = async (token) => {
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: client_id
  })
  return ticket.getPayload()
}

/**
 * Tạo tài khoản mới cho người dùng
 * @param {object} req.body - Thông tin đăng ký (email, password, username, fullName, phoneNumber)
 * @returns {object} Thông tin người dùng vừa được tạo
 */
const createAccount = async (req, res, next) => {
  try {
    const createdUser = await authService.createAccount(req.body)
    res.status(StatusCodes.CREATED).json(createdUser)
  } catch (error) { next(error) }
}

/**
 * Đăng nhập người dùng bằng email và mật khẩu
 * @param {object} req.body - Thông tin đăng nhập (email, password)
 * @returns {object} Thông tin người dùng đã đăng nhập (tokens được lưu trong HTTP-only cookies)
 * 
 * Quy trình xử lý:
 * 1. authService.login() kiểm tra:
 *    - Email có tồn tại không → 404 NOT_FOUND
 *    - Tài khoản đã active chưa → 406 NOT_ACCEPTABLE
 *    - Mật khẩu có đúng không → 406 NOT_ACCEPTABLE
 * 2. Nếu hợp lệ: Tạo accessToken + refreshToken
 * 3. Lưu tokens vào HTTP-only cookies (security best practice)
 * 4. Chỉ trả về user data (không trả tokens trong response body)
 */
const login = async (req, res, next) => {
  try {
    const result = await authService.login(req.body)
    /**
     * Lưu tokens vào HTTP-only cookies để bảo mật
     * 
     * Cookie Security Settings:
     * - httpOnly: true → Ngăn JavaScript (document.cookie) truy cập → Chống XSS attacks
     * - secure: true → Chỉ gửi qua HTTPS → Chống man-in-the-middle attacks
     * - sameSite: 'none' → Cho phép cross-origin requests (frontend và backend khác domain)
     * - maxAge: 14 ngày (1209600000 ms) → Cookie tự động xóa sau 14 ngày
     * 
     * Lưu ý: sameSite='none' yêu cầu secure=true (HTTPS)
     * Tham khảo: https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies
     */
    res.cookie('accessToken', result.tokens.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: ms('14 days')
    })
    res.cookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: ms('14 days')
    })

    // Chỉ trả về user data, không trả tokens trong response body
    res.status(StatusCodes.OK).json(result.user)
  } catch (error) { next(error) }
}

/**
 * Đăng nhập người dùng bằng tài khoản Google OAuth2
 * @param {object} req.body - Chứa token từ Google OAuth
 * @returns {object} Thông tin người dùng (tự động tạo tài khoản nếu chưa tồn tại)
 * 
 * Quy trình:
 * 1. Verify Google ID token → Lấy email, name, email_verified
 * 2. Kiểm tra email đã tồn tại trong DB chưa:
 *    - Chưa có: Tạo user mới với provider='google', password=null, isActive=true (Google đã verify)
 *    - Đã có: Sử dụng user hiện tại
 * 3. Tạo JWT tokens và lưu vào cookies
 * 4. Trả về user data
 * 
 * Lưu ý: Google users không có password, không thể dùng forgot/reset password
 */
const googleLogin = async (req, res, next) => {
  try {
    const { token } = req.body
    // Xác thực token với Google và lấy thông tin người dùng
    const payload = await verifyTokenGoogle(token)

    const result = await authService.googleLogin(payload)

    // Set HTTP-only cookies giống như login thông thường
    res.cookie('accessToken', result.tokens.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: ms('14 days')
    })
    res.cookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: ms('14 days')
    })

    // Chỉ trả về user data, không trả tokens trong response body
    res.status(StatusCodes.OK).json(result.user)
  } catch (error) { next(error) }
}

/**
 * Xác thực tài khoản người dùng bằng token từ email
 * @param {object} req.body - Chứa email và verifyToken (UUID không hết hạn)
 * @returns {object} Kết quả xác thực tài khoản (message + user info)
 * 
 * Lưu ý:
 * - Token không có thời gian hết hạn (khác với resetPasswordToken)
 * - Token chỉ bị xóa khi tài khoản được kích hoạt (isActive = true)
 * - Sau khi verify thành công, user có thể đăng nhập
 */
const verifyAccount = async (req, res, next) => {
  try {
    const result = await authService.verifyAccount(req.body)
    res.status(StatusCodes.OK).json(result)
  } catch (error) { next(error) }
}

/**
 * Đăng xuất người dùng
 * Xóa các authentication cookies để hoàn tất quá trình đăng xuất
 * @returns {void} Response 204 No Content với { loggedOut: true }
 * 
 * Quy trình:
 * 1. Gọi res.clearCookie('accessToken') - Xóa access token cookie
 * 2. Gọi res.clearCookie('refreshToken') - Xóa refresh token cookie
 * 3. Trả về 204 No Content
 * 
 * Lưu ý:
 * - Hệ thống không sử dụng token blacklist (stateless JWT)
 * - Token cũ vẫn valid cho đến khi hết hạn nhưng browser đã xóa
 * - Client phải thực sự xóa cookies để logout có hiệu lực
 */
const logout = async (req, res, next) => {
  try {
    // Xóa cookies chứa accessToken và refreshToken
    res.clearCookie('accessToken')
    res.clearCookie('refreshToken')

    res.status(StatusCodes.NO_CONTENT).json({ loggedOut: true })
  } catch (error) { next(error) }
}

/**
 * Làm mới access token bằng refresh token
 * Sử dụng khi access token hết hạn để lấy token mới mà không cần đăng nhập lại
 * @returns {object} Access token mới
 * 
 * Quy trình:
 * 1. Lấy refreshToken từ req.cookies (HTTP-only cookie)
 * 2. Verify refreshToken với REFRESH_TOKEN_SECRET_SIGNATURE
 *    - Invalid/Expired → 403 "Please Sign In! (Error from refresh Token)"
 * 3. Extract user info từ decoded token (_id, email, username, role)
 * 4. Tạo accessToken mới (không query DB → Performance tốt hơn)
 * 5. Cập nhật accessToken cookie mới
 * 6. Trả về { accessToken }
 * 
 * Lưu ý: Frontend gọi API này khi nhận 410 GONE từ protected routes
 */
const refreshToken = async (req, res, next) => {
  try {
    // Lấy refreshToken từ cookie
    const result = await authService.refreshToken(req.cookies?.refreshToken)
    // Cập nhật accessToken mới vào cookie
    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: ms('14 days')
    })

    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(new ApiError(StatusCodes.FORBIDDEN, 'Please Sign In! (Error from refresh Token)'))
  }
}

/**
 * Đổi mật khẩu cho người dùng đã đăng nhập
 * @param {object} req.body - Chứa current_password và new_password
 * @returns {object} Thông báo đổi mật khẩu thành công
 * 
 * Quy trình:
 * 1. Lấy userId từ req.jwtDecoded (đã verify bởi authMiddleware)
 * 2. Kiểm tra user tồn tại và isActive=true
 * 3. Verify current_password bằng bcrypt.compareSync()
 *    - Sai → 406 "Your Current Password is incorrect!"
 * 4. Hash new_password và cập nhật vào DB
 * 5. Trả về success message
 * 
 * Lưu ý: Khác forgotPassword (không cần current password), API này bắt buộc verify current password
 */
const changePassword = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded._id
    await authService.changePassword(userId, req.body)
    res.status(StatusCodes.OK).json({ message: 'Password changed successfully' })
  } catch (error) { next(error) }
}

/**
 * Gửi email chứa link reset mật khẩu cho người dùng quên mật khẩu
 * @param {object} req.body - Chứa email của người dùng
 * @returns {object} Thông báo đã gửi email reset password
 * 
 * Quy trình:
 * 1. Kiểm tra email tồn tại → 404 nếu không tìm thấy
 * 2. Kiểm tra provider='local' → 400 nếu là Google account
 * 3. Tạo random token (32 bytes hex) và hash SHA256
 * 4. Lưu hashed token + expires (15 phút) vào DB
 * 5. Gửi email với raw token (chưa hash)
 * 6. Nếu gửi email thất bại → Rollback: Xóa token khỏi DB
 * 
 * Lưu ý: Token trong email khác token trong DB (raw vs hashed)
 */
const forgotPassword = async (req, res, next) => {
  try {
    const result = await authService.forgotPassword(req.body.email)
    res.status(StatusCodes.OK).json(result)
  } catch (error) { next(error) }
}

/**
 * Đặt lại mật khẩu mới cho người dùng bằng token nhận được từ email
 * @param {object} req.body - Chứa token (từ email) và newPassword
 * @returns {object} Thông báo reset mật khẩu thành công
 * 
 * Quy trình:
 * 1. Hash token từ URL (SHA256) để so khớp với DB
 * 2. Tìm user có resetPasswordToken khớp VÀ chưa hết hạn (resetPasswordExpires > now)
 * 3. Nếu không tìm thấy → 400 "Invalid or expired reset token"
 * 4. Hash newPassword (bcrypt) và cập nhật vào DB
 * 5. Xóa resetPasswordToken và resetPasswordExpires khỏi DB
 * 6. Trả về success message
 * 
 * Lưu ý: Token hết hạn sau 15 phút kể từ khi tạo
 */
const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body
    const result = await authService.resetPassword(token, newPassword)
    res.status(StatusCodes.OK).json(result)
  } catch (error) { next(error) }
}

export const authController = {
  createAccount,
  login,
  googleLogin,
  verifyAccount,
  logout,
  refreshToken,
  changePassword,
  forgotPassword,
  resetPassword
}