import Joi from 'joi'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'
import { conversationModel } from '~/models/conversationModel'

/**
 * Validation middleware cho tạo cuộc hội thoại mới với AI
 * Không cần tham số - tự động tạo AI conversation
 */
const createConversation = async (req, res, next) => {
  // Không cần validation - AI conversation luôn được tạo
  next()
}

/**
 * Validation middleware cho gửi tin nhắn trong conversation
 * Validates:
 * - content: Nội dung tin nhắn (1-5000 ký tự)
 * - attachments: Mảng file đính kèm (image/file)
 */
const sendMessage = async (req, res, next) => {
  const correctCondition = Joi.object({
    content: Joi.string()
      .required()
      .min(1)
      .max(5000)
      .messages({
        'any.required': 'Nội dung tin nhắn là bắt buộc',
        'string.empty': 'Nội dung tin nhắn không được để trống',
        'string.min': 'Nội dung tin nhắn phải có ít nhất 1 ký tự',
        'string.max': 'Nội dung tin nhắn không được vượt quá 5000 ký tự'
      }),
    attachments: Joi.array()
      .items(
        Joi.object({
          url: Joi.string().required().messages({
            'any.required': 'URL của file đính kèm là bắt buộc'
          }),
          type: Joi.string().valid('image', 'file').required().messages({
            'any.required': 'Loại file đính kèm là bắt buộc',
            'any.only': 'Loại file đính kèm phải là image hoặc file'
          }),
          name: Joi.string().allow(''),
          size: Joi.number().allow(null)
        })
      )
      .default([])
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    const errorMessage = new Error(error).message
    const customError = new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, errorMessage)
    next(customError)
  }
}

/**
 * Validation middleware cho gửi tin nhắn tới AI chatbot
 * Tương tự sendMessage nhưng dành riêng cho AI conversation
 */
const sendMessageToAI = async (req, res, next) => {
  const correctCondition = Joi.object({
    content: Joi.string()
      .required()
      .min(1)
      .max(5000)
      .messages({
        'any.required': 'Nội dung tin nhắn là bắt buộc',
        'string.empty': 'Nội dung tin nhắn không được để trống',
        'string.min': 'Nội dung tin nhắn phải có ít nhất 1 ký tự',
        'string.max': 'Nội dung tin nhắn không được vượt quá 5000 ký tự'
      }),
    attachments: Joi.array()
      .items(
        Joi.object({
          url: Joi.string().required(),
          type: Joi.string().valid('image', 'file').required(),
          name: Joi.string().allow(''),
          size: Joi.number().allow(null)
        })
      )
      .default([])
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    const errorMessage = new Error(error).message
    const customError = new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, errorMessage)
    next(customError)
  }
}

export const chatValidation = {
  createConversation,
  sendMessage,
  sendMessageToAI
}