/**
 * PAYMENT SERVICE - Business Logic Layer
 * Implements exact functions from Payment entity specification
 */

import { Payment } from '../models/index'
import ApiError from '../utils/ApiError'
import { StatusCodes } from 'http-status-codes'

/**
 * Records a new payment transaction
 * @param {Object} payment - Payment data { order_id, method, amount, payment_status }
 * @returns {Promise<Boolean>} - True if successful
 */
const insertPayment = async (payment) => {
  try {
    await Payment.create({
      order_id: payment.order_id,
      method: payment.method,
      amount: payment.amount,
      payment_status: payment.payment_status || 'PENDING'
    })
    
    return true
  } catch (error) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error inserting payment')
  }
}

/**
 * Gets payment info for an order
 * @param {number} order_id - Order ID
 * @returns {Promise<Object>} - Payment object
 */
const getPayment = async (order_id) => {
  try {
    const payment = await Payment.findOne({
      where: { order_id }
    })
    
    if (!payment) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Payment not found')
    }
    
    return payment
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error getting payment')
  }
}

/**
 * Updates payment info for an order
 * @param {number} order_id - Order ID
 * @param {Object} updates - Payment updates { payment_status, method, etc }
 * @returns {Promise<Boolean>} - True if successful
 */
const updatePayment = async (order_id, updates) => {
  try {
    const [updated] = await Payment.update(
      updates,
      { where: { order_id } }
    )
    
    if (updated === 0) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Payment not found')
    }
    
    return true
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error updating payment')
  }
}

export const paymentService = {
  insertPayment,
  getPayment,
  updatePayment
}
