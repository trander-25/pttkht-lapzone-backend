import express from 'express'
import { reviewController } from '~/controllers/reviewController'
import { reviewValidation } from '~/validations/reviewValidation'
import { authMiddleware } from '~/middlewares/authMiddleware'
import { rbacMiddleware } from '~/middlewares/rbacMiddleware'
import { userModel } from '~/models/userModel'

const Router = express.Router()

/**
 * @swagger
 * /reviews:
 *   get:
 *     tags:
 *       - Reviews
 *     summary: Get all reviews (Manager/Admin only)
 *     description: Retrieve all reviews with pagination and filtering. Only accessible by Manager and Admin.
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
 *           default: 10
 *           maximum: 50
 *         description: Items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         description: Filter by review status
 *     responses:
 *       200:
 *         description: Reviews retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 reviews:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Review'
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
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *
 *   post:
 *     tags:
 *       - Reviews
 *     summary: Create a review
 *     description: Create a new product review. Requires authentication.
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
 *               - rating
 *               - comment
 *             properties:
 *               productId:
 *                 type: string
 *                 example: '507f1f77bcf86cd799439011'
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 5
 *               comment:
 *                 type: string
 *                 minLength: 5
 *                 maxLength: 1000
 *                 example: 'Great product! Fast delivery and excellent quality.'
 *     responses:
 *       201:
 *         description: Review created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Review'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Product not found
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 */
Router.route('/')
  .get(
    authMiddleware.isAuthorized,
    rbacMiddleware.isValidPermission([userModel.USER_ROLES.MANAGER, userModel.USER_ROLES.ADMIN]),
    reviewValidation.getAllReviews,
    reviewController.getAllReviews
  )
  .post(
    authMiddleware.isAuthorized,
    reviewValidation.createReview,
    reviewController.createReview
  )

/**
 * @swagger
 * /reviews/products/{productId}:
 *   get:
 *     tags:
 *       - Reviews
 *     summary: Get reviews by product ID
 *     description: |
 *       Retrieve reviews for a specific product with pagination and filtering.
 *       Public endpoint - shows only approved reviews by default.
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ObjectId
 *         example: '507f1f77bcf86cd799439011'
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 50
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *           default: approved
 *         description: Filter by review status (default is approved)
 *     responses:
 *       200:
 *         description: Reviews retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 reviews:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Review'
 *                 statistics:
 *                   type: object
 *                   properties:
 *                     averageRating:
 *                       type: number
 *                       example: 4.5
 *                     totalReviews:
 *                       type: integer
 *                       example: 120
 *                     ratingDistribution:
 *                       type: object
 *                       properties:
 *                         5:
 *                           type: integer
 *                           example: 80
 *                         4:
 *                           type: integer
 *                           example: 25
 *                         3:
 *                           type: integer
 *                           example: 10
 *                         2:
 *                           type: integer
 *                           example: 3
 *                         1:
 *                           type: integer
 *                           example: 2
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
 *       400:
 *         description: Invalid product ID
 *       404:
 *         description: Product not found
 */
Router.route('/products/:productId')
  .get(
    reviewValidation.getReviewsByProductId,
    reviewController.getReviewsByProductId
  )

/**
 * @swagger
 * /reviews/{reviewId}:
 *   put:
 *     tags:
 *       - Reviews
 *     summary: Update review (Manager/Admin only)
 *     description: Update review details, mainly status approval. Only accessible by Manager and Admin.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *         description: Review ObjectId
 *         example: '507f1f77bcf86cd799439011'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, approved, rejected]
 *                 description: Update review status
 *               comment:
 *                 type: string
 *                 minLength: 5
 *                 maxLength: 1000
 *                 description: Update comment text
 *           examples:
 *             approveReview:
 *               summary: Approve review
 *               value:
 *                 status: 'approved'
 *             rejectReview:
 *               summary: Reject review
 *               value:
 *                 status: 'rejected'
 *     responses:
 *       200:
 *         description: Review updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Review'
 *       400:
 *         description: Invalid review ID or status
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         description: Review not found
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 *
 *   delete:
 *     tags:
 *       - Reviews
 *     summary: Delete own review
 *     description: Delete user's own review. Users can only delete their own reviews.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *         description: Review ObjectId
 *         example: '507f1f77bcf86cd799439011'
 *     responses:
 *       200:
 *         description: Review deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'Review deleted successfully'
 *       400:
 *         description: Invalid review ID
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: You can only delete your own reviews
 *       404:
 *         description: Review not found
 */
Router.route('/:reviewId')
  .put(
    authMiddleware.isAuthorized,
    rbacMiddleware.isValidPermission([userModel.USER_ROLES.MANAGER, userModel.USER_ROLES.ADMIN]),
    reviewValidation.updateReview,
    reviewController.updateReview
  )
  .delete(
    authMiddleware.isAuthorized,
    reviewValidation.deleteReview,
    reviewController.deleteReview
  )

export const reviewRoute = Router
