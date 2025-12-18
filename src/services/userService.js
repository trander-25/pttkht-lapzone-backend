/**
 * USER SERVICE - Business Logic Layer
 * Implements auth and profile management functions only
 */

import bcrypt from 'bcryptjs'
import { User } from '../models/index'
import ApiError from '../utils/ApiError'
import { StatusCodes } from 'http-status-codes'

/**
 * Checks if the email is already registered
 * @param {string} email - Email to check
 * @returns {Promise<Boolean>} - True if email exists, false otherwise
 */
const checkEmailExistence = async (email) => {
  try {
    const user = await User.findOne({ where: { email } })
    return !!user // Convert to boolean
  } catch (error) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error checking email existence')
  }
}

/**
 * Saves a new user into the database
 * @param {Object} user - User data { email, password, full_name, phone, role }
 * @returns {Promise<Boolean>} - True if successful, false otherwise
 */
const insertUser = async (user) => {
  try {
    // Hash password before saving
    const hashedPassword = await bcrypt.hash(user.password, 10)
    
    await User.create({
      email: user.email,
      password: hashedPassword,
      full_name: user.full_name,
      phone: user.phone || null,
      role: user.role || 'CUSTOMER'
    })
    
    return true
  } catch (error) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error inserting user')
  }
}

/**
 * Checks if login credentials are correct
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Promise<Boolean>} - True if credentials are valid, false otherwise
 */
const validateSignIn = async (email, password) => {
  try {
    const user = await User.findOne({ where: { email } })
    
    if (!user) {
      return false
    }
    
    // Validate password
    const isPasswordValid = await bcrypt.compare(password, user.password)
    return isPasswordValid
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error validating sign in')
  }
}

/**
 * Gets all users (Admin)
 * @returns {Promise<Array>} - List of all users
 */
const getAllUsers = async () => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] },
      order: [['user_id', 'DESC']]
    })
    
    return users
  } catch (error) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error getting all users')
  }
}

/**
 * Gets user by ID
 * @param {number} user_id - User ID
 * @returns {Promise<Object>} - User object
 */
const getUser = async (user_id) => {
  try {
    const user = await User.findByPk(user_id, {
      attributes: { exclude: ['password'] }
    })
    
    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'User not found')
    }
    
    return user
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error getting user')
  }
}

/**
 * Searches users by keyword (Admin)
 * @param {string} keyword - Search keyword
 * @returns {Promise<Array>} - List of matching users
 */
const searchUsers = async (keyword) => {
  try {
    const { Op } = await import('sequelize')
    
    const users = await User.findAll({
      where: {
        [Op.or]: [
          { email: { [Op.like]: `%${keyword}%` } },
          { full_name: { [Op.like]: `%${keyword}%` } },
          { phone: { [Op.like]: `%${keyword}%` } }
        ]
      },
      attributes: { exclude: ['password'] },
      order: [['user_id', 'DESC']]
    })
    
    return users
  } catch (error) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error searching users')
  }
}

/**
 * Updates user information (Admin)
 * @param {number} user_id - User ID
 * @param {Object} updates - User updates { email, full_name, phone, role }
 * @returns {Promise<Boolean>} - True if successful
 */
const updateUser = async (user_id, updates) => {
  try {
    const updateData = {}
    
    if (updates.email) updateData.email = updates.email
    if (updates.full_name) updateData.full_name = updates.full_name
    if (updates.phone !== undefined) updateData.phone = updates.phone
    if (updates.role) updateData.role = updates.role
    
    const [updated] = await User.update(updateData, {
      where: { user_id }
    })
    
    return updated > 0
  } catch (error) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error updating user')
  }
}

export const userService = {
  checkEmailExistence,
  insertUser,
  validateSignIn,
  getAllUsers,
  getUser,
  searchUsers,
  updateUser
}
