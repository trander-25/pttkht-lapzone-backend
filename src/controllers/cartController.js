import { StatusCodes } from 'http-status-codes'
import { cartService } from '~/services/cartService'

/**
 * Thêm sản phẩm vào giỏ hàng
 * Kiểm tra stock và tự động tạo giỏ nếu user chưa có
 * Nếu sản phẩm đã có trong giỏ, tăng quantity
 * @route POST /api/v1/cart
 * @access Private (User phải đăng nhập)
 */
const addToCart = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded._id

    const cart = await cartService.addToCart(userId, req.body)

    res.status(StatusCodes.OK).json(cart)
  } catch (error) {
    next(error)
  }
}

/**
 * Lấy thông tin giỏ hàng của user
 * Bao gồm: items, selectedAmount
 * @route GET /api/v1/cart
 * @access Private (User phải đăng nhập)
 */
const getCart = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded._id

    const cart = await cartService.getCart(userId)

    res.status(StatusCodes.OK).json(cart)
  } catch (error) {
    next(error)
  }
}

/**
 * Cập nhật số lượng hoặc trạng thái chọn của item trong giỏ
 * Có thể cập nhật:
 * - quantity: Số lượng mới (kiểm tra stock)
 * - selected: true/false (để chọn checkout)
 * Tự động tính lại selectedAmount
 * @route PATCH /api/v1/cart/:productId
 * @access Private (User phải đăng nhập)
 */
const updateCartItem = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded._id
    const { productId } = req.params

    const cart = await cartService.updateCartItem(userId, productId, req.body)

    res.status(StatusCodes.OK).json(cart)
  } catch (error) {
    next(error)
  }
}

/**
 * Xóa một sản phẩm khỏi giỏ hàng
 * Tự động cập nhật lại selectedAmount
 * @route DELETE /api/v1/cart/:productId
 * @access Private (User phải đăng nhập)
 */
const deleteCartItem = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded._id
    const { productId } = req.params

    const cart = await cartService.deleteCartItem(userId, productId)

    res.status(StatusCodes.OK).json(cart)
  } catch (error) {
    next(error)
  }
}

/**
 * Xóa tất cả các item đã chọn (selected=true)
 * Sử dụng khi user muốn xóa nhiều sản phẩm cùng lúc
 * @route DELETE /api/v1/cart/selected
 * @access Private (User phải đăng nhập)
 */
const deleteSelectedCartItems = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded._id

    const cart = await cartService.deleteSelectedCartItems(userId)

    res.status(StatusCodes.OK).json(cart)
  } catch (error) {
    next(error)
  }
}

/**
 * Kiểm tra tình trạng stock của tất cả items trong giỏ
 * Kiểm tra:
 * - Sản phẩm còn tồn tại không (UNAVAILABLE)
 * - Stock có đủ không (INSUFFICIENT_STOCK)
 * - Giá có thay đổi không (PRICE_CHANGED)
 * Sử dụng trước khi checkout
 * @route GET /api/v1/cart/validate-stock
 * @access Private (User phải đăng nhập)
 */
const validateCartStock = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded._id

    const result = await cartService.validateCartStock(userId)

    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

export const cartController = {
  addToCart,
  getCart,
  updateCartItem,
  deleteCartItem,
  deleteSelectedCartItems,
  validateCartStock
}
