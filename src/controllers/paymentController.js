/**
 * PAYMENT CONTROLLER - MoMo payment callback handling
 */

import { StatusCodes } from 'http-status-codes'
import { paymentService } from '../services/paymentService'
import { orderService } from '../services/orderService'

/**
 * MoMo IPN Callback - Receives payment notification from MoMo
 * POST /api/v1/payment/momo/callback
 *
 * This endpoint can also be called by frontend after redirect from MoMo
 * as a fallback mechanism if IPN callback doesn't work (e.g., in development)
 */
/* eslint-disable no-console */
const handleMoMoCallback = async (req, res, next) => {
  try {
    const callbackData = req.body

    console.log('MoMo Callback received:', {
      orderId: callbackData.orderId,
      resultCode: callbackData.resultCode,
      amount: callbackData.amount,
      transId: callbackData.transId,
      hasSignature: !!callbackData.signature
    })

    // Check if this is a request from frontend (no signature) or from MoMo (with signature)
    const isFromMoMo = !!callbackData.signature

    // If from MoMo, verify signature
    if (isFromMoMo) {
      const isValid = paymentService.verifyMoMoCallback(callbackData)

      if (!isValid) {
        console.error('MoMo IPN Callback: Invalid signature', {
          orderId: callbackData.orderId,
          receivedSignature: callbackData.signature?.substring(0, 20) + '...'
        })
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'Invalid signature'
        })
      }
    } else {
      // Request from frontend - validate required fields
      if (!callbackData.orderId || callbackData.resultCode === undefined) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'Missing orderId or resultCode'
        })
      }
      console.log('MoMo Callback: Request from frontend (fallback mechanism)')
    }

    // Extract order_id from orderId (format: ORDER_123)
    const orderIdMatch = callbackData.orderId.match(/ORDER_(\d+)/)
    if (!orderIdMatch) {
      console.error('MoMo Callback: Invalid order ID format', callbackData.orderId)
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Invalid order ID format'
      })
    }

    const orderId = parseInt(orderIdMatch[1])

    // Get current payment and order status to avoid duplicate updates
    let currentPayment = null
    let currentOrder = null
    try {
      currentPayment = await paymentService.getPayment(orderId)
      currentOrder = await orderService.getOrder(orderId)
    } catch (error) {
      console.error(`MoMo Callback: Error getting payment/order for order ${orderId}:`, error.message)
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Order or payment not found'
      })
    }

    // Check payment result (resultCode = 0 means success)
    if (callbackData.resultCode === 0 || callbackData.resultCode === '0') {
      // Only update if payment is still PENDING
      if (currentPayment.payment_status === 'PENDING') {
        console.log(`MoMo Callback: Payment successful for order ${orderId}, updating status...`)

        try {
          // Update payment status to PAID
          await paymentService.updatePayment(orderId, {
            payment_status: 'PAID'
          })
          console.log(`MoMo Callback: Payment ${orderId} updated to PAID`)

          // Update order status to CONFIRMED if still PENDING
          if (currentOrder.order_status === 'PENDING') {
            await orderService.updateOrderStatus(orderId, 'CONFIRMED')
            console.log(`MoMo Callback: Order ${orderId} updated to CONFIRMED`)
          } else {
            console.log(`MoMo Callback: Order ${orderId} status is ${currentOrder.order_status}, skipping status update`)
          }
        } catch (updateError) {
          console.error(`MoMo Callback: Error updating payment/order for order ${orderId}:`, updateError)
          return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Error updating payment status'
          })
        }
      } else {
        console.log(`MoMo Callback: Payment ${orderId} already processed, current status: ${currentPayment.payment_status}`)
      }

      return res.status(StatusCodes.OK).json({
        success: true,
        message: 'Payment processed successfully',
        payment_status: currentPayment.payment_status === 'PENDING' ? 'PAID' : currentPayment.payment_status,
        order_status: currentOrder.order_status === 'PENDING' ? 'CONFIRMED' : currentOrder.order_status
      })
    } else {
      // Payment failed or cancelled, keep status as PENDING
      console.log(`MoMo Callback: Payment failed for order ${orderId}, resultCode: ${callbackData.resultCode}`)
      return res.status(StatusCodes.OK).json({
        success: true,
        message: 'Payment not completed',
        resultCode: callbackData.resultCode,
        payment_status: currentPayment.payment_status
      })
    }
  } catch (error) {
    console.error('MoMo Callback error:', error)
    next(error)
  }
}
/* eslint-enable no-console */

export const paymentController = {
  handleMoMoCallback
}
