/**
 * ORDER SERVICE - Business Logic Layer
 * Implements exact functions from Order entity specification
 */

import { Order } from '../models/index'
import ApiError from '../utils/ApiError'
import { StatusCodes } from 'http-status-codes'

/**
 * Creates a new order record
 * @param {Object} order - Order data { user_id, receiver_name, phone, shipment_address, total_amount, order_status, order_date, voucher_id }
 * @returns {Promise<Boolean>} - True if successful
 */
const insertOrder = async (order) => {
  try {
    await Order.create({
      user_id: order.user_id,
      receiver_name: order.receiver_name,
      phone: order.phone,
      shipment_address: order.shipment_address,
      total_amount: order.total_amount,
      order_status: order.order_status || 'PENDING',
      order_date: order.order_date || new Date(),
      voucher_id: order.voucher_id || null
    })
    
    return true
  } catch (error) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error inserting order')
  }
}

/**
 * Gets history of orders for a user
 * @param {number} user_id - User ID
 * @returns {Promise<Array>} - List of orders
 */
const getOrders = async (user_id) => {
  try {
    const orders = await Order.findAll({
      where: { user_id },
      order: [['order_date', 'DESC']]
    })
    
    return orders
  } catch (error) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error getting user orders')
  }
}

/**
 * Gets details of a specific order
 * @param {number} order_id - Order ID
 * @returns {Promise<Object>} - Order object
 */
const getOrder = async (order_id) => {
  try {
    const order = await Order.findByPk(order_id)
    
    if (!order) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Order not found')
    }
    
    return order
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error getting order')
  }
}

/**
 * Changes status (e.g., Cancelled)
 * @param {number} order_id - Order ID
 * @param {string} status - New order status
 * @returns {Promise<Boolean>} - True if successful
 */
const updateOrderStatus = async (order_id, status) => {
  try {
    const [updated] = await Order.update(
      { order_status: status },
      { where: { order_id } }
    )
    
    return updated > 0
  } catch (error) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error updating order status')
  }
}

/**
 * Updates order information (Admin)
 * @param {number} order_id - Order ID
 * @param {Object} updates - Order updates { receiver_name, phone, shipment_address, order_status }
 * @returns {Promise<Boolean>} - True if successful
 */
const updateOrder = async (order_id, updates) => {
  try {
    const [updated] = await Order.update(updates, {
      where: { order_id }
    })
    
    return updated > 0
  } catch (error) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error updating order')
  }
}

/**
 * Gets all orders for Admin
 * @returns {Promise<Array>} - List of all orders
 */
const getAllOrders = async () => {
  try {
    const orders = await Order.findAll({
      order: [['order_date', 'DESC']]
    })
    
    return orders
  } catch (error) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error getting all orders')
  }
}

export const orderService = {
  insertOrder,
  getOrders,
  getOrder,
  updateOrderStatus,
  updateOrder,
  getAllOrders
}
