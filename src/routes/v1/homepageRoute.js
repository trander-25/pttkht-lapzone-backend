/**
 * HOMEPAGE ROUTE - HOMEPAGE CONFIGURATION MANAGEMENT
 *
 * This module provides API endpoints for:
 * - Get homepage configuration (public)
 * - Update sections and banners (Manager/Admin only)
 * - Upload banner images (Manager/Admin only)
 *
 * @module routes/v1/homepageRoute
 */

import express from 'express'
import { homepageController } from '~/controllers/homepageController'
import { authMiddleware } from '~/middlewares/authMiddleware'
import { rbacMiddleware } from '~/middlewares/rbacMiddleware'
import { homepageValidation } from '~/validations/homepageValidation'
import { multerUploadMiddleware } from '~/middlewares/multerUploadMiddleware'
import { userModel } from '~/models/userModel'

const Router = express.Router()

/**
 * @swagger
 * /api/v1/homepage:
 *   get:
 *     summary: Get homepage configuration
 *     description: |
 *       Public API - Get complete homepage display configuration including:
 *       - List of sections (product areas)
 *       - List of banners (carousel)
 *       - Last update information
 *     tags:
 *       - Homepage
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sections:
 *                   type: array
 *                   description: List of sections displayed on homepage
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "flash-sale-section"
 *                       title:
 *                         type: string
 *                         example: "Flash Sale"
 *                       subtitle:
 *                         type: string
 *                         example: "Hot deals in 24h"
 *                       visible:
 *                         type: boolean
 *                         example: true
 *                       order:
 *                         type: number
 *                         example: 1
 *                       products:
 *                         type: array
 *                         description: List of products in section
 *                         items:
 *                           type: object
 *                 banners:
 *                   type: array
 *                   description: List of carousel banners
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       image:
 *                         type: string
 *                         format: uri
 *                       title:
 *                         type: string
 *                       link:
 *                         type: string
 *                       order:
 *                         type: number
 *                 updatedAt:
 *                   type: number
 *                   description: Last update timestamp (milliseconds)
 *                 updatedBy:
 *                   type: object
 *                   description: Information about who updated
 *                 lastUpdateNote:
 *                   type: string
 *                   description: Last change note
 */
Router.get('/', homepageController.getConfig)

/**
 * @swagger
 * /api/v1/homepage/sections:
 *   put:
 *     summary: Update homepage configuration (Manager/Admin only)
 *     description: |
 *       Admin API - Replace entire homepage sections and banners configuration.
 *       Only accessible by Manager and Admin.
 *
 *       ⚠️ Important:
 *       - This API REPLACES everything, does not merge with old data
 *       - Must provide all sections you want to display
 *       - Banners are optional (omit to keep old banners)
 *       - Only product slugs are stored, detailed info is fetched on GET
 *     tags:
 *       - Homepage
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sections
 *             properties:
 *               sections:
 *                 type: array
 *                 description: List of sections (required)
 *                 items:
 *                   type: object
 *                   required:
 *                     - id
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: Unique section ID
 *                       example: "flash-sale"
 *                     title:
 *                       type: string
 *                       description: Section title
 *                       example: "Flash Sale Today"
 *                     subtitle:
 *                       type: string
 *                       description: Section subtitle
 *                       example: "Up to 50% off"
 *                     subtitleBackgroundColor:
 *                       type: string
 *                       description: Subtitle background color (hex/rgb)
 *                       example: "#FF0000"
 *                     subtitleTextColor:
 *                       type: string
 *                       description: Subtitle text color
 *                       example: "#FFFFFF"
 *                     tag:
 *                       type: string
 *                       description: Display tag (HOT, NEW, etc.)
 *                       example: "HOT"
 *                     visible:
 *                       type: boolean
 *                       description: Whether to display this section
 *                       default: true
 *                     order:
 *                       type: number
 *                       description: Display order (automatically sorted)
 *                       example: 1
 *                     backgroundColor:
 *                       type: string
 *                       description: Section background color
 *                     textColor:
 *                       type: string
 *                       description: Section text color
 *                     filterLinks:
 *                       type: array
 *                       description: List of filter/navigation links
 *                       items:
 *                         type: string
 *                       example: ["/laptop", "/gaming", "/ultrabook"]
 *                     products:
 *                       type: array
 *                       description: List of products (slug only)
 *                       items:
 *                         type: object
 *                         required:
 *                           - slug
 *                         properties:
 *                           slug:
 *                             type: string
 *                             description: Product slug
 *                             example: "laptop-dell-xps-13"
 *                     hasCountdown:
 *                       type: boolean
 *                       description: Whether countdown timer is enabled (for flash sales)
 *                       default: false
 *                     countdownStart:
 *                       type: string
 *                       format: date-time
 *                       description: Countdown start time
 *                     countdownEnd:
 *                       type: string
 *                       format: date-time
 *                       description: Countdown end time
 *               banners:
 *                 type: array
 *                 description: List of banners (optional, omit to keep existing)
 *                 items:
 *                   type: object
 *                   required:
 *                     - id
 *                     - image
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: Unique banner ID
 *                       example: "banner-1"
 *                     image:
 *                       type: string
 *                       format: uri
 *                       description: Banner image URL
 *                       example: "https://res.cloudinary.com/..."
 *                     title:
 *                       type: string
 *                       description: Banner title
 *                       example: "50% Off Gaming Laptops"
 *                     link:
 *                       type: string
 *                       description: Target link when clicking banner
 *                       example: "/collections/gaming-laptop"
 *                     order:
 *                       type: number
 *                       description: Display order
 *                       example: 1
 *                     visible:
 *                       type: boolean
 *                       description: Whether to display banner
 *                       default: true
 *               metadata:
 *                 type: object
 *                 description: Change metadata
 *                 properties:
 *                   note:
 *                     type: string
 *                     description: Note about this change
 *                     example: "Update Black Friday Flash Sale"
 *     responses:
 *       200:
 *         description: Update successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sections:
 *                   type: array
 *                 banners:
 *                   type: array
 *                 updatedAt:
 *                   type: number
 *                 updatedBy:
 *                   type: object
 *                 lastUpdateNote:
 *                   type: string
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Forbidden (requires admin/manager role)
 *       422:
 *         description: Validation error
 */
Router.put(
  '/sections',
  authMiddleware.isAuthorized,
  rbacMiddleware.isValidPermission([userModel.USER_ROLES.ADMIN, userModel.USER_ROLES.MANAGER]),
  homepageValidation.updateSections,
  homepageController.updateSections
)

/**
 * @swagger
 * /api/v1/homepage/upload-banner:
 *   post:
 *     summary: Upload banner image (Manager/Admin only)
 *     description: |
 *       Admin API - Upload banner image to Cloudinary.
 *       Only accessible by Manager and Admin.
 *
 *       Workflow:
 *       1. Upload image via this API → receive URL
 *       2. Use that URL in body when PUT /sections
 *
 *       File requirements:
 *       - Format: JPG, PNG, WebP
 *       - Max size: 10MB (configured in Multer)
 *       - Folder: banners (on Cloudinary)
 *     tags:
 *       - Homepage
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Banner image file
 *     responses:
 *       200:
 *         description: Upload successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 imageUrl:
 *                   type: string
 *                   format: uri
 *                   description: URL of uploaded image
 *                   example: "https://res.cloudinary.com/demo/image/upload/v1234567890/banners/abc123.jpg"
 *       400:
 *         description: Missing file or invalid file
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Forbidden (requires admin/manager role)
 */
Router.post(
  '/upload-banner',
  authMiddleware.isAuthorized,
  rbacMiddleware.isValidPermission([userModel.USER_ROLES.ADMIN, userModel.USER_ROLES.MANAGER]),
  multerUploadMiddleware.upload.single('image'),
  homepageController.uploadBannerImage
)

export const homepageRoute = Router

