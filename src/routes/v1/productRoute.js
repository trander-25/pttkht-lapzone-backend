/**
 * PRODUCT ROUTES - Public product access
 */

import express from 'express'
import { productController } from '../../controllers/productController'

const Router = express.Router()

/**
 * PUBLIC ROUTES
 */

// GET /api/v1/products - Get all products
Router.get('/', productController.getAllProducts)

// GET /api/v1/products/search - Search products
Router.get('/search', productController.processSearchRequest)

// GET /api/v1/products/:id - Get product details
Router.get('/:id', productController.processProductDetailsRequest)

export const productRoute = Router
