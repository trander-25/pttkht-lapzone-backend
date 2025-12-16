/**
 * MONGODB.JS - QUẢN LÝ KẾT NỐI MONGODB ATLAS
 *
 * File này quản lý connection pool tới MongoDB Cloud Atlas
 * Sử dụng Singleton pattern - chỉ tạo 1 connection duy nhất và tái sử dụng
 *
 * Exports 3 functions:
 * - CONNECT_DB(): Kết nối tới MongoDB (gọi 1 lần khi start server)
 * - GET_DB(): Lấy database instance đã kết nối (dùng trong models/services)
 * - CLOSE_DB(): Đóng kết nối gracefully (gọi khi shutdown server)
 */

/* eslint-disable no-console */
import { MongoClient, ServerApiVersion } from 'mongodb'
import { env } from '~/config/environment'

// Biến lưu trữ database instance sau khi kết nối thành công
// null ban đầu, sẽ được gán giá trị trong CONNECT_DB()
let LapZoneDatabaseInstance = null

// Khởi tạo MongoClient với cấu hình
// ServerApiVersion.v1: sử dụng Stable API version 1 của MongoDB
const mongoClientInstance = new MongoClient(env.MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: false,          // Không bật strict mode để dễ dàng test
    deprecationErrors: true // Throw error nếu dùng deprecated features
  }
})

/**
 * Kết nối tới MongoDB Atlas và cache database instance
 * Chỉ gọi 1 lần khi start server trong server.js
 * @returns {Promise<void>}
 */
export const CONNECT_DB = async () => {
  // Gọi connect() để kết nối tới MongoDB cluster
  await mongoClientInstance.connect()

  // Kết nối thành công -> lưu database instance vào biến global
  // env.DATABASE_NAME: tên database trong .env (VD: "lapzone_ecommerce")
  LapZoneDatabaseInstance = mongoClientInstance.db(env.DATABASE_NAME)
}

/**
 * Lấy database instance đã kết nối
 * Sử dụng trong các models để truy vấn collections
 * VD: GET_DB().collection('users').findOne(...)
 * @returns {Db} MongoDB database instance
 * @throws {Error} Nếu chưa gọi CONNECT_DB() trước
 */
export const GET_DB = () => {
  if (!LapZoneDatabaseInstance) throw new Error('Must connect to Database first!')
  return LapZoneDatabaseInstance
}

/**
 * Đóng kết nối MongoDB một cách graceful
 * Gọi khi shutdown server để cleanup resources
 * @returns {Promise<void>}
 */
export const CLOSE_DB = async () => {
  console.log('4. Disconnecting from MongoDB Cloud Atlas...')
  await mongoClientInstance.close()
  console.log('5. Disconnected from MongoDB Cloud Atlas')
}