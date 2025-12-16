/**
 * Custom Error class cho API responses
 *
 * Mục đích:
 * - Tạo lỗi chuẩn với HTTP status code
 * - Dễ dàng throw error với statusCode và message
 * - errorHandlingMiddleware sẽ bắt và format response
 *
 * Cách sử dụng:
 * throw new ApiError(StatusCodes.NOT_FOUND, 'Product not found')
 * throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid credentials')
 *
 * Kết quả response:
 * {
 *   "statusCode": 404,
 *   "message": "Product not found",
 *   "stack": "..." // Chỉ hiển thị ở DEV mode
 * }
 */
class ApiError extends Error {
  constructor(statusCode, message) {
    // Gọi constructor của Error để kế thừa chức năng cơ bản
    // Truyền message cho parent constructor để xử lý error chuẩn
    super(message)

    // Đặt tên error để phân biệt với Error thông thường
    this.name = 'ApiError'

    // Gắn HTTP status code để middleware trả về response
    this.statusCode = statusCode

    // Capture stack trace để debug, loại bỏ constructor khỏi stack
    Error.captureStackTrace(this, this.constructor)
  }
}

export default ApiError