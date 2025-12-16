/**
 * LOGGER CONFIGURATION - Winston Logger Setup
 *
 * Cấu hình logging system chuyên nghiệp cho production server
 * - Tự động rotate logs theo ngày
 * - Phân tách logs theo level (error, warn, info, http, debug)
 * - Format logs dễ đọc và dễ parse
 * - Lưu logs vào thư mục logs/ để dễ debug trên EC2
 */

import winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'
import path from 'path'
import { env } from '~/config/environment'

// Đường dẫn tuyệt đối đến thư mục logs (luôn ở root project)
const LOG_DIR = path.join(process.cwd(), 'logs')

// Custom format để colorize output cho console
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`
    if (Object.keys(meta).length > 0) {
      msg += `\n${JSON.stringify(meta, null, 2)}`
    }
    return msg
  })
)

// Format cho file logs (dễ đọc, có cấu trúc rõ ràng)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    // Format cơ bản: timestamp [level] message
    let log = `${timestamp} [${level.toUpperCase().padEnd(5)}] ${message}`
    
    // Nếu có metadata, format đẹp hơn
    if (Object.keys(meta).length > 0) {
      // Các field quan trọng hiển thị trên cùng dòng
      const inline = []
      if (meta.statusCode) inline.push(`Status: ${meta.statusCode}`)
      if (meta.duration) inline.push(`Time: ${meta.duration}`)
      if (meta.ip) inline.push(`IP: ${meta.ip}`)
      if (meta.userId) inline.push(`User: ${meta.userId}`)
      
      if (inline.length > 0) {
        log += ` | ${inline.join(' | ')}`
      }
      
      // Các field chi tiết xuống dòng với indent
      const details = { ...meta }
      delete details.statusCode
      delete details.duration
      delete details.ip
      delete details.userId
      delete details.contentLength
      delete details.userEmail
      
      if (Object.keys(details).length > 0) {
        // Format JSON đẹp với indent
        const detailStr = JSON.stringify(details, null, 2)
        log += '\n    📋 ' + detailStr.replace(/\n/g, '\n       ')
      }
    }
    
    // Thêm separator cho RESPONSE để dễ phân biệt
    if (message.includes('RESPONSE')) {
      log += '\n' + '─'.repeat(80)
    }
    
    return log
  })
)

// Transports - nơi logs sẽ được ghi
const transports = []

// ============================================
// PRODUCTION MODE: Ghi logs vào files
// ============================================
if (env.BUILD_MODE === 'production') {
  // Logs cho tất cả levels (combined)
  transports.push(
    new DailyRotateFile({
      filename: path.join(LOG_DIR, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m', // Rotate khi file > 20MB
      maxFiles: '14d', // Giữ logs 14 ngày
      format: fileFormat,
      level: 'info'
    })
  )

  // Logs riêng cho errors
  transports.push(
    new DailyRotateFile({
      filename: path.join(LOG_DIR, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d', // Giữ error logs lâu hơn (30 ngày)
      format: fileFormat,
      level: 'error'
    })
  )

  // Logs cho HTTP requests
  transports.push(
    new DailyRotateFile({
      filename: path.join(LOG_DIR, 'http-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '7d', // HTTP logs chỉ giữ 7 ngày
      format: fileFormat,
      level: 'http'
    })
  )

  // Console output cho production (để PM2 capture)
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      level: 'info'
    })
  )
}

// ============================================
// DEVELOPMENT MODE: Chỉ log ra console
// ============================================
if (env.BUILD_MODE === 'dev') {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      level: 'debug' // Dev mode hiện nhiều thông tin hơn
    })
  )
}

// Tạo logger instance
const logger = winston.createLogger({
  level: env.BUILD_MODE === 'production' ? 'info' : 'debug',
  levels: winston.config.npm.levels, // error: 0, warn: 1, info: 2, http: 3, verbose: 4, debug: 5, silly: 6
  transports,
  // Không exit khi có unhandled error
  exitOnError: false
})

/**
 * Stream object cho morgan middleware
 * Redirect morgan output vào winston logger
 */
logger.stream = {
  write: (message) => {
    logger.http(message.trim())
  }
}

export { logger }
