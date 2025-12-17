import JWT from 'jsonwebtoken'

/**
 * Tạo JWT token với thông tin người dùng, chữ ký bí mật và thời gian hết hạn
 * Sử dụng thuật toán HS256 (HMAC-SHA256) để ký token
 * @param {object} userInfo - Thông tin người dùng (_id, email, username, role)
 * @param {string} secretSignature - Chữ ký bí mật từ biến môi trường
 * @param {string} tokenLife - Thời gian sống của token (vd: '1h', '7d', '14 days')
 * @returns {Promise<string>} JWT token đã được ký
 */
const generateToken = async (userInfo, secretSignature, tokenLife) => {
  try {
    return JWT.sign(userInfo, secretSignature, { algorithm: 'HS256', expiresIn: tokenLife })
  } catch (error) { throw new Error(error)}
}

/**
 * Xác thực tính hợp lệ của JWT token và trả về payload nếu hợp lệ
 * Kiểm tra:
 * - Chữ ký token có đúng không
 * - Token có hết hạn chưa
 * - Token có bị giả mạo không
 * @param {string} token - JWT token cần xác thực
 * @param {string} secretSignature - Chữ ký bí mật để xác thực
 * @returns {Promise<object>} Payload đã được giải mã chứa thông tin người dùng
 */
const verifyToken = async (token, secretSignature) => {
  try {
    return JWT.verify(token, secretSignature)
  } catch (error) { throw new Error(error)}
}

export const JwtProvider = {
  generateToken,
  verifyToken
}
