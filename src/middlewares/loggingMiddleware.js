/**
 * LOGGING MIDDLEWARE - Request/Response Logger
 *
 * Middleware để log tất cả HTTP requests từ frontend
 * - Ghi lại method, URL, status code, response time
 * - Lưu request body cho POST/PUT/PATCH
 * - Lưu user info nếu có authentication
 * - Tích hợp với winston logger
 */

import { logger } from '~/config/logger'

/**
 * Middleware log HTTP requests
 * Ghi lại chi tiết request và response để debug
 * BẮT MỌI REQUEST bao gồm OPTIONS, 404, static files, etc.
 */
export const requestLogger = (req, res, next) => {
  // Lưu thời điểm bắt đầu request
  const startTime = Date.now()
  
  // Lấy thông tin cơ bản
  const { method, url, ip, headers } = req
  const userAgent = headers['user-agent'] || 'Unknown'
  const origin = headers.origin || headers.referer || 'Direct'
  const realIp = headers['x-forwarded-for'] || headers['x-real-ip'] || ip
  
  // Phân loại request type
  const isApiRequest = url.startsWith('/v1')
  const isDocsRequest = url.startsWith('/api-docs')
  const isOptionsRequest = method === 'OPTIONS'
  
  // Log incoming request với emoji phù hợp
  const emoji = isOptionsRequest ? '🔍' : isApiRequest ? '📥' : isDocsRequest ? '📚' : '📄'
  
  logger.http(`${emoji} INCOMING ${method} ${url}`, {
    ip: realIp,
    userAgent,
    origin,
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
    params: Object.keys(req.params).length > 0 ? req.params : undefined,
    // Log headers cho OPTIONS (CORS preflight)
    ...(isOptionsRequest && {
      corsHeaders: {
        'access-control-request-method': headers['access-control-request-method'],
        'access-control-request-headers': headers['access-control-request-headers']
      }
    }),
    // Chỉ log body cho các method có body (không log password)
    ...((['POST', 'PUT', 'PATCH'].includes(method)) && req.body && {
      body: sanitizeBody(req.body)
    })
  })

  // Hook vào response finish event để log kết quả
  res.on('finish', () => {
    const duration = Date.now() - startTime
    const { statusCode } = res
    const logLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'http'
    
    // Emoji status indicator
    let statusEmoji
    if (statusCode >= 500) statusEmoji = '💥' // Server error
    else if (statusCode === 404) statusEmoji = '🔍' // Not found
    else if (statusCode >= 400) statusEmoji = '⚠️' // Client error
    else if (statusCode === 304) statusEmoji = '💾' // Not modified (cache)
    else if (statusCode === 204) statusEmoji = '✔️' // No content
    else if (statusCode >= 200) statusEmoji = '✅' // Success
    else statusEmoji = 'ℹ️' // Info
    
    logger[logLevel](`${statusEmoji} RESPONSE ${method} ${url} - ${statusCode}`, {
      statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('content-length') || '0',
      // Log thêm user nếu có (đã authenticated)
      ...(req.user && {
        userId: req.user._id,
        userEmail: req.user.email
      })
    })
  })

  // Hook vào error event
  res.on('error', (error) => {
    const duration = Date.now() - startTime
    logger.error(`❌ ERROR ${method} ${url}`, {
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`
    })
  })

  next()
}

/**
 * Làm sạch request body trước khi log
 * Ẩn thông tin nhạy cảm như password, token
 *
 * @param {Object} body - Request body
 * @returns {Object} - Sanitized body
 */
const sanitizeBody = (body) => {
  if (!body || typeof body !== 'object') return body

  const sanitized = { ...body }
  const sensitiveFields = ['password', 'currentPassword', 'newPassword', 'confirmPassword', 'token', 'refreshToken', 'accessToken']
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '***HIDDEN***'
    }
  })

  return sanitized
}

/**
 * Middleware log errors
 * Ghi lại chi tiết lỗi để debug
 */
export const errorLogger = (err, req, res, next) => {
  logger.error(`🔴 ERROR in ${req.method} ${req.url}`, {
    message: err.message,
    stack: err.stack,
    statusCode: err.statusCode || 500,
    user: req.user?._id || 'Anonymous',
    body: sanitizeBody(req.body),
    query: req.query,
    params: req.params
  })
  
  next(err)
}

/**
 * Middleware bắt 404 - Route không tồn tại
 * Đặt ở cuối tất cả routes để catch mọi request không match
 */
export const notFoundLogger = (req, res, next) => {
  logger.warn(`🔍 404 NOT FOUND: ${req.method} ${req.url}`, {
    ip: req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.ip,
    userAgent: req.headers['user-agent'],
    origin: req.headers.origin || req.headers.referer || 'Direct',
    query: req.query,
    params: req.params
  })
  
  // Chuyển tiếp cho error handler xử lý response
  next()
}
