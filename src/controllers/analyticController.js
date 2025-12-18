/**
 * ANALYTIC CONTROLLER - Order statistics and revenue analytics
 */

import { StatusCodes } from 'http-status-codes'
import { orderService } from '../services/orderService'
import ApiError from '../utils/ApiError'

/**
 * Validate filter conditions for analytics
 * @param {Object} filter - Filter conditions { start_date, end_date, status }
 * @returns {boolean} - True if valid
 */
const validateFilter = (filter) => {
  if (filter.start_date && filter.end_date) {
    const startDate = new Date(filter.start_date)
    const endDate = new Date(filter.end_date)
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return false
    }
    
    if (startDate > endDate) {
      return false
    }
  }
  
  return true
}

/**
 * Fetch and filter orders based on criteria
 * @param {Object} filter - Filter conditions
 * @returns {Promise<Array>} - Filtered orders
 */
const getFilteredOrders = async (filter) => {
  const orders = await orderService.getAllOrders()
  
  let filteredOrders = orders
  
  // Apply date filters
  if (filter.start_date) {
    const startDate = new Date(filter.start_date)
    filteredOrders = filteredOrders.filter(order =>
      new Date(order.order_date) >= startDate
    )
  }

  if (filter.end_date) {
    const endDate = new Date(filter.end_date)
    filteredOrders = filteredOrders.filter(order =>
      new Date(order.order_date) <= endDate
    )
  }

  // Apply status filter
  if (filter.status) {
    filteredOrders = filteredOrders.filter(order =>
      order.order_status === filter.status
    )
  }
  
  return filteredOrders
}

/**
 * Calculate order and revenue statistics
 * @param {Array} orders - List of orders
 * @returns {Object} - Calculated statistics
 */
const calculateStatistics = (orders) => {
  const stats = {
    total_orders: orders.length,
    total_revenue: 0,
    pending_orders: 0,
    confirmed_orders: 0,
    shipping_orders: 0,
    completed_orders: 0,
    cancelled_orders: 0,
    average_order_value: 0
  }
  
  orders.forEach(order => {
    stats.total_revenue += parseFloat(order.total_amount) || 0

    switch (order.order_status) {
    case 'PENDING':
      stats.pending_orders++
      break
    case 'CONFIRMED':
      stats.confirmed_orders++
      break
    case 'SHIPPING':
      stats.shipping_orders++
      break
    case 'COMPLETED':
      stats.completed_orders++
      break
    case 'CANCELLED':
      stats.cancelled_orders++
      break
    }
  })
  
  if (stats.total_orders > 0) {
    stats.average_order_value = stats.total_revenue / stats.total_orders
  }
  
  return stats
}

/**
 * Get revenue analytics with filters
 * GET /api/v1/analytics/revenue
 * @query {string} start_date - Start date (YYYY-MM-DD)
 * @query {string} end_date - End date (YYYY-MM-DD)
 * @query {string} status - Order status filter
 */
const getRevenueAnalytics = async (req, res, next) => {
  try {
    const filter = {
      start_date: req.query.start_date,
      end_date: req.query.end_date,
      status: req.query.status
    }
    
    // Validate filter
    if (!validateFilter(filter)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid filter conditions')
    }
    
    // Fetch filtered orders
    const orders = await getFilteredOrders(filter)
    
    // Calculate statistics
    const statistics = calculateStatistics(orders)
    
    res.status(StatusCodes.OK).json({
      success: true,
      data: statistics,
      filter
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Get order statistics by date range
 * GET /api/v1/analytics/orders
 * @query {string} start_date - Start date (YYYY-MM-DD)
 * @query {string} end_date - End date (YYYY-MM-DD)
 */
const getOrderStatistics = async (req, res, next) => {
  try {
    const filter = {
      start_date: req.query.start_date,
      end_date: req.query.end_date
    }
    
    if (!validateFilter(filter)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid filter conditions')
    }
    
    const orders = await getFilteredOrders(filter)
    const statistics = calculateStatistics(orders)
    
    res.status(StatusCodes.OK).json({
      success: true,
      data: statistics
    })
  } catch (error) {
    next(error)
  }
}

export const analyticController = {
  getRevenueAnalytics,
  getOrderStatistics
}
