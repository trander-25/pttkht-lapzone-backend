/**
 * MANAGE ORDER CONTROLLER - Admin order management
 */

import { StatusCodes } from 'http-status-codes'
import { orderService } from '../services/orderService'
import { paymentService } from '../services/paymentService'
import { productService } from '../services/productService'
import ApiError from '../utils/ApiError'

/**
 * Get all orders (Admin)
 * GET /api/v1/manage/orders?page=1&limit=10
 * @query {number} page - Page number (default: 1)
 * @query {number} limit - Items per page (default: 10, max: 50)
 */
const getAllOrders = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = Math.min(parseInt(req.query.limit) || 10, 50)
    
    const result = await orderService.getAllOrders(page, limit)
    
    res.status(StatusCodes.OK).json({
      success: true,
      data: result.orders,
      pagination: result.pagination
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Search orders by keyword
 * GET /api/v1/manage/orders/search?keyword=xxx&page=1&limit=10
 * @query {string} keyword - Search keyword (required)
 * @query {number} page - Page number (default: 1)
 * @query {number} limit - Items per page (default: 10, max: 50)
 */
const searchOrders = async (req, res, next) => {
  try {
    const { keyword } = req.query
    const page = parseInt(req.query.page) || 1
    const limit = Math.min(parseInt(req.query.limit) || 10, 50)
    
    if (!keyword) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Keyword is required')
    }

    const result = await orderService.searchOrders(keyword, page, limit)
    
    res.status(StatusCodes.OK).json({
      success: true,
      data: result.orders,
      pagination: result.pagination
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Get order details with items and payment
 * GET /api/v1/manage/orders/:order_id
 */
const getOrderDetails = async (req, res, next) => {
  try {
    const { order_id } = req.params
    
    const order = await orderService.getOrder(parseInt(order_id))
    const items = await orderService.getOrderItems(parseInt(order_id))
    const payment = await paymentService.getPayment(parseInt(order_id))
    
    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        order,
        items,
        payment
      }
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Update order information (Admin)
 * PUT /api/v1/manage/orders/:order_id
 * Can update: order_status, receiver_name, phone, shipment_address, payment_status
 */
const updateOrder = async (req, res, next) => {
  try {
    const { order_id } = req.params
    const { order_status, receiver_name, phone, shipment_address, payment_status } = req.body
    
    // Build update data object with only provided fields
    const updateData = {}
    if (order_status) updateData.order_status = order_status
    if (receiver_name) updateData.receiver_name = receiver_name
    if (phone) updateData.phone = phone
    if (shipment_address) updateData.shipment_address = shipment_address
    
    if (Object.keys(updateData).length === 0 && !payment_status) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'No data to update')
    }
    
    // If cancelling order, validate eligibility
    if (order_status === 'CANCELLED') {
      const order = await orderService.getOrder(parseInt(order_id))
      if (order.order_status !== 'PENDING' && order.order_status !== 'CONFIRMED') {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Order cannot be cancelled')
      }
    }
    
    // Update order
    let result = null
    if (Object.keys(updateData).length > 0) {
      result = await orderService.updateOrder(parseInt(order_id), updateData)
    }
    
    // Update payment status if provided
    if (payment_status) {
      await paymentService.updatePayment(parseInt(order_id), { payment_status })
    }
    
    // Restore product stock AFTER updating order and payment
    if (order_status === 'CANCELLED') {
      const items = await orderService.getOrderItems(parseInt(order_id))
      for (const item of items) {
        await productService.incrementStock(item.product_id, item.quantity)
      }
    }
    
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Order updated successfully',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

export const manageOrderController = {
  getAllOrders,
  searchOrders,
  getOrderDetails,
  updateOrder
}
