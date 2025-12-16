/**
 * MESSAGEMODEL.JS - MODEL QUẢN LÝ TIN NHẮN CHAT
 *
 * Collection: messages
 * Lưu tất cả tin nhắn trong conversations với AI chatbot
 *
 * Sender Types:
 * - user: Tin nhắn từ user (customer)
 * - ai: Tin nhắn từ AI chatbot (Gemini)
 *
 * Schema:
 * - conversationId: Thuộc conversation nào
 * - senderId: ObjectId của người gửi (null nếu sender là AI)
 * - senderType: 'user' | 'ai'
 * - content: Nội dung tin nhắn (1-5000 ký tự)
 * - attachments: array đính kèm (images, files)
 * - isRead: Đã đọc hay chưa
 *
 * Real-time: Socket.IO emit events khi có tin nhắn mới
 */

import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'

// Định nghĩa các loại người gửi tin nhắn
const SENDER_TYPES = {
  USER: 'user', // User (customer)
  AI: 'ai'      // AI chatbot (Gemini)
}

const MESSAGE_COLLECTION_NAME = 'messages'
const MESSAGE_COLLECTION_SCHEMA = Joi.object({
  conversationId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  senderId: Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE).allow(null), // null nếu sender là AI
  senderType: Joi.string().valid(...Object.values(SENDER_TYPES)).required(),
  content: Joi.string().required().min(1).max(5000),
  attachments: Joi.array().items(Joi.object({
    url: Joi.string().required(),
    type: Joi.string().valid('image', 'file').required(),
    name: Joi.string().allow(''),
    size: Joi.number().allow(null)
  })).default([]),
  isRead: Joi.boolean().default(false),
  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null),
  _destroy: Joi.boolean().default(false)
})

const INVALID_UPDATE_FIELDS = ['_id', 'conversationId', 'senderId', 'senderType', 'createdAt']

/**
 * Validate dữ liệu trước khi tạo message
 * @param {Object} data - Message data
 * @returns {Promise<Object>} Valid data
 */
const validateBeforeCreate = async (data) => {
  return await MESSAGE_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
}

/**
 * Tạo tin nhắn mới
 * @param {Object} data - { conversationId, senderId, senderType, content, attachments }
 * @returns {Promise<Object>} Insert result
 */
const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data)
    const newMessageToAdd = {
      ...validData,
      conversationId: new ObjectId(validData.conversationId),
      senderId: validData.senderId ? new ObjectId(validData.senderId) : null
    }
    const createdMessage = await GET_DB().collection(MESSAGE_COLLECTION_NAME).insertOne(newMessageToAdd)
    return createdMessage
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * Tìm tin nhắn theo ID
 * @param {string} messageId - Message ID
 * @returns {Promise<Object|null>} Message document
 */
const findOneById = async (messageId) => {
  try {
    const result = await GET_DB().collection(MESSAGE_COLLECTION_NAME).findOne({
      _id: new ObjectId(messageId),
      _destroy: false
    })
    return result
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * Lấy danh sách tin nhắn theo conversation với pagination
 * Sắp xếp theo createdAt giảm dần, sau đó reverse để hiển thị mới nhất cuối
 * @param {string} conversationId - Conversation ID
 * @param {number} page - Trang hiện tại (default: 1)
 * @param {number} limit - Số tin nhắn/trang (default: 50)
 * @returns {Promise<Array>} Array messages (reversed - cũ nhất trước)
 */
const getMessagesByConversation = async (conversationId, page = 1, limit = 50) => {
  try {
    const skip = (page - 1) * limit
    const result = await GET_DB().collection(MESSAGE_COLLECTION_NAME)
      .find({
        conversationId: new ObjectId(conversationId),
        _destroy: false
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    return result.reverse() // Đảo ngược để hiển thị tin nhắn cũ nhất trước
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * Đếm tổng số tin nhắn trong conversation
 * @param {string} conversationId - Conversation ID
 * @returns {Promise<number>} Số lượng tin nhắn
 */
const countMessagesByConversation = async (conversationId) => {
  try {
    const count = await GET_DB().collection(MESSAGE_COLLECTION_NAME).countDocuments({
      conversationId: new ObjectId(conversationId),
      _destroy: false
    })
    return count
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * Đếm số tin nhắn chưa đọc trong conversation
 * Lọc bỏ tin nhắn của chính mình (excludeUserId)
 * @param {string} conversationId - Conversation ID
 * @param {string} excludeUserId - User ID cần loại trừ (không đếm tin nhắn của mình)
 * @returns {Promise<number>} Số tin nhắn chưa đọc
 */
const countUnreadMessages = async (conversationId, excludeUserId) => {
  try {
    const query = {
      conversationId: new ObjectId(conversationId),
      isRead: false,
      _destroy: false
    }
    
    // Nếu có excludeUserId, chỉ đếm tin nhắn không phải từ user đó
    if (excludeUserId) {
      query.senderId = { $ne: new ObjectId(excludeUserId) }
    }
    
    const count = await GET_DB().collection(MESSAGE_COLLECTION_NAME).countDocuments(query)
    return count
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * Cập nhật tin nhắn
 * @param {string} messageId - Message ID
 * @param {Object} updateData - Dữ liệu cần cập nhật
 * @returns {Promise<Object>} Updated message
 */
const update = async (messageId, updateData) => {
  try {
    // Loại bỏ các field không được phép cập nhật
    Object.keys(updateData).forEach(fieldName => {
      if (INVALID_UPDATE_FIELDS.includes(fieldName)) {
        delete updateData[fieldName]
      }
    })

    const result = await GET_DB().collection(MESSAGE_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(messageId) },
      { $set: { ...updateData, updatedAt: Date.now() } },
      { returnDocument: 'after' }
    )
    return result
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * Đánh dấu tất cả tin nhắn đã đọc
 * Đánh dấu tin nhắn của người khác (không đánh dấu tin nhắn của chính mình)
 * @param {string} conversationId - Conversation ID
 * @param {string} userId - User ID (exclude tin nhắn của user này)
 * @returns {Promise<Object>} Update result
 */
const markAsRead = async (conversationId, userId) => {
  try {
    // Đánh dấu tất cả tin nhắn trong conversation là đã đọc (trừ tin nhắn của chính user)
    const result = await GET_DB().collection(MESSAGE_COLLECTION_NAME).updateMany(
      {
        conversationId: new ObjectId(conversationId),
        senderId: { $ne: new ObjectId(userId) },
        isRead: false
      },
      { $set: { isRead: true, updatedAt: Date.now() } }
    )
    return result
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * Xóa tin nhắn theo ID
 * @param {string} messageId - Message ID
 * @returns {Promise<Object>} Delete result
 */
const deleteOneById = async (messageId) => {
  try {
    const result = await GET_DB().collection(MESSAGE_COLLECTION_NAME).deleteOne({
      _id: new ObjectId(messageId)
    })
    return result
  } catch (error) {
    throw new Error(error)
  }
}

export const messageModel = {
  MESSAGE_COLLECTION_NAME,
  MESSAGE_COLLECTION_SCHEMA,
  SENDER_TYPES,
  createNew,
  findOneById,
  getMessagesByConversation,
  countMessagesByConversation,
  countUnreadMessages,
  update,
  markAsRead,
  deleteOneById
}