/**
 * SIGN IN CONTROLLER
 * Implements exact functions from sign in controller specification
 */

import { StatusCodes } from 'http-status-codes'
import { userService } from '../services/userService'
import { JwtProvider } from '../providers/JwtProvider'
import ApiError from '../utils/ApiError'
import { env } from '../config/environment.js'

/**
 * User login - validates credentials and returns JWT tokens
 * @param {Object} req.body - { email, password }
 * @returns {Object} - { success: boolean, accessToken: string, user: Object }
 */
const signin = async (req, res, next) => {
  try {
    const { email, password } = req.body
    
    // Validate credentials
    const isValid = await userService.validateSignIn(email, password)
    
    if (!isValid) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid email or password')
    }
    
    // Get user info from service
    const user = await userService.getUserByEmail(email)
    
    // Generate JWT tokens
    const tokenPayload = {
      user_id: user.user_id,
      email: user.email,
      role: user.role
    }
    
    const accessToken = await JwtProvider.generateToken(
      tokenPayload,
      env.ACCESS_TOKEN_SECRET_SIGNATURE,
      env.ACCESS_TOKEN_LIFE
    )
    
    const refreshToken = await JwtProvider.generateToken(
      tokenPayload,
      env.REFRESH_TOKEN_SECRET_SIGNATURE,
      env.REFRESH_TOKEN_LIFE
    )
    
    // Set HTTP-only cookies
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    })
    
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 14 * 24 * 60 * 60 * 1000 // 14 days
    })
    
    res.status(StatusCodes.OK).json({
      success: true,
      accessToken,
      refreshToken,
      user: {
        user_id: user.user_id,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        role: user.role
      }
    })
  } catch (error) {
    next(error)
  }
}

export const signinController = {
  signin
}
