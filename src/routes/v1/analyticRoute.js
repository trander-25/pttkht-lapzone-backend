import express from 'express'
import { analyticController } from '../../controllers/analyticController'
import { authMiddleware } from '../../middlewares/authMiddleware'
import { rbacMiddleware } from '../../middlewares/rbacMiddleware'

const Router = express.Router()

// All analytic routes require authentication and admin role
Router.use(authMiddleware.isAuthorized)
Router.use(rbacMiddleware.isValidPermission(['ADMIN']))

/**
 * GET /api/v1/analytics/revenue
 * Get revenue analytics with filters
 * Query params: start_date, end_date, status
 */
Router.get('/revenue', analyticController.getRevenueAnalytics)

/**
 * GET /api/v1/analytics/orders
 * Get order statistics by date range
 * Query params: start_date, end_date
 */
Router.get('/orders', analyticController.getOrderStatistics)

export const analyticRoute = Router
