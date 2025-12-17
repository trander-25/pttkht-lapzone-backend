import express from 'express'
import { StatusCodes } from 'http-status-codes'
import { userRoute } from './userRoute'
import { authRoute } from './authRoute'
import { productRoute } from './productRoute'
import { cartRoute } from './cartRoute'
import { orderRoute } from './orderRoute'
import { wishlistRoute } from './wishlistRoute'

const Router = express.Router()

Router.get('/status', (req, res) => {
  res.status(StatusCodes.OK).json({ message: 'APIs V1 are ready to use' })
})

// Auth APIs
Router.use('/auth', authRoute)

// User APIs
Router.use('/users', userRoute)

// Product APIs
Router.use('/products', productRoute)

// Cart APIs
Router.use('/cart', cartRoute)

// Order APIs
Router.use('/orders', orderRoute)

// Wishlist APIs
Router.use('/wishlist', wishlistRoute)

export const APIs_V1 = Router