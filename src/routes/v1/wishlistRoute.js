import express from 'express'
import { wishlistController } from '~/controllers/wishlistController'
import { wishlistValidation } from '~/validations/wishlistValidation'
import { authMiddleware } from '~/middlewares/authMiddleware'

const Router = express.Router()

// All wishlist routes require authentication
Router.use(authMiddleware.isAuthorized)

/**
 * @swagger
 * /wishlist:
 *   get:
 *     tags:
 *       - Wishlist
 *     summary: Get user's wishlist
 *     description: Retrieve authenticated user's wishlist with pagination
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 12
 *           maximum: 50
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Wishlist retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       productId:
 *                         type: string
 *                         example: '507f1f77bcf86cd799439011'
 *                       name:
 *                         type: string
 *                         example: 'Laptop Dell XPS 13'
 *                       slug:
 *                         type: string
 *                         example: 'laptop-dell-xps-13'
 *                       price:
 *                         type: number
 *                         example: 25000000
 *                       image:
 *                         type: string
 *                         example: 'https://cloudinary.com/image.jpg'
 *                       addedAt:
 *                         type: number
 *                         example: 1700000000000
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     totalItems:
 *                       type: integer
 *                     hasNextPage:
 *                       type: boolean
 *                     hasPrevPage:
 *                       type: boolean
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *
 *   post:
 *     tags:
 *       - Wishlist
 *     summary: Add product to wishlist
 *     description: Add a product to authenticated user's wishlist
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *             properties:
 *               productId:
 *                 type: string
 *                 description: Product ObjectId to add
 *                 example: '507f1f77bcf86cd799439011'
 *     responses:
 *       201:
 *         description: Product added to wishlist successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userId:
 *                   type: string
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                 updatedAt:
 *                   type: number
 *       400:
 *         description: Product already in wishlist or invalid product ID
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Product not found
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 *
 *   delete:
 *     tags:
 *       - Wishlist
 *     summary: Remove multiple products or clear wishlist
 *     description: |
 *       Remove specific products from wishlist or clear entire wishlist.
 *       If productIds array is empty or not provided, entire wishlist will be cleared.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               productIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of product IDs to remove (empty array or omit to clear all)
 *           examples:
 *             removeMultiple:
 *               summary: Remove specific products
 *               value:
 *                 productIds: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012']
 *             clearAll:
 *               summary: Clear entire wishlist
 *               value:
 *                 productIds: []
 *     responses:
 *       200:
 *         description: Products removed or wishlist cleared successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userId:
 *                   type: string
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                 updatedAt:
 *                   type: number
 *       400:
 *         description: One or more product IDs are invalid
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
Router.route('/')
  .get(wishlistController.getWishlist)
  .post(
    wishlistValidation.addToWishlist,
    wishlistController.addToWishlist
  )
  .delete(
    wishlistValidation.removeMultipleFromWishlist,
    wishlistController.removeMultipleFromWishlist
  )

/**
 * @swagger
 * /wishlist/{productId}:
 *   delete:
 *     tags:
 *       - Wishlist
 *     summary: Remove single product from wishlist
 *     description: Remove a specific product from authenticated user's wishlist
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ObjectId to remove
 *         example: '507f1f77bcf86cd799439011'
 *     responses:
 *       200:
 *         description: Product removed from wishlist successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userId:
 *                   type: string
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                 updatedAt:
 *                   type: number
 *       400:
 *         description: Invalid product ID
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Product not found in wishlist
 */
Router.route('/:productId')
  .delete(
    wishlistValidation.removeFromWishlist,
    wishlistController.removeFromWishlist
  )

export const wishlistRoute = Router
