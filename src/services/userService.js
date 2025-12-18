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

export const userService = {
  checkEmailExistence,
  insertUser,
  validateSignIn
}
