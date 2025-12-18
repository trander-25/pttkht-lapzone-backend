/**
 * PAYMENT ROUTES
 */

import express from 'express'
import { paymentController } from '../../controllers/paymentController'

const Router = express.Router()

/**
 * MOMO PAYMENT CALLBACK
 * No authentication required - this is called by MoMo server
 */

// POST /api/v1/payment/momo/callback - MoMo IPN callback
Router.post('/momo/callback',
  paymentController.handleMoMoCallback
)

export const paymentRoute = Router
