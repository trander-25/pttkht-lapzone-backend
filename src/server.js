/**
 * SERVER.JS - FILE KHỞI ĐỘNG CHÍNH CỦA ỨNG DỤNG LAPZONE E-COMMERCE
 *
 * Nhiệm vụ chính:
 * - Khởi tạo Express application với các middleware cần thiết (CORS, cookie-parser, JSON parser)
 * - Tích hợp Socket.IO cho tính năng chat real-time với AI chatbot
 * - Cấu hình Swagger UI để documentation API tại /api-docs
 * - Kết nối database MongoDB Atlas
 * - Khởi động HTTP server
 * - Thiết lập các cron jobs tự động (hủy đơn hàng MoMo chưa thanh toán sau 1h40)
 * - Xử lý graceful shutdown khi tắt server (đóng DB connection, cleanup resources)
 */

/* eslint-disable no-console */
import express from 'express'
import AsyncExitHook from 'async-exit-hook'
import { CLOSE_DB, CONNECT_DB } from '~/config/mongodb'
import { env } from '~/config/environment'
import { APIs_V1 } from '~/routes/v1/index'
import { errorHandlingMiddleware } from '~/middlewares/errorHandlingMiddleware'
import { requestLogger, errorLogger, notFoundLogger } from '~/middlewares/loggingMiddleware'
import { logger } from '~/config/logger'
import cors from 'cors'
import { corsOptions } from './config/cors'
import cookieParser from 'cookie-parser'
import http from 'http'
import swaggerUi from 'swagger-ui-express'
import { swaggerSpec } from '~/config/swagger'
import { configureSocketIO } from '~/sockets/index'
import { setupCronJobs } from '~/jobs/setupCronJobs'

/**
 * Hàm khởi động Express server và cấu hình các middleware
 * @returns {void}
 */
const START_SERVER = () => {
  const app = express()

  // Tắt cache của Express.js để tránh phục vụ nội dung cũ
  // Cache-Control: no-store buộc browser không lưu cache response
  app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store')
    next()
  })

  // Cấu hình middleware parse cookies từ request
  // Cho phép đọc access_token và refresh_token từ HTTP-only cookies
  app.use(cookieParser())

  // Cấu hình CORS middleware với whitelist origins
  // Cho phép frontend gọi API từ các domain được phép
  app.use(cors(corsOptions))

  // Bật parsing JSON request body với giới hạn kích thước mặc định
  app.use(express.json())

  // ============================================
  // REQUEST/RESPONSE LOGGING MIDDLEWARE
  // ============================================
  // Sử dụng winston logger để ghi logs chuyên nghiệp
  // - Production: Ghi vào file logs/http-YYYY-MM-DD.log
  // - Development: Ghi ra console với màu sắc
  app.use(requestLogger)

  // ============================================
  // SWAGGER API DOCUMENTATION
  // ============================================
  // Phục vụ Swagger UI tại endpoint /api-docs với giao diện tùy chỉnh
  // - explorer: bật tính năng search/filter API endpoints
  // - customCss: ẩn topbar mặc định của Swagger
  // - persistAuthorization: lưu thông tin authentication khi refresh page
  // - displayRequestDuration: hiển thị thời gian response của mỗi API call
  // - syntaxHighlight: bật highlight code với theme monokai
  
  // QUAN TRỌNG: Phải dùng swaggerUi.serve TRƯỚC để serve static files (CSS/JS)
  // Nếu không có dòng này, Swagger UI sẽ không load được CSS/JS
  app.use('/api-docs', swaggerUi.serve)
  
  // Setup Swagger UI với config
  app.get('/api-docs', swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'LapZone API Docs',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      // QUAN TRỌNG: Enable credentials để Swagger UI gửi/nhận cookies
      // Cho phép HTTP-only cookies (accessToken, refreshToken) được lưu và gửi tự động
      withCredentials: true,
      syntaxHighlight: {
        activate: true,
        theme: 'monokai'
      }
    }
  }))

  // Phục vụ raw Swagger JSON spec tại /api-docs.json
  // Client tools (Postman, Insomnia) có thể import file này để test API
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json')
    res.send(swaggerSpec)
  })

  // Mount tất cả API routes version 1 vào path /api/v1
  // Tất cả endpoints sẽ có prefix: /api/v1/auth, /api/v1/products, /api/v1/cart, etc.
  app.use('/api/v1', APIs_V1)

  // Middleware bắt 404 - Routes không tồn tại
  // Phải đặt SAU tất cả routes để catch mọi request không match
  app.use(notFoundLogger)

  // Middleware log errors trước khi xử lý
  app.use(errorLogger)

  // Áp dụng middleware xử lý lỗi tập trung
  // Middleware này sẽ catch mọi lỗi từ controllers/services và trả về response thống nhất
  app.use(errorHandlingMiddleware)

  // Tạo HTTP server bọc Express app để tích hợp Socket.IO
  // Không dùng app.listen() vì cần server instance cho Socket.IO
  const server = http.createServer(app)

  // Khởi tạo Socket.IO với chức năng chat real-time
  // Xử lý các events: connection, disconnect, sendMessage, typing, etc.
  configureSocketIO(server)

  // ============================================
  // PRODUCTION ENVIRONMENT (Render.com / AWS)
  // ============================================
  if (env.BUILD_MODE === 'production') {
    // Sử dụng PORT từ environment variable (Render tự động inject)
    // Fallback về port 80 nếu không có PORT variable
    const PORT = process.env.PORT || 80
    // Bind tất cả network interfaces (0.0.0.0) để accept external connections
    server.listen(PORT, '0.0.0.0', () => {
      logger.info(`🚀 Production server running on port ${PORT}`)
      logger.info('📚 API Documentation available at: /api-docs')
      logger.info('📝 Logs directory: logs/')
      logger.info('🔍 Error logs: logs/error-YYYY-MM-DD.log')
      logger.info('📊 HTTP logs: logs/http-YYYY-MM-DD.log')
    })
  } else {
    // ============================================
    // LOCAL DEVELOPMENT ENVIRONMENT
    // ============================================
    // Sử dụng PORT và HOST từ .env file (thường là localhost:8020)
    const PORT = process.env.PORT || env.LOCAL_DEV_APP_PORT
    const HOST = env.LOCAL_DEV_APP_HOST
    server.listen(PORT, HOST, () => {
      logger.info(`🚀 Local dev server running at ${HOST}:${PORT}`)
      logger.info(`📚 API Documentation: http://${HOST}:${PORT}/api-docs`)
      logger.info(`📄 Swagger JSON: http://${HOST}:${PORT}/api-docs.json`)
    })
  }

  // ============================================
  // GRACEFUL SHUTDOWN HANDLER
  // ============================================
  // Xử lý đóng kết nối database một cách an toàn khi tắt server
  // Đảm bảo không mất dữ liệu và cleanup resources properly
  // AsyncExitHook(async () => {
  //   logger.info('Shutting down server gracefully...')
  //   await CLOSE_DB()
  //   logger.info('Database connection closed.')
  // })
}

// ============================================
// KHỞI TẠO SERVER SAU KHI KẾT NỐI DATABASE
// ============================================
// Sử dụng IIFE (Immediately Invoked Function Expression) async
// để có thể dùng await cho CONNECT_DB()
// Flow khởi động:
// 1. Kết nối MongoDB Atlas
// 2. Nếu thành công → gọi START_SERVER() để khởi động Express
// 3. Thiết lập cron jobs tự động
// 4. Nếu thất bại → log error và tắt process
(async () => {
  try {
    logger.info('1. Connecting to MongoDB Cloud Atlas...')
    await CONNECT_DB()
    logger.info('2. Connected to MongoDB Cloud Atlas!')

    logger.info('3. Starting Express server...')
    START_SERVER()

    logger.info('4. Setting up cron jobs...')
    setupCronJobs()
  } catch (error) {
    logger.error('Failed to start server:', error)
    process.exit(1)
  }
})()
