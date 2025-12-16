import express from 'express'
import { productValidation } from '~/validations/productValidation'
import { productController } from '~/controllers/productController'
import { authMiddleware } from '~/middlewares/authMiddleware'
import { rbacMiddleware } from '~/middlewares/rbacMiddleware'
import { multerUploadMiddleware } from '~/middlewares/multerUploadMiddleware'
import { userModel } from '~/models/userModel'

const Router = express.Router()

/**
 * @swagger
 * /products:
 *   get:
 *     tags:
 *       - Products
 *     summary: Get all products with pagination and filters
 *     description: |
 *       Retrieve paginated list of products with extensive filtering options.
 *       Supports filtering by category, brand, price range, specs, and more.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number (starts from 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 12
 *           maximum: 100
 *         description: Number of items per page
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [laptop, mouse, headphone, keyboard, ram, disk, charger]
 *         description: Filter by product category
 *       - in: query
 *         name: brand
 *         schema:
 *           type: string
 *           enum: [dell, hp, asus, acer, lenovo, apple, msi, gigabyte, logitech, kingston, anker, sony]
 *         description: Filter by brand
 *       - in: query
 *         name: price
 *         schema:
 *           type: string
 *           pattern: '^\d+-\d+$'
 *           example: '0-30000000'
 *         description: Price range filter (format "min-max")
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in name, description, brand, category, tags
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort by price (asc/desc)
 *       - in: query
 *         name: ram
 *         schema:
 *           type: string
 *           example: '16gb'
 *         description: Filter laptops by RAM (e.g., "16gb", "32gb")
 *       - in: query
 *         name: storage
 *         schema:
 *           type: string
 *           example: '512gb'
 *         description: Filter by storage capacity
 *       - in: query
 *         name: laptopcpu
 *         schema:
 *           type: string
 *           example: 'Intel Core i7'
 *         description: Filter laptops by CPU
 *       - in: query
 *         name: laptopgpu
 *         schema:
 *           type: string
 *           example: 'NVIDIA RTX 4060'
 *         description: Filter laptops by GPU
 *       - in: query
 *         name: laptopscreensizerange
 *         schema:
 *           type: string
 *           enum: ['13', '14', '15+']
 *         description: Filter laptops by screen size range
 *       - in: query
 *         name: laptopresolution
 *         schema:
 *           type: string
 *           enum: [HD, FHD, 2.8K, 3K, 4K]
 *         description: Filter laptops by screen resolution
 *       - in: query
 *         name: laptopscreentech
 *         schema:
 *           type: string
 *           enum: [OLED, IPS, Liquid Retina, Cảm ứng]
 *         description: Filter laptops by screen technology
 *       - in: query
 *         name: laptoprefreshrate
 *         schema:
 *           type: string
 *           enum: [60Hz, 90Hz, 120Hz, 144Hz, 165Hz]
 *         description: Filter laptops by refresh rate
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *         description: Filter by tags (case-insensitive)
 *     responses:
 *       200:
 *         description: Products retrieved successfully
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
 *                       _id:
 *                         type: string
 *                         example: '507f1f77bcf86cd799439011'
 *                       name:
 *                         type: string
 *                         example: 'Dell XPS 15'
 *                       slug:
 *                         type: string
 *                         example: 'dell-xps-15'
 *                       brand:
 *                         type: string
 *                         example: 'dell'
 *                       category:
 *                         type: string
 *                         example: 'laptop'
 *                       price:
 *                         type: number
 *                         example: 29999000
 *                       images:
 *                         type: array
 *                         items:
 *                           type: string
 *                       stock:
 *                         type: integer
 *                         example: 50
 *                       condition:
 *                         type: string
 *                         example: 'new'
 *                       warranty:
 *                         type: number
 *                         example: 24
 *                       views:
 *                         type: integer
 *                         example: 1250
 *                       purchases:
 *                         type: integer
 *                         example: 45
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                       example: 1
 *                     totalPages:
 *                       type: integer
 *                       example: 5
 *                     totalItems:
 *                       type: integer
 *                       example: 58
 *                     hasNextPage:
 *                       type: boolean
 *                       example: true
 *                     hasPrevPage:
 *                       type: boolean
 *                       example: false
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 *
 *   post:
 *     tags:
 *       - Products
 *     summary: Create new product (Manager/Admin only)
 *     description: Create a new product with images upload. Only accessible by Manager and Admin.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - brand
 *               - category
 *               - price
 *               - specs
 *             properties:
 *               name:
 *                 type: string
 *                 example: 'Dell XPS 15'
 *               brand:
 *                 type: string
 *                 enum: [dell, hp, asus, acer, lenovo, apple, msi, gigabyte, logitech, kingston, anker, sony]
 *                 example: 'dell'
 *               category:
 *                 type: string
 *                 enum: [laptop, mouse, headphone, keyboard, ram, disk, charger]
 *                 example: 'laptop'
 *               price:
 *                 type: number
 *                 example: 29999000
 *               stock:
 *                 type: integer
 *                 default: 0
 *                 example: 50
 *               condition:
 *                 type: string
 *                 enum: [new, used]
 *                 default: 'new'
 *               warranty:
 *                 type: number
 *                 default: 24
 *                 example: 24
 *               description:
 *                 type: string
 *                 example: 'High-performance laptop with Intel i7'
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Product images (max 10 files)
 *               specs:
 *                 type: object
 *                 description: Product specifications (varies by category)
 *                 example:
 *                   cpu: 'Intel Core i7-12700H'
 *                   gpu: 'NVIDIA RTX 4060'
 *                   ram: 16
 *                   storage: '512GB SSD'
 *                   screenSize: 15.6
 *                   screenDes: 'FHD IPS 120Hz'
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ['gaming', 'business']
 *     responses:
 *       201:
 *         description: Product created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 */
Router.route('/')
  .get(
    productValidation.getMany,
    productController.getMany
  )
  .post(
    authMiddleware.isAuthorized,
    rbacMiddleware.isValidPermission([userModel.USER_ROLES.MANAGER, userModel.USER_ROLES.ADMIN]),
    multerUploadMiddleware.upload.array('images', 10), // Max 10 images
    productValidation.createProduct,
    productController.createProduct
  )

/**
 * @swagger
 * /products/search:
 *   get:
 *     tags:
 *       - Products
 *     summary: Search products with Atlas Search
 *     description: |
 *       Advanced search using MongoDB Atlas Search with autocomplete and fuzzy matching.
 *       Searches only on product name field with typo tolerance.
 *       Returns limited fields for performance: name, slug, price, image.
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query string (supports autocomplete and fuzzy matching)
 *         example: 'dell laptop'
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number (starts from 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
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
 *                       _id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       slug:
 *                         type: string
 *                       price:
 *                         type: number
 *                       image:
 *                         type: string
 *                         description: First image URL from product images array
 *                       score:
 *                         type: number
 *                         description: Search relevance score
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   example: 20
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 */
Router.route('/search')
  .get(
    productValidation.searchProducts,
    productController.searchProducts
  )

/**
 * @swagger
 * /products/slug/{slug}:
 *   get:
 *     tags:
 *       - Products
 *     summary: Get product by slug
 *     description: Retrieve product details using URL-friendly slug. Automatically increments view count.
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Product URL slug
 *         example: 'dell-xps-15'
 *     responses:
 *       200:
 *         description: Product details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 slug:
 *                   type: string
 *                 brand:
 *                   type: string
 *                 category:
 *                   type: string
 *                 price:
 *                   type: number
 *                 images:
 *                   type: array
 *                   items:
 *                     type: string
 *                 specs:
 *                   type: object
 *                   description: Product specifications (varies by category)
 *                 stock:
 *                   type: integer
 *                 condition:
 *                   type: string
 *                 warranty:
 *                   type: number
 *                 description:
 *                   type: string
 *                 tags:
 *                   type: array
 *                   items:
 *                     type: string
 *                 views:
 *                   type: integer
 *                 purchases:
 *                   type: integer
 *                 createdAt:
 *                   type: number
 *                 updatedAt:
 *                   type: number
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
Router.route('/slug/:slug')
  .get(
    productValidation.getDetailsBySlug,
    productController.getDetailsBySlug
  )

/**
 * @swagger
 * /products/{id}:
 *   get:
 *     tags:
 *       - Products
 *     summary: Get product by ID
 *     description: Retrieve detailed product information by ObjectId
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ObjectId
 *         example: '507f1f77bcf86cd799439011'
 *     responses:
 *       200:
 *         description: Product details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *
 *   put:
 *     tags:
 *       - Products
 *     summary: Update product (Manager/Admin only)
 *     description: |
 *       Update existing product with optional new images.
 *       - Slug is auto-regenerated if name changes
 *       - Stock can be updated directly or use quantity field for increment/decrement
 *       - Supports partial updates (only send fields you want to change)
 *       Only accessible by Manager and Admin.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ObjectId
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: 'Dell XPS 15 2024'
 *               brand:
 *                 type: string
 *                 enum: [dell, hp, asus, acer, lenovo, apple, msi, gigabyte, logitech, kingston, anker, sony]
 *               category:
 *                 type: string
 *                 enum: [laptop, mouse, headphone, keyboard, ram, disk, charger]
 *               price:
 *                 type: number
 *                 example: 32999000
 *               stock:
 *                 type: integer
 *                 description: Set stock to exact value
 *                 example: 100
 *               condition:
 *                 type: string
 *                 enum: [new, used]
 *               warranty:
 *                 type: number
 *                 example: 36
 *               description:
 *                 type: string
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Upload new images (replaces existing)
 *               specs:
 *                 type: object
 *                 description: Partial or full specs update (deep merged with existing)
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *           examples:
 *             updatePrice:
 *               summary: Update price only
 *               value:
 *                 price: 28999000
 *             updateStock:
 *               summary: Update stock quantity
 *               value:
 *                 stock: 50
 *             updateSpecs:
 *               summary: Update laptop specs
 *               value:
 *                 specs:
 *                   ram: 32
 *                   storage: '1TB SSD'
 *     responses:
 *       200:
 *         description: Product updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 *
 *   delete:
 *     tags:
 *       - Products
 *     summary: Delete product (Manager/Admin only)
 *     description: Permanently delete a product from the system. Only accessible by Manager and Admin.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ObjectId
 *     responses:
 *       200:
 *         description: Product deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'Product deleted successfully!'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
Router.route('/:id')
  .get(
    productController.getDetails
  )
  .put(
    authMiddleware.isAuthorized,
    rbacMiddleware.isValidPermission([userModel.USER_ROLES.MANAGER, userModel.USER_ROLES.ADMIN]),
    multerUploadMiddleware.upload.array('images', 10), // Max 10 images
    productValidation.updateProduct,
    productController.updateProduct
  )
  .delete(
    authMiddleware.isAuthorized,
    rbacMiddleware.isValidPermission([userModel.USER_ROLES.MANAGER, userModel.USER_ROLES.ADMIN]),
    productController.deleteProduct
  )

// Image management routes
Router.route('/:id/images/reorder')
  .post(
    authMiddleware.isAuthorized,
    rbacMiddleware.isValidPermission([userModel.USER_ROLES.MANAGER, userModel.USER_ROLES.ADMIN]),
    productValidation.reorderImages,
    productController.reorderImages
  )

Router.route('/:id/images/delete')
  .post(
    authMiddleware.isAuthorized,
    rbacMiddleware.isValidPermission([userModel.USER_ROLES.MANAGER, userModel.USER_ROLES.ADMIN]),
    productValidation.deleteImage,
    productController.deleteImage
  )

Router.route('/:id/images/featured')
  .post(
    authMiddleware.isAuthorized,
    rbacMiddleware.isValidPermission([userModel.USER_ROLES.MANAGER, userModel.USER_ROLES.ADMIN]),
    productValidation.setFeaturedImage,
    productController.setFeaturedImage
  )

export const productRoute = Router
