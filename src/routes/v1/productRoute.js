/**
 * PRODUCT ROUTES - Public product access
 */

import express from 'express'
import { productController } from '../../controllers/productController'

const Router = express.Router()

/**
 * PUBLIC ROUTES
 */

// GET /api/v1/products - Get all products with pagination
Router.get('/', productController.getAllProducts)

// GET /api/v1/products/search - Search products by keyword
Router.get('/search', productController.searchProducts)

// GET /api/v1/products/:id - Get product details
Router.get('/:id', productController.getProductDetails)

export const productRoute = Router
