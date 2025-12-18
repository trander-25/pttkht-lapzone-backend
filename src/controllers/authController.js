/**
 * AUTH CONTROLLER
 * Handles authentication operations (refresh token, logout)
 */

import { StatusCodes } from 'http-status-codes'
import { JwtProvider } from '../providers/JwtProvider'
import ApiError from '../utils/ApiError'
import { env } from '../config/environment.js'

/**
 * Refresh access token using refresh token
 * @param {Object} req.cookies - { refreshToken }
 * @returns {Object} - { success: boolean, accessToken: string }
 */
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.cookies
    
    if (!refreshToken) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Refresh token not found')
    }
    
    // Verify refresh token
    const decoded = await JwtProvider.verifyToken(
      refreshToken,
      env.REFRESH_TOKEN_SECRET_SIGNATURE
    )
    
    // Generate new access token
    const tokenPayload = {
      user_id: decoded.user_id,
      email: decoded.email,
      role: decoded.role
    }
    
    const newAccessToken = await JwtProvider.generateToken(
      tokenPayload,
      env.ACCESS_TOKEN_SECRET_SIGNATURE,
      env.ACCESS_TOKEN_LIFE
    )
    
    // Set new access token cookie
    res.cookie('accessToken', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    })
    
    res.status(StatusCodes.OK).json({
      success: true,
      accessToken: newAccessToken
    })
  } catch (error) {
    next(error)
  }
}

/**
 * User logout - clear authentication cookies
 */
const signout = async (req, res, next) => {
  try {
    res.clearCookie('accessToken')
    res.clearCookie('refreshToken')
    
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Signed out successfully'
    })
  } catch (error) {
    next(error)
  }
}

export const authController = {
  refreshToken,
  signout
}
