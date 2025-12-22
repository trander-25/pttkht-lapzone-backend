/**
 * SIGN UP CONTROLLER
 * Implements exact functions from sign up controller specification
 */

import { StatusCodes } from 'http-status-codes'
import { userService } from '../services/userService'
import ApiError from '../utils/ApiError'

/**
 * Register new user
 * @param {Object} req.body - { email, password, full_name, phone }
 * @returns {Object} - { success: boolean, message: string }
 */
const signup = async (req, res, next) => {
  try {
    const { email, password, full_name, phone } = req.body
    
    // Validate required fields
    if (!email || !password || !full_name) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Missing required fields: email, password, full_name')
    }
    
    // Check if email already exists
    const emailExists = await userService.checkEmailExistence(email)
    if (emailExists) {
      throw new ApiError(StatusCodes.CONFLICT, 'Email already registered')
    }
    
    // Insert new user
    const result = await userService.insertUser({
      email,
      password,
      full_name,
      phone: phone || null,
      role: 'CUSTOMER'
    })
    
    res.status(StatusCodes.CREATED).json({
      success: result,
      message: 'User registered successfully'
    })
  } catch (error) {
    next(error)
  }
}

export const signupController = {
  signup
}
