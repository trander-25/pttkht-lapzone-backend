/* eslint-disable no-unused-vars */
import { StatusCodes } from 'http-status-codes'
import { env } from '~/config/environment'

/**
 * Middleware xử lý lỗi tập trung cho toàn bộ ứng dụng Express
 * 
 * Cách hoạt động:
 * - Middleware này có 4 parameters (err, req, res, next) → Express tự nhận biết là error handler
 * - Được đặt CUỐI CÙNG trong chuỗi middleware (sau tất cả routes)
 * - Bất kỳ lỗi nào được throw hoặc next(error) sẽ đến đây
 * 
 * Quy trình:
 * 1. Kiểm tra statusCode, nếu không có → mặc định 500 INTERNAL_SERVER_ERROR
 * 2. Tạo responseError object:
 *    - statusCode: Mã HTTP status
 *    - message: Thông báo lỗi (nếu không có thì dùng reason phrase chuẩn)
 *    - stack: Stack trace để debug (chỉ hiển thị ở môi trường DEV)
 * 3. Xóa stack trace nếu môi trường PRODUCTION (bảo mật)
 * 4. Trả về JSON response với statusCode và error details
 * 
 * Có thể mở rộng:
 * - Ghi log vào file
 * - Gửi alert vào Slack/Telegram
 * - Tracking error vào Sentry/monitoring service
 */
export const errorHandlingMiddleware = (err, req, res, next) => {

  // Nếu dev không set statusCode thì mặc định 500 INTERNAL_SERVER_ERROR
  if (!err.statusCode) err.statusCode = StatusCodes.INTERNAL_SERVER_ERROR

  // Tạo response error object để kiểm soát dữ liệu trả về frontend
  const responseError = {
    statusCode: err.statusCode,
    message: err.message || StatusCodes[err.statusCode], // Fallback: Dùng reason phrase chuẩn HTTP
    stack: err.stack // Stack trace để debug (chỉ ở DEV)
  }
  // console.error(responseError)

  // Chỉ hiển thị stack trace ở môi trường DEV để debug
  // Môi trường PRODUCTION xóa stack để bảo mật (tránh lộ thông tin code)
  if (env.BUILD_MODE !== 'dev') delete responseError.stack

  // Đoạn này có thể mở rộng nhiều về sau:
  // - Ghi Error Log vào file (winston, morgan)
  // - Gửi alert vào Slack, Telegram, Email
  // - Track error vào Sentry, Datadog
  // - Tạo dashboard monitoring lỗi
  // console.error(responseError)

  // Trả JSON response error về frontend với statusCode tương ứng
  res.status(responseError.statusCode).json(responseError)
}