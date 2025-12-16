import { StatusCodes } from 'http-status-codes'
import { ObjectId } from 'mongodb'
import { conversationModel } from '~/models/conversationModel'
import { messageModel } from '~/models/messageModel'
import { userModel } from '~/models/userModel'
import { GeminiProvider } from '~/providers/GeminiProvider'
import ApiError from '~/utils/ApiError'
import { GET_DB } from '~/config/mongodb'

/**
 * Tạo mới hoặc lấy cuộc hội thoại hiện có với AI
 * Tự động tạo nếu user chưa có conversation với AI
 * @param {string} userId - ID người dùng
 * @returns {object} Thông tin cuộc hội thoại
 */
const getOrCreateConversation = async (userId) => {
  try {
    // Xác thực người dùng tồn tại
    const user = await userModel.findOneById(userId)
    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Người dùng không tồn tại')
    }

    // Tìm hoặc tạo cuộc hội thoại với AI
    const conversation = await conversationModel.findOrCreateConversation(userId)
    return conversation
  } catch (error) {
    throw error
  }
}

/**
 * Lấy danh sách các cuộc hội thoại AI của người dùng
 * Bao gồm:
 * - Thông tin cuộc hội thoại
 * - Tin nhắn cuối cùng
 * - Số lượng tin nhắn chưa đọc
 * @param {string} userId - ID người dùng
 * @returns {array} Danh sách cuộc hội thoại với chi tiết
 */
const getUserConversations = async (userId) => {
  try {
    const conversations = await conversationModel.getConversations(userId)

    // Lấy thông tin tin nhắn cuối cùng cho mỗi conversation
    const conversationsWithDetails = await Promise.all(
      conversations.map(async (conv) => {
        const messages = await messageModel.getMessagesByConversation(conv._id.toString(), 1, 1)
        const unreadCount = await messageModel.countUnreadMessages(
          conv._id.toString(),
          conv.userId?.toString()
        )

        return {
          ...conv,
          lastMessage: messages[0] || null,
          unreadCount
        }
      })
    )

    return conversationsWithDetails
  } catch (error) {
    throw error
  }
}

/**
 * Gửi tin nhắn trong cuộc hội thoại
 * Quy trình:
 * 1. Xác thực cuộc hội thoại tồn tại
 * 2. Kiểm tra quyền (người dùng có thuộc cuộc hội thoại không)
 * 3. Tạo tin nhắn mới
 * 4. Cập nhật lastMessageAt của cuộc hội thoại
 * @param {string} userId - ID người gửi
 * @param {string} conversationId - ID cuộc hội thoại
 * @param {string} content - Nội dung tin nhắn
 * @param {array} attachments - Danh sách file đính kèm
 * @returns {object} Tin nhắn vừa được tạo
 */
const sendMessage = async (userId, conversationId, content, attachments = []) => {
  try {
    // Xác thực cuộc hội thoại tồn tại và người dùng có quyền
    const conversation = await conversationModel.findOneById(conversationId)
    if (!conversation) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Cuộc hội thoại không tồn tại')
    }

    if (conversation.userId.toString() !== userId) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền trong cuộc hội thoại này')
    }

    // Tạo tin nhắn mới
    const messageData = {
      conversationId,
      senderId: userId,
      senderType: messageModel.SENDER_TYPES.USER,
      content,
      attachments
    }

    const createdMessage = await messageModel.createNew(messageData)
    const message = await messageModel.findOneById(createdMessage.insertedId)

    // Cập nhật lastMessageAt của conversation
    await conversationModel.update(conversationId, {
      lastMessageAt: Date.now()
    })

    return message
  } catch (error) {
    throw error
  }
}

/**
 * Gửi tin nhắn và nhận phản hồi từ AI
 * Quy trình:
 * 1. Tạo/lấy cuộc hội thoại với AI
 * 2. Lưu tin nhắn của người dùng
 * 3. Lấy lịch sử hội thoại (10 tin nhắn gần nhất) để có context
 * 4. Gọi Gemini AI để tạo phản hồi
 * 5. Lưu phản hồi từ AI
 * @param {string} userId - ID người dùng
 * @param {string} content - Nội dung tin nhắn
 * @param {array} attachments - File đính kèm
 * @returns {object} { userMessage, aiMessage, conversation }
 */
const sendMessageToAI = async (userId, content, attachments = []) => {
  try {
    // Tạo hoặc lấy cuộc hội thoại với AI
    const conversation = await getOrCreateConversation(userId)

    // Lưu tin nhắn của người dùng vào database
    const userMessageData = {
      conversationId: conversation._id.toString(),
      senderId: userId,
      senderType: messageModel.SENDER_TYPES.USER,
      content,
      attachments
    }
    const createdUserMessage = await messageModel.createNew(userMessageData)
    const userMessage = await messageModel.findOneById(createdUserMessage.insertedId)

    // Lấy lịch sử hội thoại (10 tin nhắn gần nhất để có context)
    const conversationHistory = await messageModel.getMessagesByConversation(
      conversation._id.toString(),
      1,
      10
    )

    // Gọi Gemini AI để tạo phản hồi tự động
    const aiResponse = await GeminiProvider.generateProductAssistantResponse(
      content,
      conversationHistory
    )

    // Lưu phản hồi từ AI vào database
    const aiMessageData = {
      conversationId: conversation._id.toString(),
      senderId: null, // AI không có senderId
      senderType: messageModel.SENDER_TYPES.AI,
      content: aiResponse,
      attachments: []
    }
    const createdAIMessage = await messageModel.createNew(aiMessageData)
    const aiMessage = await messageModel.findOneById(createdAIMessage.insertedId)

    // Cập nhật lastMessageAt
    await conversationModel.update(conversation._id.toString(), {
      lastMessageAt: Date.now()
    })

    return {
      conversation,
      userMessage,
      aiMessage
    }
  } catch (error) {
    throw error
  }
}

/**
 * Lấy tin nhắn trong conversation
 */
const getMessages = async (userId, conversationId, page = 1, limit = 50) => {
  try {
    // Validate conversation và quyền truy cập
    const conversation = await conversationModel.findOneById(conversationId)
    if (!conversation) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Cuộc hội thoại không tồn tại')
    }

    if (conversation.userId.toString() !== userId) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền truy cập cuộc hội thoại này')
    }

    // Lấy tin nhắn
    const messages = await messageModel.getMessagesByConversation(conversationId, page, limit)
    const totalMessages = await messageModel.countMessagesByConversation(conversationId)

    return {
      messages,
      pagination: {
        page,
        limit,
        total: totalMessages,
        totalPages: Math.ceil(totalMessages / limit)
      }
    }
  } catch (error) {
    throw error
  }
}

/**
 * Đánh dấu tin nhắn đã đọc
 */
const markMessagesAsRead = async (userId, conversationId) => {
  try {
    // Validate conversation
    const conversation = await conversationModel.findOneById(conversationId)
    if (!conversation) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Cuộc hội thoại không tồn tại')
    }

    if (conversation.userId.toString() !== userId) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Bạn không có quyền trong cuộc hội thoại này')
    }

    // Đánh dấu đã đọc
    await messageModel.markAsRead(conversationId, userId)

    return { message: 'Đã đánh dấu tin nhắn là đã đọc' }
  } catch (error) {
    throw error
  }
}

export const chatService = {
  getOrCreateConversation,
  getUserConversations,
  sendMessage,
  sendMessageToAI,
  getMessages,
  markMessagesAsRead
}