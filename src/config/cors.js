/**
 * CORS.JS - CẤU HÌNH CORS (CROSS-ORIGIN RESOURCE SHARING)
 *
 * CORS là cơ chế bảo mật của browser, ngăn chặn các website khác
 * gọi request đến API của bạn.
 *
 * File này config:
 * - Whitelist các domain được phép truy cập API
 * - Cho phép gửi cookies/credentials qua CORS
 * - Xử lý preflight OPTIONS requests
 */

import { WHITELIST_DOMAINS } from '~/utils/constants'
import { env } from '~/config/environment'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'

/**
 * Cấu hình CORS options cho Express middleware
 */
export const corsOptions = {
  /**
   * Hàm kiểm tra origin có được phép truy cập hay không
   * @param {string} origin - Domain gửi request (VD: http://localhost:3000)
   * @param {function} callback - Callback function(error, allow)
   */
  origin: function (origin, callback) {
    // Trong môi trường development, cho phép tất cả origins để dễ test
    if (env.BUILD_MODE === 'dev') {
      return callback(null, true)
    }

    // TODO: TEMPORARY - Hiện tại cho phép mọi origin trong production để test
    // CẦN XÓA DÒNG NÀY và bật whitelist checking khi deploy thật
    return callback(null, true)

    // Code bên dưới (đang comment) sẽ kiểm tra origin theo whitelist
    // Chỉ các domain trong WHITELIST_DOMAINS mới được phép gọi API
    // if (WHITELIST_DOMAINS.includes(origin)) {
    //   return callback(null, true)
    // }

    // Từ chối requests từ domains không được phép
    // return callback(new ApiError(StatusCodes.FORBIDDEN, `${origin} not allowed by our CORS Policy.`))
  },

  // Status code 200 thay vì 204 cho preflight OPTIONS requests
  // Một số legacy browsers (IE11, SmartTVs) không xử lý được 204
  optionsSuccessStatus: 200,

  // Cho phép browser gửi credentials (cookies, authorization headers) qua CORS
  // Cần thiết để gửi HTTP-only cookies chứa access_token và refresh_token
  credentials: true
}
