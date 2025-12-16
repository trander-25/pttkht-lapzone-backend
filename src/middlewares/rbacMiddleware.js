import { StatusCodes } from 'http-status-codes'

/**
 * Middleware kiểm soát quyền truy cập theo vai trò (RBAC - Role-Based Access Control)
 * 
 * Cách sử dụng: rbacMiddleware.isValidPermission(['admin', 'manager'])
 * 
 * Quy trình:
 * 1. Middleware này chạy SAU authMiddleware (đảm bảo đã có req.jwtDecoded)
 * 2. Lấy role của user từ JWT đã được giải mã (req.jwtDecoded.role)
 * 3. Kiểm tra xem role của user có nằm trong danh sách allowedRoles không
 * 4. Nếu KHÔNG có quyền → Trả về 403 FORBIDDEN
 * 5. Nếu CÓ quyền → Cho phép request tiếp tục (next())
 * 
 * Ví dụ trong route:
 * router.delete(
 *   '/products/:id',
 *   authMiddleware.isAuthorized,  // Bước 1: Xác thực token
 *   rbacMiddleware.isValidPermission(['admin']),  // Bước 2: Kiểm tra quyền
 *   productController.deleteProduct  // Bước 3: Xử lý logic
 * )
 * 
 * Phân biệt:
 * - 401 UNAUTHORIZED: Chưa đăng nhập hoặc token không hợp lệ
 * - 403 FORBIDDEN: Đã đăng nhập nhưng không đủ quyền
 */
const isValidPermission = (allowedRoles) => async (req, res, next) => {
  try {
    // Bước 1: JWT token đã được validate bởi authMiddleware (chạy trước)
    // req.jwtDecoded đã chứa thông tin user (userId, email, role)

    // Bước 2: Lấy role của user từ JWT payload
    const userRole = req.jwtDecoded.role

    // Bước 3: Kiểm tra role có nằm trong danh sách được phép không
    // Ví dụ: allowedRoles = ['admin', 'manager'], userRole = 'customer' → FORBIDDEN
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