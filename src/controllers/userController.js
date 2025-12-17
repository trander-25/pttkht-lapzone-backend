/**
 * USER CONTROLLER - User Profile & Admin Management
 * Implements user profile and admin functions
 */

import { StatusCodes } from 'http-status-codes'
import { userService } from '../services/userService'
import ApiError from '../utils/ApiError'
import bcrypt from 'bcryptjs'
import { User } from '../models/index.js'

/**
 * USER PROFILE CONTROLLERS
 */

/**
 * Get current user's profile
 * @returns {Object} - User profile data
 */
const getProfile = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded.user_id

    const user = await userService.getUserProfile(userId)

    res.status(StatusCodes.OK).json({
      success: true,
      data: user
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Update current user's profile
 * @param {Object} req.body - { full_name, phone }
 * @returns {Object} - { success: boolean }
 */
const updateProfile = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded.user_id
    const { full_name, phone } = req.body
    
    const result = await userService.updateUserProfile({
      user_id: userId,
      full_name,
      phone
    })
    
    res.status(StatusCodes.OK).json({
      success: result,
      message: 'Profile updated successfully'
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Update current user's password
 * @param {Object} req.body - { current_password, new_password }
 * @returns {Object} - { success: boolean }
 */
const changePassword = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded.user_id
    const { current_password, new_password } = req.body
    
    // Get user to validate current password
    const user = await User.findOne({ where: { user_id: userId } })
    
    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'User not found')
    }
    
    // Validate current password
    const isCurrentPasswordValid = await bcrypt.compare(current_password, user.password)
    
    if (!isCurrentPasswordValid) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Current password is incorrect')
    }
    
    // Update to new password
    const result = await userService.updatePassword(userId, new_password)
    
    res.status(StatusCodes.OK).json({
      success: result,
      message: 'Password changed successfully'
    })
  } catch (error) {
    next(error)
  }
}

/**
 * ADMIN CONTROLLERS
 */

/**
 * Get all users (Admin only)
 * @returns {Object} - { success: boolean, data: Array }
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
 * Search users by keyword (Admin only)
 * @param {string} req.query.keyword - Search keyword
 * @returns {Object} - { success: boolean, data: Array }
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
 * Get user detail by ID (Admin only)
 * @param {number} req.params.user_id - User ID
 * @returns {Object} - { success: boolean, data: Object }
 */
const getUserById = async (req, res, next) => {
  try {
    const { user_id } = req.params
    
    const user = await userService.getUserProfile(parseInt(user_id))
    
    res.status(StatusCodes.OK).json({
      success: true,
      data: user
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Update user profile by Admin
 * @param {number} req.params.user_id - User ID
 * @param {Object} req.body - { full_name, phone, role }
 * @returns {Object} - { success: boolean }
 */
const updateUserByAdmin = async (req, res, next) => {
  try {
    const { user_id } = req.params
    const { full_name, phone, role } = req.body
    
    const updateData = { user_id: parseInt(user_id) }
    
    if (full_name) updateData.full_name = full_name
    if (phone) updateData.phone = phone
    
    // Handle role updates
    if (role) {
      await User.update({ role }, { where: { user_id: parseInt(user_id) } })
    }
    
    // Update basic profile
    const result = await userService.updateUserProfile(updateData)
    
    res.status(StatusCodes.OK).json({
      success: result,
      message: 'User updated successfully by admin'
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Reset user password by Admin
 * @param {number} req.params.user_id - User ID
 * @param {Object} req.body - { new_password }
 * @returns {Object} - { success: boolean }
 */
const resetPasswordByAdmin = async (req, res, next) => {
  try {
    const { user_id } = req.params
    const { new_password } = req.body
    
    const result = await userService.updatePassword(parseInt(user_id), new_password)
    
    res.status(StatusCodes.OK).json({
      success: result,
      message: 'Password reset successfully'
    })
  } catch (error) {
    next(error)
  }
}

export const userController = {
  // User Profile
  getProfile,
  updateProfile,
  changePassword,
  // Admin
  getAllUsers,
  searchUsers,
  getUserById,
  updateUserByAdmin,
  resetPasswordByAdmin
}
