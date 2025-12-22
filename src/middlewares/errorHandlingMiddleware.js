/* eslint-disable no-unused-vars */
import { StatusCodes } from 'http-status-codes'
import ApiError from '../utils/ApiError'

/**
 * Error Handling Middleware
 * Catch all errors and return JSON response
 */
export const errorHandlingMiddleware = (err, req, res, next) => {
  // Log error for debugging
  if (err.statusCode >= 500 || !err.statusCode) {
    console.error('Server Error:', {
      message: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
      body: req.body
    })
  }

  // If it's an ApiError, use its statusCode and message
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      statusCode: err.statusCode,
      message: err.message
    })
  }

  // Handle Sequelize errors
  if (err.name === 'SequelizeValidationError') {
    const messages = err.errors.map(e => e.message).join(', ')
    return res.status(StatusCodes.BAD_REQUEST).json({
      statusCode: StatusCodes.BAD_REQUEST,
      message: `Validation error: ${messages}`
    })
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(StatusCodes.CONFLICT).json({
      statusCode: StatusCodes.CONFLICT,
      message: 'Email already registered'
    })
  }

  if (err.name && err.name.startsWith('Sequelize')) {
    console.error('Sequelize Error:', err)
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      message: 'Database error occurred'
    })
  }

  // Default error handling
  const statusCode = err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR
  const message = err.message || 'Internal server error'

  res.status(statusCode).json({
    statusCode,
    message
  })
}
