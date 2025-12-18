/**
 * PAYMENT CONTROLLER - MoMo payment callback handling
 */

import { StatusCodes } from 'http-status-codes'
import { paymentService } from '../services/paymentService'
import { orderService } from '../services/orderService'

/**
 * MoMo IPN Callback - Receives payment notification from MoMo
 * POST /api/v1/payment/momo/callback
 */
const handleMoMoCallback = async (req, res, next) => {
  try {
    const callbackData = req.body
    
    // Verify signature
    const isValid = paymentService.verifyMoMoCallback(callbackData)
    
    if (!isValid) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Invalid signature'
      })
    }
    
    // Extract order_id from orderId (format: ORDER_123)
    const orderIdMatch = callbackData.orderId.match(/ORDER_(\d+)/)
    if (!orderIdMatch) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Invalid order ID format'
      })
    }
    
    const orderId = parseInt(orderIdMatch[1])
    
    // Check payment result (resultCode = 0 means success)
    if (callbackData.resultCode === 0) {
      // Update payment status to PAID
      await paymentService.updatePayment(orderId, {
        payment_status: 'PAID'
      })
      
      // Update order status to CONFIRMED
      await orderService.updateOrderStatus(orderId, 'CONFIRMED')
      
      return res.status(StatusCodes.OK).json({
        success: true,
        message: 'Payment processed successfully'
      })
    } else {
      // Payment failed or cancelled, keep status as PENDING
      return res.status(StatusCodes.OK).json({
        success: true,
        message: 'Payment not completed',
        resultCode: callbackData.resultCode
      })
    }
  } catch (error) {
    next(error)
  }
}

export const paymentController = {
  handleMoMoCallback
}
