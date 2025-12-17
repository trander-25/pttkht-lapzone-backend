/**
 * SERVER.JS - FILE KHỞI ĐỘNG CHÍNH CỦA ỨNG DỤNG LAPZONE E-COMMERCE
 */

/* eslint-disable no-console */
import express from 'express'
import { connectDB } from '~/config/sequelize'
import { env } from '~/config/environment'
import { APIs_V1 } from '~/routes/v1/index'
import { errorHandlingMiddleware } from '~/middlewares/errorHandlingMiddleware'
import cors from 'cors'
import { corsOptions } from './config/cors'
import cookieParser from 'cookie-parser'

/**
 * Hàm khởi động Express server và cấu hình các middleware
 */
const START_SERVER = () => {
  const app = express()

  // Tắt cache
  app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store')
    next()
  })

  // Parse cookies
  app.use(cookieParser())

  // CORS
  app.use(cors(corsOptions))

  // Parse JSON
  app.use(express.json())

  // API Routes
  app.use('/api/v1', APIs_V1)

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' })
  })

  // Error handling
  app.use(errorHandlingMiddleware)

  // Start server
  const PORT = env.LOCAL_DEV_APP_PORT || 8020
  const HOST = env.LOCAL_DEV_APP_HOST || 'localhost'

  app.listen(PORT, HOST, () => {
    console.log(`🚀 Server running at http://${HOST}:${PORT}`)
    console.log(`✅ API ready at http://${HOST}:${PORT}/api/v1`)
  })
}

// Khởi động server
(async () => {
  try {
    console.log('Connecting to MySQL Database...')
    await connectDB()
    console.log('✅ MySQL connected!')

    console.log('Loading models...')
    await import('./models/index.js')
    console.log('✅ Models loaded!')

    START_SERVER()
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
})()
