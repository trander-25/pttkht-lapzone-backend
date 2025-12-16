import express from 'express'
import { StatusCodes } from 'http-status-codes'
import { userRoute } from './userRoute'
import { authRoute } from './authRoute'
import { productRoute } from './productRoute'
import { cartRoute } from './cartRoute'
import { locationRoute } from './locationRoute'
import { orderRoute } from './orderRoute'
import { reviewRoute } from './reviewRoute'
import { wishlistRoute } from './wishlistRoute'
import { chatRoute } from './chatRoute'
import { homepageRoute } from './homepageRoute'

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

// Location APIs
Router.use('/locations', locationRoute)

// Order APIs
Router.use('/orders', orderRoute)

// Review APIs
Router.use('/reviews', reviewRoute)

// Wishlist APIs
Router.use('/wishlist', wishlistRoute)

// Chat APIs
Router.use('/chats', chatRoute)

// Homepage APIs
Router.use('/homepage', homepageRoute)

export const APIs_V1 = Router