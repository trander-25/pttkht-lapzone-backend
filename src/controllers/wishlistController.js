import { StatusCodes } from 'http-status-codes'
import { wishlistService } from '~/services/wishlistService'

/**
 * Lấy danh sách yêu thích của người dùng
 * GET /api/v1/wishlist
 * @param {object} req.query - Tham số phân trang (page, limit)
 * @returns {object} Danh sách sản phẩm yêu thích và thông tin phân trang
 */
// GET /api/v1/wishlist - Get user's wishlist
const getWishlist = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded._id
    const queryParams = req.query

    const result = await wishlistService.getWishlist(userId, queryParams)

    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

/**
 * Thêm sản phẩm vào danh sách yêu thích
 * POST /api/v1/wishlist
 * @param {object} req.body - Chứa productId
 * @returns {object} Wishlist đã cập nhật
 */
// POST /api/v1/wishlist - Add product to wishlist
const addToWishlist = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded._id
    const { productId } = req.body

    const result = await wishlistService.addToWishlist(userId, productId)

    res.status(StatusCodes.CREATED).json(result)
  } catch (error) {
    next(error)
  }
}

/**
 * Xóa sản phẩm khỏi danh sách yêu thích
 * DELETE /api/v1/wishlist/:productId
 * @param {string} req.params.productId - ID của sản phẩm cần xóa
 * @returns {object} Wishlist sau khi xóa
 */
// DELETE /api/v1/wishlist/:productId - Remove product from wishlist
const removeFromWishlist = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded._id
    const { productId } = req.params

    const result = await wishlistService.removeFromWishlist(userId, productId)

    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

/**
 * Xóa nhiều sản phẩm hoặc xóa toàn bộ wishlist
 * DELETE /api/v1/wishlist
 * @param {object} req.body - Chứa mảng productIds (nếu không truyền sẽ xóa tất cả)
 * @returns {object} Wishlist sau khi xóa
 */
// DELETE /api/v1/wishlist - Remove multiple products or clear wishlist
const removeMultipleFromWishlist = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded._id
    const { productIds } = req.body

    const result = await wishlistService.removeMultipleFromWishlist(userId, productIds)

    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

export const wishlistController = {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  removeMultipleFromWishlist
}
