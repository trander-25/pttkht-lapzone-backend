/**
 * CONVERSATIONMODEL.JS - MODEL QUẢN LÝ HỘI THOẠI CHAT
 *
 * Collection: conversations
 * Quản lý các cuộc hội thoại giữa user và AI chatbot
 *
 * Schema:
 * - type: string - Loại conversation ('user_ai' - fixed, chỉ hỗ trợ chat với AI)
 * - userId: ObjectId - User tham gia chat (required)
 * - title: string - Tiêu đề cuộc hội thoại (default: 'AI Assistant')
 * - lastMessageAt: number (timestamp) - Timestamp tin nhắn cuối (dùng để sort, default: Date.now)
 * - isActive: boolean - Cuộc hội thoại còn hoạt động hay không (default: true)
 * - createdAt: number (timestamp) - Thời gian tạo conversation
 * - updatedAt: number (timestamp) - Thời gian cập nhật cuối (default: null)
 * - _destroy: boolean - Soft delete flag (default: false)
 *
 * Business Logic:
 * - Mỗi user chỉ có 1 conversation với AI (tự động tạo nếu chưa có)
 * - lastMessageAt tự động update khi có tin nhắn mới
 * - Sort conversations theo lastMessageAt giảm dần (mới nhất trước)
 *
 * Real-time: Sử dụng Socket.IO để push tin nhắn real-time
 */

import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'

// Định nghĩa các loại conversation
const CONVERSATION_TYPES = {
  USER_AI: 'user_ai' // Chat giữa user và AI chatbot (Gemini)
}

const CONVERSATION_COLLECTION_NAME = 'conversations'
const CONVERSATION_COLLECTION_SCHEMA = Joi.object({
  type: Joi.string().valid(...Object.values(CONVERSATION_TYPES)).required(),
  userId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  title: Joi.string().default('AI Assistant'), // Tiêu đề mặc định cho AI chat
  lastMessageAt: Joi.date().timestamp('javascript').default(Date.now),
  isActive: Joi.boolean().default(true),
  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null),
  _destroy: Joi.boolean().default(false)
})

const INVALID_UPDATE_FIELDS = ['_id', 'userId', 'createdAt']

/**
 * Validate dữ liệu trước khi tạo conversation
 * @param {Object} data - Conversation data
 * @returns {Promise<Object>} Valid data
 */
const validateBeforeCreate = async (data) => {
  return await CONVERSATION_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
}

/**
 * Tạo conversation mới với AI
 * @param {Object} data - { userId, title }
 * @returns {Promise<Object>} Insert result
 */
const createNew = async (data) => {
  try {
    const dataWithType = {
      ...data,
      type: CONVERSATION_TYPES.USER_AI
    }

    const validData = await validateBeforeCreate(dataWithType)
    const newConversationToAdd = {
      ...validData,
      userId: new ObjectId(validData.userId)
    }
    const createdConversation = await GET_DB().collection(CONVERSATION_COLLECTION_NAME).insertOne(newConversationToAdd)
    return createdConversation
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * Tìm conversation theo ID
 * @param {string} conversationId - Conversation ID
 * @returns {Promise<Object|null>} Conversation document
 */
const findOneById = async (conversationId) => {
  try {
    const result = await GET_DB().collection(CONVERSATION_COLLECTION_NAME).findOne({
      _id: new ObjectId(conversationId),
      _destroy: false
    })
    return result
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * Lấy danh sách conversations của user (tất cả đều là AI chat)
 * Sắp xếp theo lastMessageAt giảm dần (mới nhất trước)
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array conversations
 */
const getConversations = async (userId) => {
  try {
    const query = {
      userId: new ObjectId(userId),
      type: CONVERSATION_TYPES.USER_AI,
      _destroy: false
    }
    const result = await GET_DB().collection(CONVERSATION_COLLECTION_NAME)
      .find(query)
      .sort({ lastMessageAt: -1 })
      .toArray()
    return result
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * Tìm hoặc tạo conversation với AI
 * Tự động tạo nếu user chưa có conversation với AI
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Conversation document
 */
const findOrCreateConversation = async (userId) => {
  try {
    const query = {
      userId: new ObjectId(userId),
      type: CONVERSATION_TYPES.USER_AI,
      _destroy: false
    }

    let conversation = await GET_DB().collection(CONVERSATION_COLLECTION_NAME).findOne(query)

    if (!conversation) {
      const newConversation = {
        userId,
        title: 'AI Assistant'
      }
      const created = await createNew(newConversation)
      conversation = await findOneById(created.insertedId)
    }

    return conversation
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * Cập nhật thông tin conversation
 * @param {string} conversationId - Conversation ID
 * @param {Object} updateData - Dữ liệu cần cập nhật
 * @returns {Promise<Object>} Updated conversation
 */
const update = async (conversationId, updateData) => {
  try {
    // Loại bỏ các field không được phép cập nhật
    Object.keys(updateData).forEach(fieldName => {
      if (INVALID_UPDATE_FIELDS.includes(fieldName)) {
        delete updateData[fieldName]
      }
    })

    const result = await GET_DB().collection(CONVERSATION_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(conversationId) },
      { $set: { ...updateData, updatedAt: Date.now() } },
      { returnDocument: 'after' }
    )
    return result
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * Xóa conversation theo ID
 * @param {string} conversationId - Conversation ID
 * @returns {Promise<Object>} Delete result
 */
const deleteOneById = async (conversationId) => {
  try {
    const result = await GET_DB().collection(CONVERSATION_COLLECTION_NAME).deleteOne({
      _id: new ObjectId(conversationId)
    })
    return result
  } catch (error) {
    throw new Error(error)
  }
}

export const conversationModel = {
  CONVERSATION_COLLECTION_NAME,
  CONVERSATION_COLLECTION_SCHEMA,
  CONVERSATION_TYPES,
  createNew,
  findOneById,
  getConversations,
  findOrCreateConversation,
  update,
  deleteOneById
}