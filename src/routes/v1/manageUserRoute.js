/**
 * MANAGE USER ROUTES - Admin user management
 */

import express from 'express'
import { manageUserController } from '../../controllers/manageUserController'
import { authMiddleware } from '../../middlewares/authMiddleware'
import { rbacMiddleware } from '../../middlewares/rbacMiddleware'

const Router = express.Router()

/**
 * All manage user routes require authentication and admin role
 */
Router.use(authMiddleware.isAuthorized)
Router.use(rbacMiddleware.isValidPermission(['ADMIN']))

// GET /api/v1/manage/users - Get all users
Router.get('/', manageUserController.getAllUsers)

// GET /api/v1/manage/users/search?keyword=xxx - Search users
Router.get('/search', manageUserController.searchUsers)

// PUT /api/v1/manage/users/:user_id - Update user information
Router.put('/:user_id', manageUserController.updateUser)

export const manageUserRoute = Router
