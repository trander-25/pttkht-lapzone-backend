import { StatusCodes } from 'http-status-codes'
import { orderService } from '~/services/orderService'
import { env } from '~/config/environment'

/**
 * Preview đơn hàng trước khi đặt hàng
 * Tính toán tổng tiền (total = sum của price × quantity)
 * Hỗ trợ 2 nguồn:
 * - cart: Mua từ giỏ hàng (lấy items đã chọn)
 * - buy_now: Mua ngay (lấy items từ request body)
 * @route POST /api/v1/orders/preview
 * @access Private (User phải đăng nhập)
 */
const previewOrder = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded._id

    const result = await orderService.previewOrder(userId, req.body)

    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

/**
 * Tạo đơn hàng mới
 * Hỗ trợ 2 phương thức thanh toán:
 * - COD: Thanh toán khi nhận hàng (trả về order ngay)
 * - MoMo: Thanh toán online (trả về order + paymentUrl để redirect)
 * Quy trình: Preview -> Trừ stock -> Tạo order -> Xóa khỏi cart
 * @route POST /api/v1/orders
 * @access Private (User phải đăng nhập)
 */
const createOrder = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded._id

    const result = await orderService.createOrder(userId, req.body)

    res.status(StatusCodes.CREATED).json(result)
  } catch (error) {
    next(error)
  }
}

/**
 * Lấy danh sách đơn hàng của user hiện tại
 * Hỗ trợ filter theo status và pagination
 * shippingAddress bị loại khỏi list view (chỉ hiển khi xem chi tiết)
 * @route GET /api/v1/orders/my-orders
 * @access Private (User phải đăng nhập)
 */
const getMyOrders = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded._id

    const result = await orderService.getMyOrders(userId, req.query)

    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

/**
 * Lấy thông tin chi tiết đơn hàng
 * Phân quyền: User xem được đơn của mình, Admin/Manager xem được tất cả
 * Bao gồm cả shippingAddress (khác với list view)
 * @route GET /api/v1/orders/:orderId
 * @access Private (User phải đăng nhập)
 */
const getOrderById = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded._id
    const userRole = req.jwtDecoded.role
    const { orderId } = req.params

    const order = await orderService.getOrderById(userId, orderId, userRole)

    res.status(StatusCodes.OK).json(order)
  } catch (error) {
    next(error)
  }
}

/**
 * Hủy đơn hàng (chỉ pending/confirmed)
 * Tự động rollback: Hoàn stock
 * User chỉ hủy được đơn của mình
 * @route POST /api/v1/orders/:orderId/cancel
 * @access Private (User phải đăng nhập)
 */
const cancelOrder = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded._id
    const { orderId } = req.params

    const order = await orderService.cancelOrder(userId, orderId)

    res.status(StatusCodes.OK).json({
      message: 'Order cancelled successfully',
      order
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Lấy tất cả đơn hàng (Admin only)
 * Hỗ trợ filter theo status và pagination
 * @route GET /api/v1/orders
 * @access Private (Admin/Manager only)
 */
const getAllOrders = async (req, res, next) => {
  try {
    const result = await orderService.getAllOrders(req.query)

    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

/**
 * Cập nhật trạng thái đơn hàng (Admin only)
 * Có thể cập nhật: status, paymentStatus
 * Đặc biệt: Khi chuyển sang DELIVERED, tự động tăng purchases count
 * @route PATCH /api/v1/orders/:orderId
 * @access Private (Admin/Manager only)
 */
const updateOrder = async (req, res, next) => {
  try {
    const { orderId } = req.params

    const order = await orderService.updateOrder(orderId, req.body)

    res.status(StatusCodes.OK).json({
      message: 'Order updated successfully',
      order
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Xử lý callback từ MoMo (IPN - Instant Payment Notification)
 * Đây là webhook endpoint mà MoMo gửi kết quả thanh toán tới
 * Logic chính ở service layer (cập nhật order, rollback nếu thất bại)
 * Luôn trả về 200 OK cho MoMo (theo yêu cầu của MoMo API)
 * @route POST /api/v1/orders/momo/callback
 * @access Public (webhook từ MoMo, không cần auth)
 */
const handleMoMoCallback = async (req, res, next) => {
  try {
    const result = await orderService.handleMoMoCallback(req.body)

    // MoMo expects a specific response format for IPN
    res.status(StatusCodes.OK).json({
      resultCode: 0,
      message: 'Success'
    })
  } catch (error) {
    // Still return success to MoMo to prevent retries for invalid requests
    res.status(StatusCodes.OK).json({
      resultCode: -1,
      message: error.message || 'Failed to process callback'
    })
  }
}

/**
 * Xử lý redirect từ MoMo sau khi user thanh toán
 * MoMo chuyển hướng user về endpoint này sau khi thanh toán (dù thành công hay thất bại)
 * Controller này redirect tiếp về frontend với kết quả thanh toán
 * Lưu ý: Logic chính đã được xử lý ở IPN callback, đây chỉ là safety check
 * @route GET /api/v1/orders/momo/return
 * @access Public (redirect từ MoMo)
 */
const handleMoMoReturn = async (req, res, next) => {
  try {
    const result = await orderService.handleMoMoReturn(req.query)

    // Redirect to frontend with payment result
    const frontendUrl = env.BUILD_MODE === 'production'
      ? env.WEBSITE_DOMAIN_PRODUCTION
      : env.WEBSITE_DOMAIN_DEVELOPMENT || 'http://localhost:5173'

    const redirectUrl = `${frontendUrl}/orders/${result.order._id.toString()}?payment=${result.success ? 'success' : 'failed'}`

    res.redirect(redirectUrl)
  } catch (error) {
    next(error)
  }
}

export const orderController = {
  previewOrder,
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  getAllOrders,
  updateOrder,
  handleMoMoCallback,
  handleMoMoReturn
}
