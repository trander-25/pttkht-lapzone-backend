/* eslint-disable no-unused-vars */
import { StatusCodes } from 'http-status-codes'

/**
 * Error Handling Middleware
 * Catch all errors and return JSON response
 */
export const errorHandlingMiddleware = (err, req, res, next) => {
  if (!err.statusCode) err.statusCode = StatusCodes.INTERNAL_SERVER_ERROR

  const responseError = {
    statusCode: err.statusCode,
    message: err.message || StatusCodes[err.statusCode]
  }

  res.status(responseError.statusCode).json(responseError)
}
