/**
 * ORDER SERVICE - Business Logic Layer
 * Implements exact functions from Order entity specification
 */

import { Order, OrderItem, Product } from '../models/index'
import ApiError from '../utils/ApiError'
import { StatusCodes } from 'http-status-codes'

/**
 * Creates a new order record
 * @param {Object} order - Order data { user_id, receiver_name, phone, shipment_address, total_amount, order_status, order_date, voucher_id }
 * @returns {Promise<Object>} - Created order object
 */
const insertOrder = async (order) => {
  try {
    const newOrder = await Order.create({
      user_id: order.user_id,
      receiver_name: order.receiver_name,
      phone: order.phone,
      shipment_address: order.shipment_address,
      total_amount: order.total_amount,
      order_status: order.order_status || 'PENDING',
      order_date: order.order_date || new Date(),
      voucher_id: order.voucher_id || null
    })
    
    return newOrder
  } catch (error) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error inserting order')
  }
}

/**
 * Gets history of orders for a user
 * @param {number} user_id - User ID
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Promise<Object>} - { orders, pagination }
 */
const getOrders = async (user_id, page = 1, limit = 10) => {
  try {
    const offset = (page - 1) * limit
    
    const { count, rows } = await Order.findAndCountAll({
      where: { user_id },
      order: [['order_date', 'DESC']],
      limit: limit,
      offset: offset
    })
    
    const totalPages = Math.ceil(count / limit)
    
    return {
      orders: rows,
      pagination: {
        total: count,
        totalPages: totalPages,
        currentPage: page,
        limit: limit,
        hasMore: page < totalPages
      }
    }
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
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Promise<Object>} - { orders, pagination }
 */
const getAllOrders = async (page = 1, limit = 10) => {
  try {
    const offset = (page - 1) * limit
    
    const { count, rows } = await Order.findAndCountAll({
      order: [['order_date', 'DESC']],
      limit: limit,
      offset: offset
    })
    
    const totalPages = Math.ceil(count / limit)
    
    return {
      orders: rows,
      pagination: {
        total: count,
        totalPages: totalPages,
        currentPage: page,
        limit: limit,
        hasMore: page < totalPages
      }
    }
  } catch (error) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error getting all orders')
  }
}

/**
 * Saves the products for an order
 * @param {Array} items - Array of order items { order_id, product_id, quantity, unit_price }
 * @returns {Promise<Boolean>} - True if successful
 */
const insertOrderItems = async (items) => {
  try {
    // Bulk insert all items
    await OrderItem.bulkCreate(items.map(item => ({
      order_id: item.order_id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price
    })))
    
    return true
  } catch (error) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error inserting order items')
  }
}

/**
 * Gets products in a specific order
 * @param {number} order_id - Order ID
 * @returns {Promise<Array>} - List of order items with product details
 */
const getOrderItems = async (order_id) => {
  try {
    const items = await OrderItem.findAll({
      where: { order_id },
      include: [
        {
          model: Product,
          as: 'product'
        }
      ]
    })
    
    return items
  } catch (error) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error getting order items')
  }
}

/**
 * Search orders by keyword (Admin)
 * Searches in order_id, receiver_name, and phone fields
 * @param {string} keyword - Search keyword
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Promise<Object>} - { orders, pagination }
 */
const searchOrders = async (keyword, page = 1, limit = 10) => {
  try {
    const offset = (page - 1) * limit
    const { Op } = await import('sequelize')
    
    // Build search conditions
    const whereConditions = {
      [Op.or]: [
        { receiver_name: { [Op.like]: `%${keyword}%` } },
        { phone: { [Op.like]: `%${keyword}%` } }
      ]
    }
    
    // If keyword is a number, also search by order_id
    if (!isNaN(keyword)) {
      whereConditions[Op.or].push({ order_id: parseInt(keyword) })
    }
    
    const { count, rows } = await Order.findAndCountAll({
      where: whereConditions,
      order: [['order_date', 'DESC']],
      limit: limit,
      offset: offset
    })
    
    const totalPages = Math.ceil(count / limit)
    
    return {
      orders: rows,
      pagination: {
        total: count,
        totalPages: totalPages,
        currentPage: page,
        limit: limit,
        hasMore: page < totalPages
      }
    }
  } catch (error) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error searching orders')
  }
}

export const orderService = {
  insertOrder,
  getOrders,
  getOrder,
  updateOrderStatus,
  updateOrder,
  getAllOrders,
  insertOrderItems,
  getOrderItems,
  searchOrders
}
