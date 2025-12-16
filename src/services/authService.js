import { userModel } from '~/models/userModel'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import bcryptjs from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import { pickUser } from '~/utils/formatters'
import { env } from '~/config/environment'
import { JwtProvider } from '~/providers/JwtProvider'
import { ResendProvider } from '~/providers/ResendProvider'
import crypto from 'crypto'
import { TOKEN_EXPIRY } from '~/utils/constants'

/**
 * Tạo cặp token xác thực (access token và refresh token)
 * Access token: Dùng để xác thực các request API, thời gian sống ngắn (hiện tại: 14 days cho dev)
 * Refresh token: Dùng để tạo access token mới khi hết hạn, thời gian sống dài (14 days)
 * 
 * @param {object} user - Thông tin người dùng từ database
 * @returns {object} Object chứa accessToken và refreshToken
 * 
 * JWT Payload chứa:
 * - _id: User ID (ObjectId string)
 * - email: User email
 * - username: Display name
 * - role: customer | manager | admin
 * - iat: Issued at timestamp (auto by JWT)
 * - exp: Expiration timestamp (auto by JWT)
 * 
 * Lưu ý:
 * - Payload KHÔNG chứa password, verifyToken, resetPasswordToken (security)
 * - Chỉ lưu data ít thay đổi (nếu username đổi, token cũ vẫn dùng được đến khi hết hạn)
 * - Token signed với HMAC-SHA256 algorithm
 */
const generateAccessAndRefreshTokens = async (user) => {
  const userInfo = {
    _id: user._id,
    email: user.email,
    username: user.username,
    role: user.role
  }

  const accessToken = await JwtProvider.generateToken(
    userInfo,
    env.ACCESS_TOKEN_SECRET_SIGNATURE,
    // env.ACCESS_TOKEN_LIFE
    '14 days' // Extended for development purposes
  )
  const refreshToken = await JwtProvider.generateToken(
    userInfo,
    env.REFRESH_TOKEN_SECRET_SIGNATURE,
    env.REFRESH_TOKEN_LIFE
  )

  return { accessToken, refreshToken }
}

/**
 * Tạo tài khoản người dùng mới
 * Quy trình:
 * 1. Kiểm tra email đã tồn tại chưa
 * 2. Mã hóa mật khẩu bằng bcrypt
 * 3. Tạo mã xác thực (verifyToken)
 * 4. Lưu thông tin vào database (trạng thái isActive = false)
 * 5. Gửi email xác thực tài khoản
 * @param {object} reqBody - Chứa email, password, username (tùy chọn)
 * @returns {object} Thông tin người dùng vừa tạo (đã loại bỏ thông tin nhạy cảm)
 */
const createAccount = async (reqBody) => {
  try {
    // Kiểm tra email đã đăng ký trong hệ thống chưa
    const existUser = await userModel.findOneByEmail(reqBody.email)
    if (existUser) {
      throw new ApiError(StatusCodes.CONFLICT, 'Email already exists!')
    }

    // Chuẩn bị dữ liệu người dùng để lưu vào database
    // Lấy username từ email nếu không được cung cấp (vd: 'trander@gmail.com' → 'trander')
    const nameFromEmail = reqBody.username || reqBody.email.split('@')[0]
    const newUser = {
      email: reqBody.email,
      password: bcryptjs.hashSync(reqBody.password, 8), // Mã hóa với độ phức tạp 8
      username: nameFromEmail,
      provider: userModel.USER_PROVIDER.LOCAL,
      verifyToken: uuidv4(),
      isActive: false // Tài khoản cần xác thực email trước khi kích hoạt
    }

    // Lưu dữ liệu người dùng vào database
    const createdUser = await userModel.createUser(newUser)
    const getNewUser = await userModel.findOneById(createdUser.insertedId)

    // Gửi email xác thực tài khoản cho người dùng
    try {
      await ResendProvider.sendVerificationEmail(getNewUser.email, getNewUser.verifyToken)
    } catch (emailError) {
      // Ghi log lỗi nhưng KHÔNG chặn quá trình đăng ký
      // Lý do: User đã được tạo trong DB, chỉ thiếu email
      // Giải pháp: User có thể request resend verification email sau (hoặc admin gửi lại)
      // Trade-off: UX tốt hơn (đăng ký thành công) vs Email delivery không guaranteed
      console.error('Failed to send verification email:', emailError.message)
    }

    // Trả về dữ liệu người dùng đã lọc, loại bỏ thông tin nhạy cảm
    return pickUser(getNewUser)
  } catch (error) { throw error }
}

/**
 * Xử lý đăng nhập người dùng
 * Quy trình:
 * 1. Tìm tài khoản theo email
 * 2. Kiểm tra tài khoản có tồn tại và đang active không
 * 3. Xác thực mật khẩu
 * 4. Tạo cặp JWT tokens (access + refresh)
 * @param {object} reqBody - Chứa email và password
 * @returns {object} Chứa tokens và thông tin người dùng
 */
const login = async (reqBody) => {
  try {
    // Tìm tài khoản người dùng theo email
    const existUser = await userModel.findOneByEmail(reqBody.email)

    // Xác thực thông tin đăng nhập và trạng thái tài khoản
    if (!existUser) throw new ApiError(StatusCodes.NOT_FOUND, 'Account not found!')
    if (!existUser.isActive) throw new ApiError(StatusCodes.NOT_ACCEPTABLE, 'Your account is not active!')
    if (!bcryptjs.compareSync(reqBody.password, existUser.password)) {
      throw new ApiError(StatusCodes.NOT_ACCEPTABLE, 'Your Email or Password is incorrect!')
    }

    // Tạo JWT tokens cho phiên đăng nhập
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(existUser)

    // Trả về tokens riêng biệt và thông tin người dùng (tokens sẽ được set vào httpOnly cookies ở controller)
    return {
      tokens: { accessToken, refreshToken },
      user: pickUser(existUser)
    }
  } catch (error) { throw error }
}

/**
 * Xử lý đăng nhập bằng Google OAuth
 * Quy trình:
 * 1. Kiểm tra email có tồn tại trong hệ thống chưa
 * 2. Nếu chưa có: Tạo tài khoản mới tự động
 * 3. Nếu đã có: Sử dụng tài khoản hiện tại
 * 4. Tạo cặp JWT tokens
 * @param {object} reqBody - Payload từ Google (chứa email, name, email_verified)
 * @returns {object} Chứa tokens và thông tin người dùng
 */
const googleLogin = async (reqBody) => {
  try {
    const { email, name, email_verified } = reqBody
    let user = await userModel.findOneByEmail(email)

    if (!user) {
      // Nếu người dùng chưa tồn tại, tạo tài khoản mới tự động
      const newUser = {
        email,
        username: name,
        provider: userModel.USER_PROVIDER.GOOGLE,
        isActive: email_verified // Google đã xác thực email nên set active ngay
      }
      const createdUser = await userModel.createUser(newUser)
      user = await userModel.findOneById(createdUser.insertedId)
    }

    // Tạo tokens cho người dùng
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user)

    // Trả về tokens riêng biệt và thông tin người dùng (tokens sẽ được set vào httpOnly cookies ở controller)
    return {
      tokens: { accessToken, refreshToken },
      user: pickUser(user)
    }
  } catch (error) { throw error }
}

/**
 * Làm mới access token bằng refresh token
 * Sử dụng khi access token hết hạn để lấy token mới mà không cần đăng nhập lại
 * @param {string} clientRefreshToken - Refresh token từ cookie của client
 * @returns {object} Access token mới
 */
const refreshToken = async (clientRefreshToken) => {
  try {
    // Xác thực và giải mã refresh token để đảm bảo token hợp lệ
    const refreshTokenDecoded = await JwtProvider.verifyToken(
      clientRefreshToken,
      env.REFRESH_TOKEN_SECRET_SIGNATURE
    )

    // Trích xuất thông tin người dùng từ token đã giải mã (tránh query database để tăng hiệu suất)
    // Vì chỉ lưu dữ liệu không thay đổi trong token, chúng ta có thể sử dụng lại an toàn
    const userInfo = {
      _id: refreshTokenDecoded._id,
      email: refreshTokenDecoded.email,
      username: refreshTokenDecoded.username,
      role: refreshTokenDecoded.role
    }

    // Tạo access token mới với thời gian hết hạn mới
    const accessToken = await JwtProvider.generateToken(
      userInfo,
      env.ACCESS_TOKEN_SECRET_SIGNATURE,
      env.ACCESS_TOKEN_LIFE // Token ngắn hạn
    )

    return { accessToken }
  } catch (error) { throw error }
}

/**
 * Đổi mật khẩu cho người dùng đã đăng nhập
 * Yêu cầu xác thực mật khẩu cũ trước khi cho phép đổi
 * @param {string} userId - ID của người dùng
 * @param {object} reqBody - Chứa current_password và new_password
 * @returns {object} Thông tin người dùng đã cập nhật
 */
const changePassword = async (userId, reqBody) => {
  try {
    // Xác minh người dùng tồn tại và tài khoản đang active
    const existUser = await userModel.findOneById(userId)
    if (!existUser) throw new ApiError(StatusCodes.NOT_FOUND, 'Account not found!')
    if (!existUser.isActive) throw new ApiError(StatusCodes.NOT_ACCEPTABLE, 'Your account is not active!')

    // Khởi tạo biến cho kết quả cập nhật
    let updatedUser = {}

    // Xử lý đổi mật khẩu với xác thực mật khẩu hiện tại
    if (reqBody.current_password && reqBody.new_password) {
      // Xác thực mật khẩu hiện tại trước khi cho phép đổi
      if (!bcryptjs.compareSync(reqBody.current_password, existUser.password)) {
        throw new ApiError(StatusCodes.NOT_ACCEPTABLE, 'Your Current Password is incorrect!')
      }

      // Mã hóa mật khẩu mới và cập nhật trong database
      updatedUser = await userModel.updateOneById(existUser._id, {
        password: bcryptjs.hashSync(reqBody.new_password, 8)
      })
    }
    return pickUser(updatedUser)
  } catch (error) { throw error }
}

/**
 * Xử lý quên mật khẩu - Gửi email chứa link reset mật khẩu
 * Quy trình:
 * 1. Kiểm tra email có tồn tại trong hệ thống
 * 2. Kiểm tra không phải tài khoản Google (Google không có password)
 * 3. Tạo reset token ngẫu nhiên (32 bytes)
 * 4. Mã hóa token và lưu vào database với thời gian hết hạn (15 phút)
 * 5. Gửi email chứa link reset với token gốc (chưa mã hóa)
 * @param {string} email - Email của người dùng
 * @returns {object} Thông báo đã gửi email thành công
 */
const forgotPassword = async (email) => {
  try {
    // Tìm người dùng theo email
    const user = await userModel.findOneByEmail(email)
    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'No account found with this email address')
    }

    // Kiểm tra xem người dùng có đang sử dụng Google login không
    if (user.provider === userModel.USER_PROVIDER.GOOGLE) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Google accounts cannot reset password. Please use Google Sign-In.')
    }

    // Tạo reset token ngẫu nhiên (chuỗi hex 32 bytes)
    const resetToken = crypto.randomBytes(32).toString('hex')

    // Mã hóa token trước khi lưu vào database (bảo mật tốt nhất)
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex')

    // Token hết hạn sau 15 phút
    const expires = Date.now() + TOKEN_EXPIRY.RESET_PASSWORD

    // Lưu token đã mã hóa vào database
    await userModel.setResetPasswordToken(user._id, hashedToken, expires)

    // Gửi email với token gốc (chưa mã hóa)
    try {
      await ResendProvider.sendPasswordResetEmail(email, resetToken)
    } catch (emailError) {
      // Rollback: Xóa reset token nếu gửi email thất bại
      await userModel.clearResetPasswordToken(user._id)

      // Cung cấp thông báo lỗi hữu ích
      if (emailError.message.includes('not verified')) {
        throw new ApiError(
          StatusCodes.SERVICE_UNAVAILABLE,
          'Unable to send reset email. Please ensure your domain is verified in Resend dashboard or contact support.'
        )
      }
      if (emailError.message.includes('API key')) {
        throw new ApiError(
          StatusCodes.SERVICE_UNAVAILABLE,
          'Email service configuration error. Please contact support.'
        )
      }
      throw new ApiError(StatusCodes.SERVICE_UNAVAILABLE, `Failed to send reset email: ${emailError.message}`)
    }

    return {
      message: 'Password reset link has been sent to your email',
      email: email
    }
  } catch (error) { throw error }
}

/**
 * Reset mật khẩu mới bằng token từ email
 * Quy trình:
 * 1. Mã hóa token từ URL để so sánh với database
 * 2. Tìm người dùng với token hợp lệ (chưa hết hạn)
 * 3. Mã hóa và cập nhật mật khẩu mới
 * 4. Xóa reset token khỏi database
 * @param {string} token - Token từ URL (chưa mã hóa)
 * @param {string} newPassword - Mật khẩu mới
 * @returns {object} Thông báo reset thành công
 */
const resetPassword = async (token, newPassword) => {
  try {
    // Mã hóa token từ URL để so sánh với database
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex')

    // Tìm người dùng với reset token hợp lệ
    const user = await userModel.findByResetToken(hashedToken)

    if (!user) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid or expired reset token')
    }

    // Mã hóa mật khẩu mới và cập nhật
    const hashedPassword = bcryptjs.hashSync(newPassword, 8)
    await userModel.updateOneById(user._id, { password: hashedPassword })

    // Xóa reset token
    await userModel.clearResetPasswordToken(user._id)

    return {
      message: 'Password has been reset successfully'
    }
  } catch (error) { throw error }
}

/**
 * Xác thực tài khoản người dùng bằng token từ email
 * Quy trình:
 * 1. Tìm tài khoản theo email → 404 nếu không tìm thấy
 * 2. Kiểm tra tài khoản chưa được xác thực → 400 nếu đã active
 * 3. So khớp verifyToken (simple string comparison, KHÔNG hash)
 *    → 400 "Invalid verification token" nếu không khớp
 * 4. Cập nhật: isActive=true, verifyToken=null, updatedAt=now
 * 5. Trả về success message + user info
 * 
 * Lưu ý:
 * - Token KHÔNG có expiry (khác resetPasswordToken)
 * - Token KHÔNG được hash (khác resetPasswordToken)
 * - Token chỉ bị xóa khi verify thành công
 * 
 * @param {object} reqBody - Chứa email và token (UUID string)
 * @returns {object} Thông báo xác thực thành công và thông tin người dùng
 */
const verifyAccount = async (reqBody) => {
  try {
    const { email, token } = reqBody

    // Tìm người dùng theo email
    const user = await userModel.findOneByEmail(email)
    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Account not found!')
    }

    // Kiểm tra xem tài khoản đã được xác thực chưa
    if (user.isActive) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Account is already verified!')
    }

    // Xác thực mã verifyToken
    if (user.verifyToken !== token) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid verification token!')
    }

    // Kích hoạt tài khoản và xóa mã xác thực
    const updatedUser = await userModel.updateOneById(user._id, {
      isActive: true,
      verifyToken: null,
      updatedAt: Date.now()
    })

    return {
      message: 'Account verified successfully! You can now log in.',
      user: pickUser(updatedUser)
    }
  } catch (error) { throw error }
}

export const authService = {
  createAccount,
  login,
  googleLogin,
  refreshToken,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyAccount
}