/**
 * MANAGE ORDER CONTROLLER
 * Admin order management
 */

import { StatusCodes } from 'http-status-codes'
import { orderService } from '../services/orderService'
import { orderItemService } from '../services/orderItemService'
import { paymentService } from '../services/paymentService'
import ApiError from '../utils/ApiError'

/**
 * Gets orders for a user
 * @param {number} user_id - User ID (optional for all orders)
 * @returns {Promise<Array>} - List of orders
 */
const getOrderList = async (user_id = null) => {
  if (user_id) {
    return await orderService.getOrders(user_id)
  }
  return await orderService.getAllOrders()
}

/**
 * Gets order details
 * @param {number} order_id - Order ID
 * @returns {Promise<Object>} - Order details with items
 */
const getOrderDetailInformation = async (order_id) => {
  const order = await orderService.getOrder(order_id)
  const items = await orderItemService.getOrderItems(order_id)
  return { order, items }
}

/**
 * Gets payment info for order
 * @param {number} order_id - Order ID
 * @returns {Promise<Object>} - Payment information
 */
const getPaymentInformation = async (order_id) => {
  return await paymentService.getPayment(order_id)
}

/**
 * Checks if order is eligible for cancellation
 * @param {number} order_id - Order ID
 * @returns {Promise<boolean>} - True if cancellable
 */
const validateEligibleStatus = async (order_id) => {
  const order = await orderService.getOrder(order_id)
  return order.order_status === 'PENDING' || order.order_status === 'CONFIRMED'
}

/**
 * Cancels order
 * @param {number} order_id - Order ID
 * @returns {Promise<boolean>} - Cancellation result
 */
const sendCancelRequest = async (order_id) => {
  return await orderService.updateOrderStatus(order_id, 'CANCELLED')
}

/**
 * Restocks items after cancellation
 * @param {Array} items - Items to restock
 * @returns {Promise<boolean>} - Restock result
 */
const sendUpdateStockRequest = async (items) => {
  // TODO: Implement stock update logic
  void items
  return true
}

/**
 * Admin updates order status
 * @param {number} order_id - Order ID
 * @param {string} status - New status
 * @returns {Promise<boolean>} - Update result
 */
const sendUpdateRequest = async (order_id, status) => {
  return await orderService.updateOrderStatus(order_id, status)
}

/**
 * Searches orders by keyword
 * @param {string} keyword - Search keyword
 * @returns {Promise<Array>} - List of matching orders
 */
const processSearchRequest = async (keyword) => {
  // TODO: Implement order search logic
  void keyword
  const orders = await orderService.getAllOrders()
  return orders
}

/**
 * Get all orders (Admin)
 * GET /api/v1/manage-orders
 */
const getAllOrders = async (req, res, next) => {
  try {
    const orders = await getOrderList()
    
    res.status(StatusCodes.OK).json({
      success: true,
      data: orders
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Get order details (Admin)
 * GET /api/v1/manage-orders/:order_id
 */
const getOrderDetails = async (req, res, next) => {
  try {
    const { order_id } = req.params
    
    const data = await getOrderDetailInformation(parseInt(order_id))
    
    res.status(StatusCodes.OK).json({
      success: true,
      data
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Update order status (Admin)
 * PUT /api/v1/manage-orders/:order_id/status
 */
const updateOrderStatus = async (req, res, next) => {
  try {
    const { order_id } = req.params
    const { status } = req.body
    
    if (!status) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Status is required')
    }
    
    const result = await sendUpdateRequest(parseInt(order_id), status)
    
    res.status(StatusCodes.OK).json({
      success: result,
      message: 'Order status updated successfully'
    })
  } catch (error) {
    next(error)
  }
}

export const manageOrderController = {
  getOrderList,
  getOrderDetailInformation,
  getPaymentInformation,
  validateEligibleStatus,
  sendCancelRequest,
  sendUpdateStockRequest,
  sendUpdateRequest,
  processSearchRequest,
  getAllOrders,
  getOrderDetails,
  updateOrderStatus
}
