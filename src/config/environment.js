/**
 * ENVIRONMENT.JS - QUẢN LÝ TẤT CẢ BIẾN MÔI TRƯỜNG
 *
 * File này export tất cả environment variables từ .env file
 * Tất cả services/configs khác import từ đây thay vì truy cập process.env trực tiếp
 * Lợi ích: Centralized config, dễ maintain và validate
 */

import 'dotenv/config'

export const env = {
  // ============================================
  // DATABASE CONFIGURATION
  // ============================================
  // MongoDB Atlas connection string (format: mongodb+srv://username:password@cluster.mongodb.net/)
  MONGODB_URI: process.env.MONGODB_URI,
  // Tên database trong MongoDB cluster (VD: lapzone_ecommerce)
  DATABASE_NAME: process.env.DATABASE_NAME,

  // ============================================
  // LOCAL DEVELOPMENT SERVER
  // ============================================
  // Host cho môi trường dev (thường là 'localhost')
  LOCAL_DEV_APP_HOST: process.env.LOCAL_DEV_APP_HOST,
  // Port cho môi trường dev (VD: 8017)
  LOCAL_DEV_APP_PORT: process.env.LOCAL_DEV_APP_PORT,

  // ============================================
  // OAUTH2 GOOGLE LOGIN
  // ============================================
  // Client ID từ Google Cloud Console (OAuth 2.0 credentials)
  GG_CLIENT_ID: process.env.GG_CLIENT_ID,
  // Client Secret từ Google Cloud Console
  GG_CLIENT_SECRET: process.env.GG_CLIENT_SECRET,

  // ============================================
  // BUILD MODE
  // ============================================
  // Môi trường hiện tại: 'development' hoặc 'production'
  BUILD_MODE: process.env.BUILD_MODE,

  // ============================================
  // WEBSITE DOMAINS
  // ============================================
  // Domain frontend trong môi trường development (VD: http://localhost:3000)
  WEBSITE_DOMAIN_DEVELOPMENT: process.env.WEBSITE_DOMAIN_DEVELOPMENT,
  // Domain frontend khi deploy production (VD: https://lapzone.com)
  WEBSITE_DOMAIN_PRODUCTION: process.env.WEBSITE_DOMAIN_PRODUCTION,
  // URL backend cho callbacks từ payment gateway (MoMo IPN notification)
  BACKEND_URL: process.env.BACKEND_URL,

  // ============================================
  // JWT AUTHENTICATION
  // ============================================
  // Secret key để sign access token (thường là chuỗi random phức tạp)
  ACCESS_TOKEN_SECRET_SIGNATURE: process.env.ACCESS_TOKEN_SECRET_SIGNATURE,
  // Thời gian sống của access token (VD: '1h', '15m') - ngắn để security
  ACCESS_TOKEN_LIFE: process.env.ACCESS_TOKEN_LIFE,

  // Secret key để sign refresh token (khác với access token để tăng security)
  REFRESH_TOKEN_SECRET_SIGNATURE: process.env.REFRESH_TOKEN_SECRET_SIGNATURE,
  // Thời gian sống của refresh token (VD: '14d', '30d') - dài hơn access token
  REFRESH_TOKEN_LIFE: process.env.REFRESH_TOKEN_LIFE,

  // ============================================
  // CLOUDINARY IMAGE STORAGE
  // ============================================
  // Cloud name từ Cloudinary dashboard
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  // API Key từ Cloudinary dashboard
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  // API Secret từ Cloudinary dashboard (dùng để sign upload requests)
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,

  // ============================================
  // RESEND EMAIL SERVICE
  // ============================================
  // API key từ Resend.com (dùng để gửi email verify, reset password)
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  // Email address đã verify trên Resend (VD: noreply@lapzone.com)
  RESEND_SENDER_EMAIL: process.env.RESEND_SENDER_EMAIL,
  // Tên hiển thị khi gửi email (VD: "LapZone Support")
  RESEND_SENDER_NAME: process.env.RESEND_SENDER_NAME,

  // ============================================
  // GEMINI AI CHATBOT
  // ============================================
  // API key từ Google AI Studio để sử dụng Gemini AI cho chatbot
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  // Tên file search store chứa tài liệu sản phẩm LapZone (RAG)
  GEMINI_FILE_SEARCH_STORE_NAME: process.env.GEMINI_FILE_SEARCH_STORE_NAME,

  // ============================================
  // MOMO PAYMENT GATEWAY
  // ============================================
  // Access Key từ MoMo Business Portal
  MOMO_ACCESS_KEY: process.env.MOMO_ACCESS_KEY,
  // Secret Key để sign HMAC-SHA256 signature (bảo mật giao dịch)
  MOMO_SECRET_KEY: process.env.MOMO_SECRET_KEY,
  // Partner Code được MoMo cấp khi đăng ký merchant
  MOMO_PARTNER_CODE: process.env.MOMO_PARTNER_CODE,
  // Tên merchant hiển thị trên MoMo app
  MOMO_PARTNER_NAME: process.env.MOMO_PARTNER_NAME,
  // Store ID (merchant có thể có nhiều store)
  MOMO_STORE_ID: process.env.MOMO_STORE_ID,
  // API Host của MoMo (test: test-payment.momo.vn, production: payment.momo.vn)
  MOMO_API_HOST: process.env.MOMO_API_HOST
}