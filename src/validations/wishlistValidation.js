import Joi from 'joi'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import { OBJECT_ID_RULE, FIELD_REQUIRED_MESSAGE } from '~/utils/validators'

/**
 * Validation middleware cho thêm sản phẩm vào wishlist
 * Validates: productId (ObjectId)
 */
const addToWishlist = async (req, res, next) => {
  const correctCondition = Joi.object({
    productId: Joi.string().required().pattern(OBJECT_ID_RULE).messages({
      'any.required': FIELD_REQUIRED_MESSAGE,
      'string.pattern.base': 'Product ID must be a valid ObjectId'
    })
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, new Error(error).message))
  }
}

/**
 * Validation middleware cho xóa sản phẩm khỏi wishlist
 * Validates: productId từ URL params
 */
const removeFromWishlist = async (req, res, next) => {
  const correctCondition = Joi.object({
    productId: Joi.string().required().pattern(OBJECT_ID_RULE).messages({
      'any.required': FIELD_REQUIRED_MESSAGE,
      'string.pattern.base': 'Product ID must be a valid ObjectId'
    })
  })

  try {
    await correctCondition.validateAsync(req.params, { abortEarly: false })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, new Error(error).message))
  }
}

/**
 * Validation middleware cho xóa nhiều sản phẩm khỏi wishlist
 * Validates: productIds (array các ObjectId)
 */
const removeMultipleFromWishlist = async (req, res, next) => {
  const correctCondition = Joi.object({
    productIds: Joi.array().items(
      Joi.string().pattern(OBJECT_ID_RULE).messages({
        'string.pattern.base': 'Each product ID must be a valid ObjectId'
      })
    ).optional().default([])
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, new Error(error).message))
  }
}

export const wishlistValidation = {
  addToWishlist,
  removeFromWishlist,
  removeMultipleFromWishlist
}
