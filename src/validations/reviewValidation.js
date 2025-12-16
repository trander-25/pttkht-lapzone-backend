import Joi from 'joi'
import { OBJECT_ID_RULE, FIELD_REQUIRED_MESSAGE } from '~/utils/validators'
import { reviewModel } from '~/models/reviewModel'

/**
 * Validation middleware cho lấy tất cả reviews (Admin)
 * Validates: page, limit, status (query params)
 */
const getAllReviews = async (req, res, next) => {
  const correctCondition = Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(50).optional(),
    status: Joi.string().valid(...Object.values(reviewModel.REVIEW_STATUS)).optional()
  })

  try {
    await correctCondition.validateAsync(req.query, { abortEarly: false })
    next()
  } catch (error) {
    next(error)
  }
}

/**
 * Validation middleware cho lấy reviews theo sản phẩm
 * Validates: productId (params), page, limit, status (query)
 */
const getReviewsByProductId = async (req, res, next) => {
  const correctCondition = Joi.object({
    productId: Joi.string().required().pattern(OBJECT_ID_RULE).messages({
      'any.required': FIELD_REQUIRED_MESSAGE,
      'string.pattern.base': 'Product ID must be a valid ObjectId'
    })
  })

  const queryCondition = Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(50).optional(),
    status: Joi.string().valid(...Object.values(reviewModel.REVIEW_STATUS)).optional()
  })

  try {
    await correctCondition.validateAsync(req.params, { abortEarly: false })
    await queryCondition.validateAsync(req.query, { abortEarly: false })
    next()
  } catch (error) {
    next(error)
  }
}

/**
 * Validation middleware cho tạo review mới
 * Validates:
 * - productId: Sản phẩm được review
 * - rating: 1-5 sao (REVIEW_RATING.MIN to REVIEW_RATING.MAX)
 * - comment: Nội dung review (5-1000 ký tự)
 */
const createReview = async (req, res, next) => {
  const correctCondition = Joi.object({
    productId: Joi.string().required().pattern(OBJECT_ID_RULE).messages({
      'any.required': FIELD_REQUIRED_MESSAGE,
      'string.pattern.base': 'Product ID must be a valid ObjectId'
    }),

    rating: Joi.number()
      .integer()
      .min(reviewModel.REVIEW_RATING.MIN)
      .max(reviewModel.REVIEW_RATING.MAX)
      .required()
      .messages({
        'any.required': 'Rating is required',
        'number.min': `Rating must be at least ${reviewModel.REVIEW_RATING.MIN}`,
        'number.max': `Rating must be at most ${reviewModel.REVIEW_RATING.MAX}`,
        'number.integer': 'Rating must be an integer'
      }),

    comment: Joi.string().required().trim().min(5).max(1000).messages({
      'any.required': 'Comment is required',
      'string.min': 'Comment must be at least 5 characters',
      'string.max': 'Comment must be at most 1000 characters'
    })
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    next(error)
  }
}

/**
 * Validation middleware cho cập nhật review (Admin)
 * Validates:
 * - reviewId (params)
 * - status: PENDING, APPROVED, REJECTED (optional)
 * - comment: Chỉnh sửa nội dung (optional)
 */
const updateReview = async (req, res, next) => {
  const paramCondition = Joi.object({
    reviewId: Joi.string().required().pattern(OBJECT_ID_RULE).messages({
      'any.required': FIELD_REQUIRED_MESSAGE,
      'string.pattern.base': 'Review ID must be a valid ObjectId'
    })
  })

  const bodyCondition = Joi.object({
    status: Joi.string().valid(...Object.values(reviewModel.REVIEW_STATUS)).optional(),
    comment: Joi.string().trim().min(5).max(1000).optional()
  })

  try {
    await paramCondition.validateAsync(req.params, { abortEarly: false })
    await bodyCondition.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    next(error)
  }
}

/**
 * Validation middleware cho xóa review
 * Validates: reviewId (params)
 */
const deleteReview = async (req, res, next) => {
  const correctCondition = Joi.object({
    reviewId: Joi.string().required().pattern(OBJECT_ID_RULE).messages({
      'any.required': FIELD_REQUIRED_MESSAGE,
      'string.pattern.base': 'Review ID must be a valid ObjectId'
    })
  })

  try {
    await correctCondition.validateAsync(req.params, { abortEarly: false })
    next()
  } catch (error) {
    next(error)
  }
}

export const reviewValidation = {
  getAllReviews,
  getReviewsByProductId,
  createReview,
  updateReview,
  deleteReview
}
