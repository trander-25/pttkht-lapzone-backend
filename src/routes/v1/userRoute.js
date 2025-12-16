import express from 'express'
import { userValidation } from '~/validations/userValidation'
import { userController } from '~/controllers/userController'
import { authMiddleware } from '~/middlewares/authMiddleware'
import { multerUploadMiddleware } from '~/middlewares/multerUploadMiddleware'
import { rbacMiddleware } from '~/middlewares/rbacMiddleware'
import { userModel } from '~/models/userModel'

const Router = express.Router()

/**
 * @swagger
 * /users/me:
 *   put:
 *     tags:
 *       - Users
 *     summary: Update current user profile
 *     description: Update authenticated user's profile information including avatar upload
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 example: 'John Doe'
 *               phone:
 *                 type: string
 *                 pattern: '^[0-9]{10,11}$'
 *                 example: '0987654321'
 *               sex:
 *                 type: string
 *                 enum: [male, female]
 *                 example: 'male'
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: Profile avatar image
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Account not found
 *       406:
 *         description: Account is not active
 */
Router.route('/me')
  .put(
    authMiddleware.isAuthorized,
    multerUploadMiddleware.upload.single('avatar'),
    userValidation.updateUser,
    userController.updateUser
  )

/**
 * @swagger
 * /users/me/addresses:
 *   post:
 *     tags:
 *       - Users
 *     summary: Add new address
 *     description: Add a new delivery address to user's address list. First address is automatically set as default.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - street
 *               - ward
 *               - district
 *               - province
 *             properties:
 *               street:
 *                 type: string
 *                 example: '123 Main Street'
 *               ward:
 *                 type: string
 *                 example: 'Ward 1'
 *               district:
 *                 type: string
 *                 example: 'District 1'
 *               province:
 *                 type: string
 *                 example: 'Ho Chi Minh City'
 *               isDefault:
 *                 type: boolean
 *                 default: false
 *                 description: Set as default address (will unset other defaults)
 *     responses:
 *       201:
 *         description: Address added successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 *
 *   put:
 *     tags:
 *       - Users
 *     summary: Update existing address
 *     description: Update an existing address. Setting isDefault=true will unset other defaults.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - addressId
 *             properties:
 *               addressId:
 *                 type: string
 *                 example: '507f1f77bcf86cd799439011'
 *               street:
 *                 type: string
 *               ward:
 *                 type: string
 *               district:
 *                 type: string
 *               province:
 *                 type: string
 *               isDefault:
 *                 type: boolean
 *           examples:
 *             updateStreet:
 *               summary: Update street only
 *               value:
 *                 addressId: '507f1f77bcf86cd799439011'
 *                 street: '456 New Street'
 *             setDefault:
 *               summary: Set as default address
 *               value:
 *                 addressId: '507f1f77bcf86cd799439011'
 *                 isDefault: true
 *     responses:
 *       200:
 *         description: Address updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Address not found
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 *
 *   delete:
 *     tags:
 *       - Users
 *     summary: Delete address
 *     description: Delete an address from user's address list. If deleted address was default, first remaining address becomes default.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - addressId
 *             properties:
 *               addressId:
 *                 type: string
 *                 example: '507f1f77bcf86cd799439011'
 *     responses:
 *       200:
 *         description: Address deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Address not found
 */
Router.route('/me/addresses')
  .post(
    authMiddleware.isAuthorized,
    userValidation.addAddress,
    userController.addAddress
  )
  .put(
    authMiddleware.isAuthorized,
    userValidation.updateAddress,
    userController.updateAddress
  )
  .delete(
    authMiddleware.isAuthorized,
    userController.deleteAddress
  )

/**
 * @swagger
 * /users:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get all users with pagination (Admin only)
 *     description: Retrieve paginated list of all users with search and role filter. Only accessible by Admin.
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
 *           default: 20
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by email, username, or phone
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [customer, manager, admin]
 *         description: Filter by user role
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/User'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                         totalItems:
 *                           type: integer
 *                         hasNextPage:
 *                           type: boolean
 *                         hasPrevPage:
 *                           type: boolean
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
Router.route('/')
  .get(
    authMiddleware.isAuthorized,
    rbacMiddleware.isValidPermission([userModel.USER_ROLES.ADMIN]),
    userController.getAllUsers
  )

/**
 * @swagger
 * /users/{userId}:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get user details by ID (Admin only)
 *     description: Retrieve detailed information of a specific user. Only accessible by Admin.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ObjectId
 *         example: '507f1f77bcf86cd799439011'
 *     responses:
 *       200:
 *         description: User details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         description: User not found
 *
 *   put:
 *     tags:
 *       - Users
 *     summary: Update user by Admin (Admin only)
 *     description: |
 *       Update user information by Admin. Admin can update more fields than regular users including role and isActive status.
 *       Only accessible by Admin.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ObjectId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 example: 'John Doe'
 *               phone:
 *                 type: string
 *                 pattern: '^[0-9]{10,11}$'
 *                 example: '0987654321'
 *               sex:
 *                 type: string
 *                 enum: [male, female]
 *               isActive:
 *                 type: boolean
 *                 description: Activate or deactivate user account
 *                 example: true
 *               role:
 *                 type: string
 *                 enum: [customer, manager, admin]
 *                 description: Change user role
 *                 example: 'manager'
 *               addresses:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/Address'
 *           examples:
 *             activateUser:
 *               summary: Activate user account
 *               value:
 *                 isActive: true
 *             promoteToManager:
 *               summary: Promote user to Manager
 *               value:
 *                 role: 'manager'
 *             updateProfile:
 *               summary: Update user profile
 *               value:
 *                 username: 'Jane Smith'
 *                 phone: '0912345678'
 *                 sex: 'female'
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid role
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         description: User not found
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 */
Router.route('/:userId')
  .get(
    authMiddleware.isAuthorized,
    rbacMiddleware.isValidPermission([userModel.USER_ROLES.ADMIN]),
    userController.getUserDetail
  )
  .put(
    authMiddleware.isAuthorized,
    rbacMiddleware.isValidPermission([userModel.USER_ROLES.ADMIN]),
    userValidation.updateUserByAdmin,
    userController.updateUserByAdmin
  )

export const userRoute = Router