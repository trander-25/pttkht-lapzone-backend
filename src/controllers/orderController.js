/**
 * ORDER CONTROLLER
 * Handles order operations for customers
 */

import { StatusCodes } from 'http-status-codes'
import { orderService } from '../services/orderService'
import { paymentService } from '../services/paymentService'
import { productService } from '../services/productService'
import { voucherService } from '../services/voucherService'
import { userService } from '../services/userService'
import ApiError from '../utils/ApiError'
import { env } from '../config/environment.js'

/**
 * Preview checkout without saving to database
 * POST /api/v1/orders/checkout
 * @body {Array} items - [{ product_id, quantity }]
 */
const checkoutPreview = async (req, res, next) => {
  try {
    const { items, voucher_code } = req.body
    
    if (!items || items.length === 0) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'No items provided')
    }
    
    // Fetch products with details
    const checkoutItems = []
    
    for (const item of items) {
      const productResult = await productService.getProduct(item.product_id)
      const product = productResult.product
      
      if (product.stock < item.quantity) {
        throw new ApiError(StatusCodes.BAD_REQUEST, `Insufficient stock for ${product.product_name}`)
      }
      
      checkoutItems.push({
        product_id: product.product_id,
        quantity: item.quantity,
        product: product
      })
    }
    
    // Calculate totals and format response
    let totalAmount = 0
    const orderPreview = {
      items: [],
      summary: {}
    }
    
    for (const item of checkoutItems) {
      const product = item.product
      const itemTotal = parseFloat(product.price) * item.quantity
      totalAmount += itemTotal
      
      orderPreview.items.push({
        product_id: product.product_id,
        product_name: product.product_name,
        brand: product.brand,
        price: product.price,
        quantity: item.quantity,
        item_total: itemTotal,
        image: product.image,
        warranty_month: product.warranty_month,
        cpu: product.cpu,
        ram: product.ram,
        storage: product.storage,
        gpu: product.gpu,
        screen: product.screen,
        weight: product.weight,
        battery: product.battery
      })
    }
    
    // Apply voucher if provided
    let discount = 0
    let voucherInfo = null
    
    if (voucher_code) {
      const voucher = await voucherService.getVoucherByCode(voucher_code)
      voucherService.validateVoucher(voucher)
      discount = voucherService.calculateDiscount(voucher, totalAmount)
      
      voucherInfo = {
        code: voucher.code,
        discount_percentage: voucher.discount_value,
        max_discount: voucher.max_discount,
        discount_applied: discount
      }
    }
    
    orderPreview.summary = {
      subtotal: totalAmount,
      discount: discount,
      total: totalAmount - discount,
      voucher: voucherInfo
    }
    
    res.status(StatusCodes.OK).json({
      success: true,
      preview: orderPreview
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Create new order
 * POST /api/v1/orders
 * @body {Array} items - [{ product_id, quantity }]
 * @body {string} receiver_name - Recipient name
 * @body {string} phone - Contact phone
 * @body {string} shipment_address - Delivery address
 * @body {string} payment_method - 'COD' or 'MOMO'
 */
const createOrder = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded.user_id
    const { items, receiver_name, phone, shipment_address, payment_method, voucher_code } = req.body
    
    // Validate input
    if (!items || items.length === 0) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'No items provided')
    }
    
    if (!receiver_name || !phone || !shipment_address) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Missing required shipping information')
    }
    
    if (!payment_method || !['COD', 'MOMO'].includes(payment_method)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid payment method. Must be COD or MOMO')
    }
    
    // Fetch products and validate stock
    let totalAmount = 0
    const orderItems = []
    
    for (const item of items) {
      const stockCheck = await productService.checkStock(item.product_id, item.quantity)
      
      if (!stockCheck.available) {
        throw new ApiError(StatusCodes.BAD_REQUEST, `Insufficient stock for product ${item.product_id}. Available: ${stockCheck.availableStock}`)
      }
      
      const price = parseFloat(stockCheck.product.price)
      totalAmount += price * item.quantity
      
      orderItems.push({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: price
      })
    }
    
    // Apply voucher if provided
    let voucherId = null
    let discount = 0
    
    if (voucher_code) {
      const voucher = await voucherService.getVoucherByCode(voucher_code)
      voucherService.validateVoucher(voucher)
      discount = voucherService.calculateDiscount(voucher, totalAmount)
      voucherId = voucher.voucher_id
    }
    
    const finalAmount = totalAmount - discount

    // Create order
    const newOrder = await orderService.insertOrder({
      user_id: userId,
      receiver_name,
      phone,
      shipment_address,
      total_amount: finalAmount,
      order_status: 'PENDING',
      order_date: new Date(),
      voucher_id: voucherId
    })
    
    if (newOrder) {
      // Insert order items
      const itemsWithOrderId = orderItems.map(item => ({
        ...item,
        order_id: newOrder.order_id
      }))
      
      await orderService.insertOrderItems(itemsWithOrderId)
      
      // Decrease product stock
      for (const item of orderItems) {
        await productService.decrementStock(item.product_id, item.quantity)
      }
      
      // Increment voucher usage count if voucher was used
      if (voucherId) {
        await voucherService.incrementUsageCount(voucherId)
      }
      
      // Create payment record
      await paymentService.insertPayment({
        order_id: newOrder.order_id,
        method: payment_method,
        amount: finalAmount,
        payment_status: 'PENDING'
      })
      
      // If payment method is MOMO, create payment URL
      if (payment_method === 'MOMO') {
        try {
          const momoResponse = await paymentService.createMoMoPayment({
            orderId: `ORDER_${newOrder.order_id}`,
            orderInfo: `Thanh toán đơn hàng #${newOrder.order_id}`,
            amount: finalAmount,
            redirectUrl: `${env.FRONTEND_URL || 'http://localhost:5173'}/payment/result`,
            ipnUrl: `${env.WEBSITE_DOMAIN_DEVELOPMENT}/api/v1/payment/momo/callback`
          })
          
          // Update payment record with payment URL
          await paymentService.updatePayment(newOrder.order_id, {
            payment_url: momoResponse.payUrl
          })
          
          return res.status(StatusCodes.CREATED).json({
            success: true,
            message: 'Order created successfully',
            data: {
              order_id: newOrder.order_id,
              subtotal: totalAmount,
              discount: discount,
              total_amount: finalAmount,
              payment_method,
              payment_url: momoResponse.payUrl,
              qr_code_url: momoResponse.qrCodeUrl,
              voucher_code: voucher_code || null
            }
          })
        } catch (momoError) {
          // If MoMo payment creation fails, still return success but without payment URL
          return res.status(StatusCodes.CREATED).json({
            success: true,
            message: 'Order created but payment URL generation failed',
            data: {
              order_id: newOrder.order_id,
              subtotal: totalAmount,
              discount: discount,
              total_amount: finalAmount,
              payment_method,
              voucher_code: voucher_code || null,
              error: momoError.message
            }
          })
        }
      }
      
      // For COD payment
      res.status(StatusCodes.CREATED).json({
        success: true,
        message: 'Order created successfully',
        data: {
          order_id: newOrder.order_id,
          subtotal: totalAmount,
          discount: discount,
          total_amount: finalAmount,
          payment_method,
          voucher_code: voucher_code || null
        }
      })
    }
  } catch (error) {
    next(error)
  }
}

/**
 * Get user's order history
 * GET /api/v1/orders?page=1&limit=10&status=PENDING
 * @query {number} page - Page number (default: 1)
 * @query {number} limit - Items per page (default: 10, max: 50)
 * @query {string} status - Order status filter (PENDING, CONFIRMED, SHIPPING, COMPLETED, CANCELLED)
 */
const getUserOrders = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded.user_id
    const page = parseInt(req.query.page) || 1
    const limit = Math.min(parseInt(req.query.limit) || 10, 50)
    const status = req.query.status || null
    
    // Validate status if provided
    const validStatuses = ['PENDING', 'CONFIRMED', 'SHIPPING', 'COMPLETED', 'CANCELLED']
    if (status && !validStatuses.includes(status)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid order status')
    }
    
    const result = await orderService.getOrders(userId, page, limit, status)
    
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
    const items = await orderService.getOrderItems(parseInt(order_id))
    
    // Get payment information
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
 * Cancel order (customer can only cancel PENDING and CONFIRMED orders)
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
    
    // Only allow canceling PENDING and CONFIRMED orders
    if (order.order_status !== 'PENDING' && order.order_status !== 'CONFIRMED') {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Can only cancel pending or confirmed orders')
    }
    
    // Restore product stock
    const items = await orderService.getOrderItems(parseInt(order_id))
    for (const item of items) {
      await productService.incrementStock(item.product_id, item.quantity)
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
  checkoutPreview,
  createOrder,
  getUserOrders,
  getOrderDetails,
  cancelOrder
}
