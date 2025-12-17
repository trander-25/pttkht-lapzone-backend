/**
 * ORDER CONTROLLER
 * Handles order operations for customers
 */

import { StatusCodes } from 'http-status-codes'
import { orderService } from '../services/orderService'
import { orderItemService } from '../services/orderItemService'
import { cartService } from '../services/cartService'
import { cartItemService } from '../services/cartItemService'
import ApiError from '../utils/ApiError'
import { Order } from '../models/index.js'

/**
 * Validates voucher code
 * @param {string} code - Voucher code
 * @returns {Promise<boolean>} - Validation result
 */
const processValidateVoucher = async (code) => {
  // TODO: Implement voucher validation logic
  void code
  return true
}

/**
 * Creates order record
 * @param {Object} data - Order data
 * @returns {Promise<boolean>} - Creation result
 */
const processCreateOrder = async (data) => {
  // Implementation moved from createOrder
  return await orderService.insertOrder(data)
}

/**
 * Updates voucher usage count
 * @param {number} voucher_id - Voucher ID
 * @returns {Promise<boolean>} - Update result
 */
const processUpdateVoucherUsage = async (voucher_id) => {
  // TODO: Implement voucher usage update logic
  void voucher_id
  return true
}

/**
 * Deducts items from stock
 * @param {Array} items - Items to deduct
 * @returns {Promise<boolean>} - Update result
 */
const processUpdateItemStock = async (items) => {
  // TODO: Implement stock update logic
  void items
  return true
}

/**
 * Create new order from cart
 * POST /api/v1/orders
 */
const createOrder = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded.user_id
    
    // Get user's cart
    const cart = await cartService.getCart(userId)
    const cartItems = await cartItemService.getCartItems(cart.cart_id)
    
    if (cartItems.length === 0) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Cart is empty')
    }
    
    // Calculate total amount
    let totalAmount = 0
    const orderItems = []
    
    for (const item of cartItems) {
      const price = item.product.price
      totalAmount += price * item.quantity
      
      orderItems.push({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: price
      })
    }
    
    // Create order
    const result = await orderService.insertOrder({
      user_id: userId,
      total_amount: totalAmount,
      order_status: 'PENDING',
      order_date: new Date()
    })
    
    if (result) {
      // Get the newly created order
      const newOrder = await Order.findOne({
        where: { user_id: userId },
        order: [['order_id', 'DESC']]
      })
      
      // Insert order items
      const itemsWithOrderId = orderItems.map(item => ({
        ...item,
        order_id: newOrder.order_id
      }))
      
      await orderItemService.insertOrderItems(itemsWithOrderId)
      
      // Clear cart after successful order
      for (const item of cartItems) {
        await cartItemService.deleteCartItem({
          cart_id: cart.cart_id,
          product_id: item.product_id
        })
      }
    }
    
    res.status(StatusCodes.CREATED).json({
      success: result,
      message: 'Order created successfully'
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Get user's order history
 * GET /api/v1/orders
 */
const getUserOrders = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded.user_id
    
    const orders = await orderService.getOrders(userId)
    
    res.status(StatusCodes.OK).json({
      success: true,
      data: orders
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Get order details with items
 * GET /api/v1/orders/:order_id
 */
const getOrderDetails = async (req, res, next) => {
  try {
    const { order_id } = req.params
    const userId = req.jwtDecoded.user_id
    
    const order = await orderService.getOrder(parseInt(order_id))
    
    // Verify order belongs to user
    if (order.user_id !== userId) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Access denied')
    }
    
    // Get order items
    const items = await orderItemService.getOrderItems(parseInt(order_id))
    
    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        order,
        items
      }
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Cancel order (customer can only cancel PENDING orders)
 * PUT /api/v1/orders/:order_id/cancel
 */
const cancelOrder = async (req, res, next) => {
  try {
    const { order_id } = req.params
    const userId = req.jwtDecoded.user_id
    
    const order = await orderService.getOrder(parseInt(order_id))
    
    // Verify order belongs to user
    if (order.user_id !== userId) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Access denied')
    }
    
    // Only allow canceling PENDING orders
    if (order.order_status !== 'PENDING') {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Can only cancel pending orders')
    }
    
    const result = await orderService.updateOrderStatus(parseInt(order_id), 'CANCELLED')
    
    res.status(StatusCodes.OK).json({
      success: result,
      message: 'Order cancelled successfully'
    })
  } catch (error) {
    next(error)
  }
}

export const orderController = {
  processValidateVoucher,
  processCreateOrder,
  processUpdateVoucherUsage,
  processUpdateItemStock,
  createOrder,
  getUserOrders,
  getOrderDetails,
  cancelOrder
}
