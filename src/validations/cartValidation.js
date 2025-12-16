import Joi from 'joi'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import { FIELD_REQUIRED_MESSAGE, OBJECT_ID_RULE } from '~/utils/validators'

/**
 * Validation cho API thêm sản phẩm vào giỏ
 * Fields:
 * - productId: Bắt buộc, phải là ObjectId hợp lệ
 * - quantity: Tùy chọn, mặc định 1, phải >= 1
 * Logic kiểm tra stock ở service layer
 */
const addToCart = async (req, res, next) => {
  const correctCondition = Joi.object({
    productId: Joi.string().required().pattern(OBJECT_ID_RULE).messages({
      'any.required': FIELD_REQUIRED_MESSAGE,
      'string.empty': FIELD_REQUIRED_MESSAGE,
      'string.pattern.base': 'Product ID must be a valid ObjectId'
    }),
    quantity: Joi.number().min(1).default(1).messages({
      'number.min': 'Quantity must be at least 1'
    })
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, new Error(error.message)))
  }
}

/**
 * Validation cho API cập nhật item trong giỏ
 * Fields (phải có ít nhất 1):
 * - quantity: Số lượng mới (>= 1)
 * - selected: Trạng thái chọn (boolean)
 * Error nếu không gửi field nào
 */
const updateCartItem = async (req, res, next) => {
  const correctCondition = Joi.object({
    quantity: Joi.number().min(1).messages({
      'number.min': 'Quantity must be at least 1'
    }),
    selected: Joi.boolean()
  }).or('quantity', 'selected').messages({
    'object.missing': 'At least one field (quantity or selected) is required'
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, new Error(error.message)))
  }
}

export const cartValidation = {
  addToCart,
  updateCartItem
}
