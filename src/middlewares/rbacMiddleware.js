import { StatusCodes } from 'http-status-codes'

/**
 * RBAC Middleware - Kiểm tra quyền truy cập theo role
 * Usage: rbacMiddleware.isValidPermission(['ADMIN', 'MANAGER'])
 */
const isValidPermission = (allowedRoles) => async (req, res, next) => {
  try {
    const userRole = req.jwtDecoded.role

    if (!userRole || !allowedRoles.includes(userRole)) {
      res.status(StatusCodes.FORBIDDEN).json({
        message: 'You are not allowed to access this API!'
      })
      return
    }

    // Bước 4: User có quyền → Cho phép request tiếp tục
    next()
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Something went wrong!' })
  }
}
export const rbacMiddleware = {
  isValidPermission
}
