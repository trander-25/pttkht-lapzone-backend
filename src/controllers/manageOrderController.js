/**
 * MANAGE ORDER CONTROLLER - Admin order management
 */

import { StatusCodes } from 'http-status-codes'
import { orderService } from '../services/orderService'
import { orderItemService } from '../services/orderItemService'
import { paymentService } from '../services/paymentService'
import { productService } from '../services/productService'
import ApiError from '../utils/ApiError'

/**
 * Get all orders (Admin)
 * GET /api/v1/manage/orders
 */
const getAllOrders = async (req, res, next) => {
  try {
    const orders = await orderService.getAllOrders()
    
    res.status(StatusCodes.OK).json({
      success: true,
      data: orders
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Search orders by keyword
 * GET /api/v1/manage/orders/search?keyword=xxx
 * TODO: Move search logic to orderService
 */
const searchOrders = async (req, res, next) => {
  try {
    const { keyword } = req.query
    
    if (!keyword) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Keyword is required')
    }

    // TODO: Implement orderService.searchOrders(keyword)
    // For now, return all orders and let client filter
    const orders = await orderService.getAllOrders()
    
    res.status(StatusCodes.OK).json({
      success: true,
      data: orders,
      message: 'Search functionality temporarily returns all orders'
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
    const items = await orderItemService.getOrderItems(parseInt(order_id))
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
      
      // Restore product stock
      const items = await orderItemService.getOrderItems(parseInt(order_id))
      for (const item of items) {
        await productService.incrementStock(item.product_id, item.quantity)
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
