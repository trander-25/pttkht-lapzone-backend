/**
 * CART SERVICE - Business Logic Layer
 * Implements exact functions from Cart entity specification
 */

import { Cart } from '../models/index'
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

export const cartService = {
  getCart
}
