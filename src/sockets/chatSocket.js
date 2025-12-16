import { Server } from 'socket.io'
import { authMiddleware } from '~/middlewares/authMiddleware'
import { chatService } from '~/services/chatService'
import { conversationModel } from '~/models/conversationModel'

/**
 * Khởi tạo Socket.IO cho real-time chat
 * @param {Object} server - HTTP server instance từ Express
 * @returns {Server} - Socket.IO server instance
 * 
 * Chức năng chính:
 * - Real-time messaging giữa user và AI
 * - Thông báo tin nhắn mới
 * - Typing indicators (hiệu ứng đang gõ)
 * - Đánh dấu tin nhắn đã đọc
 * 
 * Cấu trúc rooms:
 * - user:{userId} - Room riêng của mỗi user
 * - conversation:{conversationId} - Room cho mỗi conversation
 * 
 * Bảo mật:
 * - Xác thực JWT bằng middleware trước khi connect
 * - Kiểm tra quyền truy cập conversation
 * - CORS chỉ cho phép domain từ env
 */
export const initChatSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.BUILD_MODE === 'production'
        ? process.env.WEBSITE_DOMAIN_PRODUCTION
        : process.env.WEBSITE_DOMAIN_DEVELOPMENT,
      credentials: true
    }
  })

  // Middleware xác thực socket connection trước khi cho phép kết nối
  // Chạy trước khi event 'connection' được trigger
  io.use(async (socket, next) => {
    try {
      // Lấy JWT token từ auth header hoặc handshake
      // Frontend gửi token qua: socket.io({ auth: { token: '...' } })
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1]

      if (!token) {
        return next(new Error('Authentication error'))
      }

      // Verify token tương tự authMiddleware
      // Nếu token hợp lệ, lưu userId và role vào socket để sử dụng trong events
      const decoded = await authMiddleware.verifyToken(token)
      socket.userId = decoded._id
      socket.userRole = decoded.role
      next()
    } catch (error) {
      next(new Error('Authentication error'))
    }
  })

  io.on('connection', (socket) => {
    const userId = socket.userId

    // Tự động join user vào room riêng của họ (dùng cho notifications)
    socket.join(`user:${userId}`)

    /**
     * Event: User join vào conversation room
     * Frontend emit: socket.emit('join_conversation', { conversationId })
     * 
     * Quy trình:
     * 1. Kiểm tra conversation có tồn tại không
     * 2. Kiểm tra quyền truy cập:
     *    - Chủ sở hữu conversation (userId)
     * 3. Join vào room conversation:{conversationId}
     * 4. Gửi xác nhận về client
     */
    socket.on('join_conversation', async (data) => {
      try {
        const { conversationId } = data

        // Validate quyền truy cập conversation
        const conversation = await conversationModel.findOneById(conversationId)
        if (!conversation) {
          socket.emit('error', { message: 'Cuộc hội thoại không tồn tại' })
          return
        }

        // Kiểm tra quyền
        const isAuthorized = conversation.userId.toString() === userId

        if (!isAuthorized) {
          socket.emit('error', { message: 'Bạn không có quyền truy cập cuộc hội thoại này' })
          return
        }

        // Join room
        socket.join(`conversation:${conversationId}`)
        socket.emit('joined_conversation', { conversationId })
      } catch (error) {
        socket.emit('error', { message: error.message })
      }
    })

    /**
     * Event: User gửi tin nhắn trong conversation
     * Frontend emit: socket.emit('send_message', { conversationId, content, attachments })
     * 
     * Quy trình:
     * 1. Lưu tin nhắn vào database qua chatService.sendMessage
     * 2. Broadcast tin nhắn mới tới tất cả users trong conversation room
     *    (bao gồm cả người gửi và người nhận)
     */
    socket.on('send_message', async (data) => {
      try {
        const { conversationId, content, attachments = [] } = data

        // Gửi tin nhắn qua service
        const message = await chatService.sendMessage(userId, conversationId, content, attachments)

        // Broadcast tin nhắn tới tất cả users trong conversation
        io.to(`conversation:${conversationId}`).emit('new_message', message)
      } catch (error) {
        socket.emit('error', { message: error.message })
      }
    })

    /**
     * Event: User gửi tin nhắn tới AI chatbot
     * Frontend emit: socket.emit('send_message_to_ai', { content, attachments })
     * 
     * Quy trình:
     * 1. Hiển thị typing indicator cho user (AI đang gõ...)
     * 2. Gọi tin nhắn tới chatService.sendMessageToAI:
     *    - Lưu tin nhắn user vào DB
     *    - Lấy 10 tin nhắn gần nhất làm context
     *    - Gọi Gemini AI để sinh response
     *    - Lưu response của AI vào DB
     * 3. Emit kết quả về client (conversation, userMessage, aiMessage)
     * 4. Tắt typing indicator
     */
    socket.on('send_message_to_ai', async (data) => {
      try {
        const { content, attachments = [] } = data

        // Emit typing indicator
        socket.emit('ai_typing', { isTyping: true })

        // Gửi tin nhắn và nhận phản hồi từ AI
        const result = await chatService.sendMessageToAI(userId, content, attachments)

        // Emit kết quả
        socket.emit('ai_response', {
          conversation: result.conversation,
          userMessage: result.userMessage,
          aiMessage: result.aiMessage
        })

        socket.emit('ai_typing', { isTyping: false })
      } catch (error) {
        socket.emit('ai_typing', { isTyping: false })
        socket.emit('error', { message: error.message })
      }
    })

    /**
     * Event: Hiệu ứng đang gõ (typing indicator)
     * Frontend emit: socket.emit('typing', { conversationId, isTyping: true/false })
     * Broadcast cho các users khác trong conversation biết user đang gõ
     */
    socket.on('typing', (data) => {
      const { conversationId, isTyping } = data
      socket.to(`conversation:${conversationId}`).emit('user_typing', {
        userId,
        isTyping
      })
    })

    /**
     * Event: Đánh dấu tin nhắn đã đọc
     * Khi user mở conversation, đánh dấu tất cả tin nhắn chưa đọc thành đã đọc
     */
    socket.on('mark_as_read', async (data) => {
      try {
        const { conversationId } = data
        await chatService.markMessagesAsRead(userId, conversationId)

        // Thông báo cho users khác (ví dụ: hiện thị double tick xanh)
        socket.to(`conversation:${conversationId}`).emit('messages_read', {
          conversationId,
          userId
        })
      } catch (error) {
        socket.emit('error', { message: error.message })
      }
    })

    /**
     * Event: Ngắt kết nối
     * Clean up resources nếu cần
     */
    socket.on('disconnect', () => {
      // Clean up: Có thể update online status, lưu last seen...
    })
  })

  return io
}