import { env } from '~/config/environment'

/**
 * Danh sách domains được phép truy cập API (CORS whitelist)
 * Frontend chỉ có thể gọi API từ các domain này
 */
export const WHITELIST_DOMAINS = [
  'http://localhost:5173', // Dev frontend luôn chạy
  'https://lapzone.me',    // Production domain
  'http://lapzone.me'
]

/**
 * Website domain hiện tại (dùng cho links trong email, redirects...)
 */
export const WEBSITE_DOMAIN = (env.BUILD_MODE === 'production') ? env.WEBSITE_DOMAIN_PRODUCTION : env.WEBSITE_DOMAIN_DEVELOPMENT

/**
 * Pagination constants cho các module khác nhau
 * Giới hạn DEFAULT_LIMIT, MIN_LIMIT, MAX_LIMIT để tránh overload database
 */

// Pagination chung (users, orders, conversations...)
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MIN_LIMIT: 1,
  MAX_LIMIT: 100
}

// Product Pagination
export const PRODUCT_PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 12,
  MIN_LIMIT: 1,
  MAX_LIMIT: 50
}

// Order Pagination
export const ORDER_PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MIN_LIMIT: 1,
  MAX_LIMIT: 50
}

// Wishlist Pagination
export const WISHLIST_PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 12,
  MIN_LIMIT: 1,
  MAX_LIMIT: 50
}

/**
 * Thời gian hết hạn của các loại token (tính bằng milliseconds)
 */
export const TOKEN_EXPIRY = {
  RESET_PASSWORD: 15 * 60 * 1000, // 15 phút (crypto token cho reset password)
  VERIFY_EMAIL: 15 * 60 * 1000 // 15 phút (token xác thực email)
}

/**
 * Rate limiting cho gửi lại email verify
 * Người dùng phải chờ 15 phút trước khi gửi lại
 */
export const RESEND_EMAIL_COOLDOWN = 15 * 60 * 1000 // 15 phút

export const DEFAULT_PAGE = 1
export const DEFAULT_ITEMS_PER_PAGE = 12
