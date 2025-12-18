/**
 * CART ITEM SERVICE - Business Logic Layer
 * Implements exact functions from CartItems entity specification
 */

import { CartItem, Product, Brand, ProductDetail } from '../models/index'
import ApiError from '../utils/ApiError'
import { StatusCodes } from 'http-status-codes'

/**
 * Gets all products in the cart
 * @param {number} cart_id - Cart ID
 * @returns {Promise<Array>} - List of cart items with product details
 */
const getCartItems = async (cart_id) => {
  try {
    const items = await CartItem.findAll({
      where: { cart_id },
      include: [
        {
          model: Product,
          as: 'product',
          include: [
            { 
              model: Brand, 
              as: 'brand',
              attributes: ['brand_name']
            }
          ]
        }
      ]
    })

    // Flatten brand data
    const formattedItems = items.map(item => {
      const itemData = item.toJSON()
      if (itemData.product) {
        const { brand, ...productRest } = itemData.product
        itemData.product = {
          ...productRest,
          brand_name: brand?.brand_name || null
        }
      }
      return itemData
    })

    return formattedItems
  } catch (error) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error getting cart items')
  }
}

/**
 * Checks if product is already in cart
 * @param {number} cart_id - Cart ID
 * @param {number} product_id - Product ID
 * @returns {Promise<Boolean>} - True if exists, false otherwise
 */
const checkItemExists = async (cart_id, product_id) => {
  try {
    const item = await CartItem.findOne({
      where: { cart_id, product_id }
    })
    
    return !!item
  } catch (error) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error checking item existence')
  }
}

/**
 * Adds a product to the cart
 * @param {Object} item - Cart item data { cart_id, product_id, quantity }
 * @returns {Promise<Boolean>} - True if successful
 */
const insertCartItem = async (item) => {
  try {
    await CartItem.create({
      cart_id: item.cart_id,
      product_id: item.product_id,
      quantity: item.quantity || 1
    })
    
    return true
  } catch (error) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error inserting cart item')
  }
}

/**
 * Changes the quantity of a product
 * @param {Object} item - Cart item data { cart_id, product_id, quantity }
 * @returns {Promise<Boolean>} - True if successful
 */
const updateItemQuantity = async (item) => {
  try {
    const [updated] = await CartItem.update(
      { quantity: item.quantity },
      { where: { cart_id: item.cart_id, product_id: item.product_id } }
    )
    
    return updated > 0
  } catch (error) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error updating item quantity')
  }
}

/**
 * Removes a product from the cart
 * @param {Object} item - Cart item data { cart_id, product_id }
 * @returns {Promise<Boolean>} - True if successful
 */
const deleteCartItem = async (item) => {
  try {
    const deleted = await CartItem.destroy({
      where: { cart_id: item.cart_id, product_id: item.product_id }
    })
    
    return deleted > 0
  } catch (error) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error deleting cart item')
  }
}

export const cartItemService = {
  getCartItems,
  checkItemExists,
  insertCartItem,
  updateItemQuantity,
  deleteCartItem
}
