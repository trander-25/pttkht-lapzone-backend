import { StatusCodes } from 'http-status-codes'
import { JwtProvider } from '~/providers/JwtProvider'
import { env } from '~/config/environment'
import ApiError from '~/utils/ApiError'

/**
 * JWT Authentication Middleware
 * - Verify accessToken from HTTP-only cookie
 * - Decode and attach user info to req.jwtDecoded
 */
const isAuthorized = async (req, res, next) => {
  const clientAccessToken = req.cookies?.accessToken

  if (!clientAccessToken) {
    next(new ApiError(StatusCodes.UNAUTHORIZED, 'Unauthorized! (token not found)'))
    return
  }
  
  try {
    const accessTokenDecoded = await JwtProvider.verifyToken(clientAccessToken, env.ACCESS_TOKEN_SECRET_SIGNATURE)
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
