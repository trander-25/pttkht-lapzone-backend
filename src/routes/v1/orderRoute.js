/**
 * ORDER ROUTES - Customer order operations
 */

import express from 'express'
import { orderController } from '../../controllers/orderController'
import { authMiddleware } from '../../middlewares/authMiddleware'

const Router = express.Router()

/**
 * All order routes require authentication
 */

// POST /api/v1/orders/checkout - Preview checkout (no DB save)
Router.post('/checkout',
  authMiddleware.isAuthorized,
  orderController.checkoutPreview
)

// POST /api/v1/orders - Create new order from cart
Router.post('/',
  authMiddleware.isAuthorized,
  orderController.createOrder
)

// GET /api/v1/orders - Get user's order history
Router.get('/',
  authMiddleware.isAuthorized,
  orderController.getUserOrders
)

// GET /api/v1/orders/:order_id - Get order details
Router.get('/:order_id',
  authMiddleware.isAuthorized,
  orderController.getOrderDetails
)

// PUT /api/v1/orders/:order_id/cancel - Cancel order
Router.put('/:order_id/cancel',
  authMiddleware.isAuthorized,
  orderController.cancelOrder
)

export const orderRoute = Router
