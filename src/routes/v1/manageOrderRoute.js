/**
 * MANAGE ORDER ROUTES - Admin order management
 */

import express from 'express'
import { manageOrderController } from '../../controllers/manageOrderController'
import { authMiddleware } from '../../middlewares/authMiddleware'
import { rbacMiddleware } from '../../middlewares/rbacMiddleware'

const Router = express.Router()

/**
 * All manage order routes require authentication and admin role
 */
Router.use(authMiddleware.isAuthorized)
Router.use(rbacMiddleware.isValidPermission(['ADMIN']))

// GET /api/v1/manage/orders - Get all orders
Router.get('/', manageOrderController.getAllOrders)

// GET /api/v1/manage/orders/search?keyword=xxx - Search orders
Router.get('/search', manageOrderController.searchOrders)

// GET /api/v1/manage/orders/:order_id - Get order details
Router.get('/:order_id', manageOrderController.getOrderDetails)

// PUT /api/v1/manage/orders/:order_id - Update order information
Router.put('/:order_id', manageOrderController.updateOrder)

export const manageOrderRoute = Router
