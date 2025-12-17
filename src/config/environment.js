/**
 * ENVIRONMENT.JS - QUẢN LÝ BIẾN MÔI TRƯỜNG
 */

import 'dotenv/config'

export const env = {
  // Database
  MYSQL_HOST: process.env.MYSQL_HOST || 'localhost',
  MYSQL_PORT: process.env.MYSQL_PORT || 3306,
  MYSQL_DATABASE: process.env.MYSQL_DATABASE || 'lapzone',
  MYSQL_USER: process.env.MYSQL_USER || 'root',
  MYSQL_PASSWORD: process.env.MYSQL_PASSWORD || '',

  // Server
  LOCAL_DEV_APP_HOST: process.env.LOCAL_DEV_APP_HOST || 'localhost',
  LOCAL_DEV_APP_PORT: process.env.LOCAL_DEV_APP_PORT || 8020,

  // Domain
  WEBSITE_DOMAIN_DEVELOPMENT: process.env.WEBSITE_DOMAIN_DEVELOPMENT || 'http://localhost:8020',

  // JWT
  ACCESS_TOKEN_SECRET_SIGNATURE: process.env.ACCESS_TOKEN_SECRET_SIGNATURE,
  ACCESS_TOKEN_LIFE: process.env.ACCESS_TOKEN_LIFE || '7d',
  REFRESH_TOKEN_SECRET_SIGNATURE: process.env.REFRESH_TOKEN_SECRET_SIGNATURE,
  REFRESH_TOKEN_LIFE: process.env.REFRESH_TOKEN_LIFE || '14d',

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,

  // MoMo Payment
  MOMO_ACCESS_KEY: process.env.MOMO_ACCESS_KEY,
  MOMO_SECRET_KEY: process.env.MOMO_SECRET_KEY,
  MOMO_PARTNER_CODE: process.env.MOMO_PARTNER_CODE,
  MOMO_PARTNER_NAME: process.env.MOMO_PARTNER_NAME,
  MOMO_STORE_ID: process.env.MOMO_STORE_ID,
  MOMO_API_HOST: process.env.MOMO_API_HOST
}
