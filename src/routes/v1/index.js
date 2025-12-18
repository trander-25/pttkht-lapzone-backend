import express from 'express'
import { StatusCodes } from 'http-status-codes'
import { authRoute } from './authRoute'
import { productRoute } from './productRoute'
import { cartRoute } from './cartRoute'
import { orderRoute } from './orderRoute'
import { analyticRoute } from './analyticRoute'
import { paymentRoute } from './paymentRoute'
import { manageOrderRoute } from './manageOrderRoute'
import { manageProductRoute } from './manageProductRoute'
import { manageUserRoute } from './manageUserRoute'

const Router = express.Router()

Router.get('/status', (req, res) => {
  res.status(StatusCodes.OK).json({ message: 'APIs V1 are ready to use' })
})

// Auth APIs
Router.use('/auth', authRoute)

// Product APIs
Router.use('/products', productRoute)

// Cart APIs
Router.use('/cart', cartRoute)

// Order APIs
Router.use('/orders', orderRoute)

// Payment APIs
Router.use('/payment', paymentRoute)

// Analytics APIs
Router.use('/analytics', analyticRoute)

// Admin - Manage Order APIs
Router.use('/manage/orders', manageOrderRoute)

// Admin - Manage Product APIs
Router.use('/manage/products', manageProductRoute)

// Admin - Manage User APIs
Router.use('/manage/users', manageUserRoute)

export const APIs_V1 = Router