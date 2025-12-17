/**
 * PAYMENT CONTROLLER
 * Handles payment operations with MoMo integration
 */

import { StatusCodes } from 'http-status-codes'
import { paymentService } from '../services/paymentService'
import { orderService } from '../services/orderService'
import { MoMoProvider } from '../providers/MoMoProvider'
import ApiError from '../utils/ApiError'

/**
 * Creates payment payload
 * @param {number} id - Order ID
 * @param {number} amount - Payment amount
 * @returns {Object} - Payment request object
 */
const generateSecurePaymentRequest = async (id, amount) => {
  const paymentInfo = {
    orderId: `ORDER_${id}_${Date.now()}`,
    amount: amount,
    orderInfo: `Payment for Order #${id}`,
    returnUrl: `${process.env.CLIENT_URL}/payment/momo/callback`,
    notifyUrl: `${process.env.SERVER_URL}/api/v1/payments/momo/notify`
  }
  
  return await MoMoProvider.createPayment(paymentInfo)
}

/**
 * Verifies payment status
 * @param {number} code - Result code from payment gateway
 * @returns {boolean} - True if successful
 */
const checkTransactionResponse = (code) => {
  return code === 0
}

/**
 * Updates payment status in DB
 * @param {Object} payment_info - Payment information
 * @returns {Promise<boolean>} - Update result
 */
const processUpdateData = async (payment_info) => {
  const { order_id, payment_status } = payment_info
  return await paymentService.updatePayment(order_id, { payment_status })
}

/**
 * Create MoMo payment
 * POST /api/v1/payments/momo
 */
const createMoMoPayment = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded.user_id
    const { order_id } = req.body
    
    if (!order_id) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Order ID is required')
    }
    
    // Get order details
    const order = await orderService.getOrder(parseInt(order_id))
    
    // Verify order belongs to user
    if (order.user_id !== userId) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Access denied')
    }
    
    // Check if order is already paid
    try {
      const existingPayment = await paymentService.getPayment(parseInt(order_id))
      if (existingPayment.payment_status === 'PAID') {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Order already paid')
      }
    } catch (error) {
      // Payment not found, continue
      if (!(error instanceof ApiError && error.statusCode === StatusCodes.NOT_FOUND)) {
        throw error
      }
    }
    
    // Create MoMo payment request using helper function
    const momoResponse = await generateSecurePaymentRequest(order_id, order.total_amount)
    
    // Insert payment record
    await paymentService.insertPayment({
      order_id: parseInt(order_id),
      method: 'MOMO',
      amount: order.total_amount,
      payment_status: 'PENDING'
    })
    
    res.status(StatusCodes.OK).json({
      success: true,
      payUrl: momoResponse.payUrl,
      message: 'MoMo payment created successfully'
    })
  } catch (error) {
    next(error)
  }
}

/**
 * MoMo payment callback (from MoMo server)
 * POST /api/v1/payments/momo/notify
 */
const momoNotify = async (req, res, next) => {
  try {
    const { orderId, resultCode } = req.body
    
    // Extract order_id from orderId (format: ORDER_123_timestamp)
    const orderIdMatch = orderId.match(/ORDER_(\d+)_/)
    if (!orderIdMatch) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid order ID format')
    }
    
    const order_id = parseInt(orderIdMatch[1])
    
    // Check transaction response
    const isSuccess = checkTransactionResponse(resultCode)
    const paymentStatus = isSuccess ? 'PAID' : 'FAILED'
    
    // Update payment data
    await processUpdateData({ order_id, payment_status: paymentStatus })
    
    // Update order status if payment successful
    if (paymentStatus === 'PAID') {
      await orderService.updateOrderStatus(order_id, 'CONFIRMED')
    }
    
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Payment notification processed'
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Get payment status
 * GET /api/v1/payments/order/:order_id
 */
const getPaymentStatus = async (req, res, next) => {
  try {
    const { order_id } = req.params
    const userId = req.jwtDecoded.user_id
    
    // Get order to verify ownership
    const order = await orderService.getOrder(parseInt(order_id))
    
    // Verify order belongs to user
    if (order.user_id !== userId) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Access denied')
    }
    
    // Get payment info
    const payment = await paymentService.getPayment(parseInt(order_id))
    
    res.status(StatusCodes.OK).json({
      success: true,
      data: payment
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Create COD payment (Cash on Delivery)
 * POST /api/v1/payments/cod
 */
const createCODPayment = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded.user_id
    const { order_id } = req.body
    
    if (!order_id) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Order ID is required')
    }
    
    // Get order details
    const order = await orderService.getOrder(parseInt(order_id))
    
    // Verify order belongs to user
    if (order.user_id !== userId) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Access denied')
    }
    
    // Insert payment record with COD method
    const result = await paymentService.insertPayment({
      order_id: parseInt(order_id),
      method: 'COD',
      amount: order.total_amount,
      payment_status: 'PENDING'
    })
    
    // Update order status to CONFIRMED
    await orderService.updateOrderStatus(parseInt(order_id), 'CONFIRMED')
    
    res.status(StatusCodes.CREATED).json({
      success: result,
      message: 'COD payment created successfully'
    })
  } catch (error) {
    next(error)
  }
}

export const paymentController = {
  generateSecurePaymentRequest,
  checkTransactionResponse,
  processUpdateData,
  createMoMoPayment,
  momoNotify,
  getPaymentStatus,
  createCODPayment
}
