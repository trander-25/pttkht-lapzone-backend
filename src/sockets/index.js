import { initChatSocket } from './chatSocket'

/**
 * Cấu hình Socket.IO cho ứng dụng
 * @param {Object} server - HTTP server instance từ Express
 * @returns {Object} - Object chứa các Socket.IO instances
 * 
 * Hiện tại chỉ có chatIO, có thể mở rộng thêm:
 * - notificationIO: Thông báo realtime (orders, promotions...)
 * - trackingIO: Theo dõi đơn hàng realtime
 * - adminIO: Dashboard realtime cho admin
 */
export const configureSocketIO = (server) => {
  // Khởi tạo chat socket cho real-time messaging
  const chatIO = initChatSocket(server)

  return {
    chatIO
  }
}
