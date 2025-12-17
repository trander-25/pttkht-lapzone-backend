/**
 * PAYMENT ROUTES
 */

import express from 'express'
import { paymentController } from '../../controllers/paymentController'
import { authMiddleware } from '../../middlewares/authMiddleware'

const Router = express.Router()

/**
 * MOMO PAYMENT ROUTES
 */

// POST /api/v1/payments/momo - Create MoMo payment
Router.post('/momo',
  authMiddleware.isAuthorized,
  paymentController.createMoMoPayment
)

// POST /api/v1/payments/momo/notify - MoMo callback (no auth required)
Router.post('/momo/notify',
  paymentController.momoNotify
)

/**
 * COD PAYMENT ROUTES
 */

// POST /api/v1/payments/cod - Create COD payment
Router.post('/cod',
  authMiddleware.isAuthorized,
  paymentController.createCODPayment
)

/**
 * PAYMENT STATUS ROUTES
 */

// GET /api/v1/payments/order/:order_id - Get payment status
Router.get('/order/:order_id',
  authMiddleware.isAuthorized,
  paymentController.getPaymentStatus
)

export const paymentRoute = Router
