/**
 * USER ROUTES - User Profile & Admin Management
 */

import express from 'express'
import { userController } from '../../controllers/userController'
import { authMiddleware } from '../../middlewares/authMiddleware'
import { rbacMiddleware } from '../../middlewares/rbacMiddleware'

const Router = express.Router()

/**
 * USER PROFILE ROUTES (Require Authentication)
 */

// GET /api/v1/users/profile - Get current user profile
Router.get('/profile', 
  authMiddleware.isAuthorized,
  userController.getProfile
)

// PUT /api/v1/users/profile - Update current user profile
Router.put('/profile',
  authMiddleware.isAuthorized,
  userController.updateProfile
)

// PUT /api/v1/users/change-password - Change password
Router.put('/change-password',
  authMiddleware.isAuthorized,
  userController.changePassword
)

/**
 * ADMIN ROUTES (Require Authentication + ADMIN Role)
 */

// GET /api/v1/users/admin/all - Get all users
Router.get('/admin/all',
  authMiddleware.isAuthorized,
  rbacMiddleware.isValidPermission(['ADMIN']),
  userController.getAllUsers
)

// GET /api/v1/users/admin/search - Search users
Router.get('/admin/search',
  authMiddleware.isAuthorized,
  rbacMiddleware.isValidPermission(['ADMIN']),
  userController.searchUsers
)

// GET /api/v1/users/admin/:user_id - Get user by ID
Router.get('/admin/:user_id',
  authMiddleware.isAuthorized,
  rbacMiddleware.isValidPermission(['ADMIN']),
  userController.getUserById
)

// PUT /api/v1/users/admin/:user_id - Update user by admin
Router.put('/admin/:user_id',
  authMiddleware.isAuthorized,
  rbacMiddleware.isValidPermission(['ADMIN']),
  userController.updateUserByAdmin
)

// PUT /api/v1/users/admin/:user_id/reset-password - Reset password by admin
Router.put('/admin/:user_id/reset-password',
  authMiddleware.isAuthorized,
  rbacMiddleware.isValidPermission(['ADMIN']),
  userController.resetPasswordByAdmin
)

export const userRoute = Router
