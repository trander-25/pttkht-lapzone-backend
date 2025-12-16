import { StatusCodes } from 'http-status-codes'
import { JwtProvider } from '~/providers/JwtProvider'
import { env } from '~/config/environment'
import ApiError from '~/utils/ApiError'

/**
 * Middleware xác thực JWT access token cho các route được bảo vệ
 * 
 * Quy trình xác thực:
 * 1. Đọc accessToken từ HTTP-only cookie (req.cookies.accessToken)
 *    - Cookie được gửi tự động khi frontend set withCredentials: true
 * 2. Nếu không có token → 401 UNAUTHORIZED "Unauthorized! (token not found)"
 * 3. Verify token bằng JwtProvider.verifyToken() với ACCESS_TOKEN_SECRET_SIGNATURE:
 *    - Kiểm tra signature hợp lệ (chưa bị tamper)
 *    - Kiểm tra chưa hết hạn (exp claim)
 *    - Giải mã JWT payload: { _id, email, username, role, iat, exp }
 * 4. Nếu token hợp lệ:
 *    - Gắn decoded payload vào req.jwtDecoded
 *    - Middleware/Controller tiếp theo có thể dùng req.jwtDecoded._id, req.jwtDecoded.role...
 *    - Gọi next() để tiếp tục xử lý
 * 5. Xử lý lỗi:
 *    - "jwt expired" → 410 GONE "Need to refresh token."
 *      → Frontend intercept 410 → Gọi /auth/refresh-token → Lấy accessToken mới → Retry request
 *    - "jwt malformed", "invalid signature" → 401 UNAUTHORIZED "Unauthorized!"
 *      → Frontend phải redirect đăng nhập lại
 * 
 * Luồng Refresh Token Flow:
 * 1. Frontend gọi API → Nhận 410 GONE (token expired)
 * 2. Frontend tự động gọi GET /auth/refresh-token (refreshToken trong cookie)
 * 3. Backend verify refreshToken → Trả về accessToken mới (cập nhật cookie)
 * 4. Frontend retry request ban đầu với accessToken mới
 * 5. Nếu refreshToken cũng hết hạn → 403 FORBIDDEN → Redirect login
 */
const isAuthorized = async (req, res, next) => {
  // Đọc accessToken từ HTTP-only cookie (bảo mật hơn localStorage)
  const clientAccessToken = req.cookies?.accessToken

  // Từ chối request nếu không có token
  if (!clientAccessToken) {
    next(new ApiError(StatusCodes.UNAUTHORIZED, 'Unauthorized! (token not found)'))
    return
  }
  try {
    // Bước 1: Verify và giải mã JWT access token
    // JwtProvider sẽ kiểm tra: signature hợp lệ, chưa hết hạn, đúng secret key
    const accessTokenDecoded = await JwtProvider.verifyToken(clientAccessToken, env.ACCESS_TOKEN_SECRET_SIGNATURE)

    // Bước 2: Gắn thông tin user đã giải mã vào request object
    // Controllers/Middlewares sau có thể dùng req.jwtDecoded để lấy userId, role, email...
    req.jwtDecoded = accessTokenDecoded

    // Bước 3: Cho phép request đi tiếp đến middleware/route handler tiếp theo
    next()
  } catch (error) {
    // Xử lý token hết hạn: Trả 410 GONE để frontend biết cần refresh token
    // Frontend sẽ gọi /auth/refresh để lấy accessToken mới từ refreshToken
    if (error?.message?.includes('jwt expired')) {
      next(new ApiError(StatusCodes.GONE, 'Need to refresh token.'))
      return
    }

    // Xử lý token không hợp lệ: Trả 401 UNAUTHORIZED để yêu cầu đăng nhập lại
    // Các trường hợp: token bị giả mạo, sai secret key, định dạng sai
    next(new ApiError(StatusCodes.UNAUTHORIZED, 'Unauthorized!'))
  }
}

export const authMiddleware = { isAuthorized }