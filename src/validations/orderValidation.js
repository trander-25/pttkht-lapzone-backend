import Joi from 'joi'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import { OBJECT_ID_RULE } from '~/utils/validators'
import { orderModel } from '~/models/orderModel'

/**
 * Validation cho API preview đơn hàng
 * Hỗ trợ 2 nguồn (source):
 * - 'cart': Mua từ giỏ hàng (không cần items, lấy từ cart của user)
 * - 'buy_now': Mua ngay (bắt buộc phải có items: [{ productId, quantity }])
 * Fields:
 * - source: 'cart' | 'buy_now' (default: 'cart')
 * - items: Array (bắt buộc nếu source='buy_now')
 */
const previewOrder = async (req, res, next) => {
  const correctCondition = Joi.object({
    // Source: 'cart' or 'buy_now'
    source: Joi.string().valid('cart', 'buy_now').default('cart'),

    // For buy now
    items: Joi.when('source', {
      is: 'buy_now',
      then: Joi.array().items(
        Joi.object({
          productId: Joi.string().pattern(OBJECT_ID_RULE).required(),
          quantity: Joi.number().integer().min(1).required()
        })
      ).min(1).required(),
      otherwise: Joi.array().optional()
    }),

    // For cart purchase
    cartItemIds: Joi.when('source', {
      is: 'cart',
      then: Joi.array().items(
        Joi.string().pattern(OBJECT_ID_RULE)
      ).optional(),
      otherwise: Joi.array().optional()
    })
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.message))
  }
}

/**
 * Validation cho API tạo đơn hàng
 * Tương tự previewOrder nhưng thêm:
 * - shippingAddress: Bắt buộc (fullName, phone, province, district, ward, street)
 * - paymentMethod: Bắt buộc ('cod' | 'momo')
 * - note: Optional
 * Phone validation: 10-11 chữ số
 */
const createOrder = async (req, res, next) => {
  const correctCondition = Joi.object({
    // Source: 'cart' or 'buy_now'
    source: Joi.string().valid('cart', 'buy_now').default('cart'),

    // For buy now
    items: Joi.when('source', {
      is: 'buy_now',
      then: Joi.array().items(
        Joi.object({
          productId: Joi.string().pattern(OBJECT_ID_RULE).required(),
          quantity: Joi.number().integer().min(1).required()
        })
      ).min(1).required(),
      otherwise: Joi.array().optional()
    }),

    // For cart purchase
    cartItemIds: Joi.when('source', {
      is: 'cart',
      then: Joi.array().items(
        Joi.string().pattern(OBJECT_ID_RULE)
      ).optional(),
      otherwise: Joi.array().optional()
    }),

    // Shipping address (FE handles address selection, just send final address)
    shippingAddress: Joi.object({
      fullName: Joi.string().required().messages({
        'any.required': 'Full name is required'
      }),
      phone: Joi.string().required().pattern(/^[0-9]{10,11}$/).messages({
        'any.required': 'Phone number is required',
        'string.pattern.base': 'Phone number must be 10-11 digits'
      }),
      province: Joi.string().required().messages({
        'any.required': 'Province is required'
      }),
      district: Joi.string().required().messages({
        'any.required': 'District is required'
      }),
      ward: Joi.string().required().messages({
        'any.required': 'Ward is required'
      }),
      street: Joi.string().required().messages({
        'any.required': 'Street address is required'
      }),
      note: Joi.string().allow('').optional()
    }).required(),

    paymentMethod: Joi.string().valid(...Object.values(orderModel.PAYMENT_METHOD)).required().messages({
      'any.required': 'Payment method is required',
      'any.only': 'Invalid payment method'
    }),

    note: Joi.string().allow('').optional()
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.message))
  }
}

/**
 * Validation cho API hủy đơn hàng
 * Không cần validate body - chỉ cần orderId trong URL params
 * Logic kiểm tra quyền và trạng thái ở service layer
 */
const cancelOrder = async (req, res, next) => {
  // No body validation needed - just cancel the order
  next()
}

/**
 * Validation cho orderId trong URL params
 * Kiểm tra orderId là MongoDB ObjectId hợp lệ
 * Sử dụng chung cho các routes: /:orderId, /:orderId/cancel, etc.
 */
const validateOrderId = async (req, res, next) => {
  const correctCondition = Joi.object({
    orderId: Joi.string().pattern(OBJECT_ID_RULE).required().messages({
      'any.required': 'Order ID is required',
      'string.pattern.base': 'Invalid Order ID format'
    })
  })

  try {
    await correctCondition.validateAsync(req.params, { abortEarly: false })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.message))
  }
}

/**
 * Validation cho API lấy danh sách đơn hàng của user
 * Query params:
 * - page: Integer >= 1 (optional)
 * - limit: Integer 1-50 (optional)
 * - status: pending|confirmed|shipping|delivered|cancelled (optional)
 */
const getMyOrders = async (req, res, next) => {
  const correctCondition = Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(50).optional(),
    status: Joi.string().valid(
      orderModel.ORDER_STATUS.PENDING,
      orderModel.ORDER_STATUS.CONFIRMED,
      orderModel.ORDER_STATUS.SHIPPING,
      orderModel.ORDER_STATUS.DELIVERED,
      orderModel.ORDER_STATUS.CANCELLED
    ).optional()
  })

  try {
    await correctCondition.validateAsync(req.query, { abortEarly: false })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.message))
  }
}

/**
 * Validation cho API lấy tất cả đơn hàng (Admin)
 * Query params giống getMyOrders:
 * - page, limit, status (cùng rules)
 */
const getAllOrders = async (req, res, next) => {
  const correctCondition = Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(50).optional(),
    status: Joi.string().valid(
      orderModel.ORDER_STATUS.PENDING,
      orderModel.ORDER_STATUS.CONFIRMED,
      orderModel.ORDER_STATUS.SHIPPING,
      orderModel.ORDER_STATUS.DELIVERED,
      orderModel.ORDER_STATUS.CANCELLED
    ).optional()
  })

  try {
    await correctCondition.validateAsync(req.query, { abortEarly: false })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.message))
  }
}

/**
 * Validation cho API cập nhật đơn hàng (Admin)
 * Fields (tất cả optional nhưng phải có ít nhất 1):
 * - status: pending|confirmed|shipping|delivered|cancelled
 * - paymentStatus: unpaid|paid|refunded
 * Error nếu không gửi field nào
 */
const updateOrder = async (req, res, next) => {
  const correctCondition = Joi.object({
    status: Joi.string().valid(
      orderModel.ORDER_STATUS.PENDING,
      orderModel.ORDER_STATUS.CONFIRMED,
      orderModel.ORDER_STATUS.SHIPPING,
      orderModel.ORDER_STATUS.DELIVERED,
      orderModel.ORDER_STATUS.CANCELLED
    ).optional(),
    paymentStatus: Joi.string().valid(
      orderModel.PAYMENT_STATUS.UNPAID,
      orderModel.PAYMENT_STATUS.PAID,
      orderModel.PAYMENT_STATUS.REFUNDED
    ).optional()
  }).min(1).messages({
    'object.min': 'At least one field must be provided for update'
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.message))
  }
}

export const orderValidation = {
  previewOrder,
  createOrder,
  cancelOrder,
  validateOrderId,
  getMyOrders,
  getAllOrders,
  updateOrder
}
