/**
 * CART SERVICE - Business Logic Layer
 * Implements exact functions from Cart entity specification
 */

import { Cart, CartItem, Product } from '../models/index'
import ApiError from '../utils/ApiError'
import { StatusCodes } from 'http-status-codes'

/**
 * Gets the user's cart info
 * @param {number} user_id - User ID
 * @returns {Promise<Object>} - Cart object
 */
const getCart = async (user_id) => {
  try {
    let cart = await Cart.findOne({
      where: { user_id }
    })
    
    // If cart doesn't exist, create one
    if (!cart) {
      cart = await Cart.create({ user_id })
    }
    
    return cart
  } catch (error) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error getting cart')
  }
}

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
          as: 'product'
        }
      ]
    })

    return items.map(item => item.toJSON())
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

export const cartService = {
  getCart,
  getCartItems,
  checkItemExists,
  insertCartItem,
  updateItemQuantity,
  deleteCartItem
}
