/**
 * ANALYTIC CONTROLLER
 * Handles analytics and statistics operations
 */

import { StatusCodes } from 'http-status-codes'
import { orderService } from '../services/orderService'
import ApiError from '../utils/ApiError'

/**
 * Checks filter validity
 * @param {Object} filter - Filter conditions { start_date, end_date, status, etc }
 * @returns {boolean} - True if valid
 */
const validateConditions = (filter) => {
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
 * Fetches raw order data
 * @param {Object} filter - Filter conditions
 * @returns {Promise<Array>} - List of orders with payment info
 */
const sendQueryRequest = async (filter) => {
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
 * Calculates revenue statistics
 * @param {Array} raw_data - Raw order data
 * @returns {Object} - Revenue statistics
 */
const processTheData = (raw_data) => {
  const stats = {
    total_orders: raw_data.length,
    total_revenue: 0,
    paid_orders: 0,
    pending_orders: 0,
    cancelled_orders: 0,
    confirmed_orders: 0,
    average_order_value: 0
  }
  
  raw_data.forEach(order => {
    stats.total_revenue += parseFloat(order.total_amount) || 0

    switch (order.order_status) {
    case 'PAID':
      stats.paid_orders++
      break
    case 'PENDING':
      stats.pending_orders++
      break
    case 'CANCELLED':
      stats.cancelled_orders++
      break
    case 'CONFIRMED':
      stats.confirmed_orders++
      break
    }
  })
  
  if (stats.total_orders > 0) {
    stats.average_order_value = stats.total_revenue / stats.total_orders
  }
  
  return stats
}

/**
 * Get revenue analytics
 * GET /api/v1/analytics/revenue
 */
const getRevenueAnalytics = async (req, res, next) => {
  try {
    const filter = {
      start_date: req.query.start_date,
      end_date: req.query.end_date,
      status: req.query.status
    }
    
    // Validate filter conditions
    if (!validateConditions(filter)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid filter conditions')
    }
    
    // Fetch raw data
    const rawData = await sendQueryRequest(filter)
    
    // Process and calculate statistics
    const statistics = processTheData(rawData)
    
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
 */
const getOrderStatistics = async (req, res, next) => {
  try {
    const filter = {
      start_date: req.query.start_date,
      end_date: req.query.end_date
    }
    
    if (!validateConditions(filter)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid filter conditions')
    }
    
    const rawData = await sendQueryRequest(filter)
    const statistics = processTheData(rawData)
    
    res.status(StatusCodes.OK).json({
      success: true,
      data: statistics
    })
  } catch (error) {
    next(error)
  }
}

export const analyticController = {
  validateConditions,
  sendQueryRequest,
  processTheData,
  getRevenueAnalytics,
  getOrderStatistics
}
