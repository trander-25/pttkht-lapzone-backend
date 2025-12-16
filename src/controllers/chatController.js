import { StatusCodes } from 'http-status-codes'
import { chatService } from '~/services/chatService'

/**
 * Lấy danh sách cuộc hội thoại AI của người dùng
 * @returns {array} Danh sách các cuộc hội thoại
 */
const getConversations = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded._id

    const conversations = await chatService.getUserConversations(userId)

    res.status(StatusCodes.OK).json(conversations)
  } catch (error) {
    next(error)
  }
}

/**
 * Tạo mới hoặc lấy cuộc hội thoại hiện có với AI
 * Nếu cuộc hội thoại đã tồn tại thì trả về, nếu chưa thì tạo mới
 * @returns {object} Thông tin cuộc hội thoại
 */
const createConversation = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded._id

    const conversation = await chatService.getOrCreateConversation(userId)

    res.status(StatusCodes.OK).json(conversation)
  } catch (error) {
    next(error)
  }
}

/**
 * Lấy danh sách tin nhắn trong cuộc hội thoại
 * Tin nhắn được sắp xếp theo thời gian giảm dần (mới nhất trước)
 * @param {string} req.params.conversationId - ID của cuộc hội thoại
 * @param {object} req.query - Tham số phân trang (page, limit - mặc định 50)
 * @returns {object} Danh sách tin nhắn và thông tin phân trang
 */
const getMessages = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded._id
    const { conversationId } = req.params
    const { page = 1, limit = 50 } = req.query

    const result = await chatService.getMessages(
      userId,
      conversationId,
      parseInt(page),
      parseInt(limit)
    )

    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

/**
 * Gửi tin nhắn thông thường trong cuộc hội thoại AI
 * @param {string} req.params.conversationId - ID của cuộc hội thoại
 * @param {object} req.body - Chứa content (nội dung tin nhắn) và attachments (file đính kèm)
 * @returns {object} Tin nhắn vừa gửi
 */
const sendMessage = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded._id
    const { conversationId } = req.params
    const { content, attachments } = req.body

    const message = await chatService.sendMessage(userId, conversationId, content, attachments)

    res.status(StatusCodes.CREATED).json(message)
  } catch (error) {
    next(error)
  }
}

/**
 * Gửi tin nhắn tới AI và nhận phản hồi tự động
 * AI sẽ phản hồi dựa trên nội dung tin nhắn và context của cuộc hội thoại
 * @param {object} req.body - Chứa content (nội dung tin nhắn) và attachments
 * @returns {object} Tin nhắn của người dùng và phản hồi từ AI
 */
const sendMessageToAI = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded._id
    const { content, attachments } = req.body

    const result = await chatService.sendMessageToAI(userId, content, attachments)

    res.status(StatusCodes.CREATED).json(result)
  } catch (error) {
    next(error)
  }
}

/**
 * Đánh dấu tất cả tin nhắn trong cuộc hội thoại là đã đọc
 * Cập nhật trạng thái isRead cho các tin nhắn chưa đọc
 * @param {string} req.params.conversationId - ID của cuộc hội thoại
 * @returns {object} Kết quả cập nhật
 */
const markAsRead = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded._id
    const { conversationId } = req.params

    const result = await chatService.markMessagesAsRead(userId, conversationId)

    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

export const chatController = {
  getConversations,
  createConversation,
  getMessages,
  sendMessage,
  sendMessageToAI,
  markAsRead
}