/**
 * MANAGE USER CONTROLLER - Admin user management
 */

import { StatusCodes } from 'http-status-codes'
import { userService } from '../services/userService'
import ApiError from '../utils/ApiError'

/**
 * Get all users (Admin)
 * GET /api/v1/manage/users
 */
const getAllUsers = async (req, res, next) => {
  try {
    const users = await userService.getAllUsers()
    
    res.status(StatusCodes.OK).json({
      success: true,
      data: users
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Search users by keyword
 * GET /api/v1/manage/users/search?keyword=xxx
 */
const searchUsers = async (req, res, next) => {
  try {
    const { keyword } = req.query
    
    if (!keyword) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Keyword is required')
    }
    
    const users = await userService.searchUsers(keyword)
    
    res.status(StatusCodes.OK).json({
      success: true,
      data: users
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Update user information (Admin)
 * PUT /api/v1/manage/users/:user_id
 * Can update: email, full_name, phone, role
 */
const updateUser = async (req, res, next) => {
  try {
    const { user_id } = req.params
    const { email, full_name, phone, role } = req.body
    
    // Build update data
    const updates = {}
    if (email) updates.email = email
    if (full_name) updates.full_name = full_name
    if (phone !== undefined) updates.phone = phone
    if (role) updates.role = role
    
    if (Object.keys(updates).length === 0) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'No data to update')
    }
    
    // Validate email uniqueness if updating email
    if (email) {
      const currentUser = await userService.getUser(parseInt(user_id))
      if (currentUser.email !== email) {
        const emailExists = await userService.checkEmailExistence(email)
        if (emailExists) {
          throw new ApiError(StatusCodes.CONFLICT, 'Email already in use')
        }
      }
    }
    
    // Validate role
    if (role && !['CUSTOMER', 'ADMIN'].includes(role)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid role. Must be CUSTOMER or ADMIN')
    }
    
    const result = await userService.updateUser(parseInt(user_id), updates)
    
    res.status(StatusCodes.OK).json({
      success: result,
      message: 'User updated successfully'
    })
  } catch (error) {
    next(error)
  }
}

export const manageUserController = {
  getAllUsers,
  searchUsers,
  updateUser
}
