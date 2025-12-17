/**
 * CART CONTROLLER
 * Handles cart and cart items operations
 */

import { StatusCodes } from 'http-status-codes'
import { cartService } from '../services/cartService'
import { cartItemService } from '../services/cartItemService'
import ApiError from '../utils/ApiError'

/**
 * Get user's cart with all items
 * GET /api/v1/cart
 */
const getUserCart = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded.user_id
    
    // Get or create cart
    const cart = await cartService.getCart(userId)
    
    // Get all items in cart
    const items = await cartItemService.getCartItems(cart.cart_id)
    
    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        cart,
        items
      }
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Add product to cart
 * POST /api/v1/cart/items
 */
const addItemToCart = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded.user_id
    const { product_id, quantity } = req.body
    
    if (!product_id) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Product ID is required')
    }
    
    // Get or create cart
    const cart = await cartService.getCart(userId)
    
    // Check if item already exists
    const exists = await cartItemService.checkItemExists(cart.cart_id, product_id)
    
    if (exists) {
      // Update quantity
      const result = await cartItemService.updateItemQuantity({
        cart_id: cart.cart_id,
        product_id,
        quantity: quantity || 1
      })
      
      res.status(StatusCodes.OK).json({
        success: result,
        message: 'Cart item quantity updated'
      })
    } else {
      // Insert new item
      const result = await cartItemService.insertCartItem({
        cart_id: cart.cart_id,
        product_id,
        quantity: quantity || 1
      })
      
      res.status(StatusCodes.CREATED).json({
        success: result,
        message: 'Product added to cart'
      })
    }
  } catch (error) {
    next(error)
  }
}

/**
 * Update item quantity in cart
 * PUT /api/v1/cart/items/:product_id
 */
const updateCartItemQuantity = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded.user_id
    const { product_id } = req.params
    const { quantity } = req.body
    
    if (!quantity || quantity < 1) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Valid quantity is required')
    }
    
    // Get cart
    const cart = await cartService.getCart(userId)
    
    // Update quantity
    const result = await cartItemService.updateItemQuantity({
      cart_id: cart.cart_id,
      product_id: parseInt(product_id),
      quantity
    })
    
    res.status(StatusCodes.OK).json({
      success: result,
      message: 'Cart item quantity updated'
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Remove item from cart
 * DELETE /api/v1/cart/items/:product_id
 */
const removeItemFromCart = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded.user_id
    const { product_id } = req.params
    
    // Get cart
    const cart = await cartService.getCart(userId)
    
    // Delete item
    const result = await cartItemService.deleteCartItem({
      cart_id: cart.cart_id,
      product_id: parseInt(product_id)
    })
    
    res.status(StatusCodes.OK).json({
      success: result,
      message: 'Product removed from cart'
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Clear all items from cart
 * DELETE /api/v1/cart
 */
const clearCart = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded.user_id
    
    // Get cart
    const cart = await cartService.getCart(userId)
    
    // Get all items
    const items = await cartItemService.getCartItems(cart.cart_id)
    
    // Delete all items
    for (const item of items) {
      await cartItemService.deleteCartItem({
        cart_id: cart.cart_id,
        product_id: item.product_id
      })
    }
    
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Cart cleared successfully'
    })
  } catch (error) {
    next(error)
  }
}

export const cartController = {
  getUserCart,
  addItemToCart,
  updateCartItemQuantity,
  removeItemFromCart,
  clearCart
}
