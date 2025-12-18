/**
 * MANAGE PRODUCT ROUTES - Admin product management
 */

import express from 'express'
import { manageProductController } from '../../controllers/manageProductController'
import { authMiddleware } from '../../middlewares/authMiddleware'
import { rbacMiddleware } from '../../middlewares/rbacMiddleware'
import { multerUploadMiddleware } from '../../middlewares/multerUploadMiddleware'

const Router = express.Router()

/**
 * All manage product routes require authentication and admin role
 */
Router.use(authMiddleware.isAuthorized)
Router.use(rbacMiddleware.isValidPermission(['ADMIN']))

// GET /api/v1/manage/products - Get all products (including hidden)
Router.get('/', manageProductController.getAllProducts)

// GET /api/v1/manage/products/search - Search products
Router.get('/search', manageProductController.searchProducts)

// GET /api/v1/manage/products/:product_id - Get product details
Router.get('/:product_id', manageProductController.getProductDetails)

// POST /api/v1/manage/products - Create new product
Router.post('/', 
  multerUploadMiddleware.upload.single('image'),
  manageProductController.createProduct
)

// PUT /api/v1/manage/products/:product_id - Update product
Router.put('/:product_id', 
  multerUploadMiddleware.upload.single('image'),
  manageProductController.updateProduct
)

// DELETE /api/v1/manage/products/:product_id - Delete product (soft delete)
Router.delete('/:product_id', manageProductController.deleteProduct)

export const manageProductRoute = Router
