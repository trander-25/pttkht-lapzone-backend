/**
 * CART ROUTES
 */

import express from 'express'
import { cartController } from '../../controllers/cartController'
import { authMiddleware } from '../../middlewares/authMiddleware'

const Router = express.Router()

/**
 * All cart routes require authentication
 */

// GET /api/v1/cart - Get user's cart with all items
Router.get('/',
  authMiddleware.isAuthorized,
  cartController.getCart
)

// POST /api/v1/cart/items - Add product to cart
Router.post('/items',
  authMiddleware.isAuthorized,
  cartController.addItem
)

// PUT /api/v1/cart/items/:product_id - Update item quantity
Router.put('/items/:product_id',
  authMiddleware.isAuthorized,
  cartController.updateItemQuantity
)

// DELETE /api/v1/cart/items/:product_id - Remove item from cart
Router.delete('/items/:product_id',
  authMiddleware.isAuthorized,
  cartController.removeItem
)

// DELETE /api/v1/cart - Clear all items from cart
Router.delete('/',
  authMiddleware.isAuthorized,
  cartController.clearCart
)

export const cartRoute = Router
