/**
 * ORDER ITEM SERVICE - Business Logic Layer
 * Implements exact functions from OrderItems entity specification
 */

import { OrderItem, Product, Brand, ProductDetail } from '../models/index'
import ApiError from '../utils/ApiError'
import { StatusCodes } from 'http-status-codes'

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
          as: 'product',
          include: [
            { model: Brand, as: 'brand' },
            { model: ProductDetail, as: 'details' }
          ]
        }
      ]
    })
    
    return items
  } catch (error) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error getting order items')
  }
}

export const orderItemService = {
  insertOrderItems,
  getOrderItems
}
