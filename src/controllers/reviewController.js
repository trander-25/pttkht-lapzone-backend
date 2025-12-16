import { StatusCodes } from 'http-status-codes'
import { reviewService } from '~/services/reviewService'

/**
 * Lấy tất cả đánh giá (Admin)
 * GET /api/v1/reviews?page=1&limit=10&status=approved
 * @param {object} req.query - Tham số (page, limit, status)
 * @returns {object} Danh sách đánh giá và thông tin phân trang
 */
// GET /api/v1/reviews?page=1&limit=10&status=approved (Admin)
const getAllReviews = async (req, res, next) => {
  try {
    const { page, limit, status } = req.query

    const result = await reviewService.getAllReviews({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
      status
    })

    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

/**
 * Lấy các đánh giá của một sản phẩm
 * GET /api/v1/reviews/products/:productId?page=1&limit=10&status=approved
 * @param {string} req.params.productId - ID của sản phẩm
 * @param {object} req.query - Tham số (page, limit, status)
 * @returns {object} Danh sách đánh giá của sản phẩm và thông tin phân trang
 */
// GET /api/v1/reviews/products/:productId?page=1&limit=10&status=approved
const getReviewsByProductId = async (req, res, next) => {
  try {
    const { productId } = req.params
    const { page, limit, status } = req.query

    const result = await reviewService.getReviewsByProductId(productId, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
      status
    })

    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

/**
 * Tạo đánh giá mới cho sản phẩm
 * POST /api/v1/reviews
 * Người dùng chỉ có thể đánh giá sản phẩm đã mua và giao thành công
 * @param {object} req.body - Thông tin đánh giá (productId, rating, comment, orderId)
 * @returns {object} Đánh giá vừa tạo
 */
// POST /api/v1/reviews
const createReview = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded._id
    const username = req.jwtDecoded.username
    const reviewData = {
      ...req.body,
      userId,
      username
    }

    const result = await reviewService.createReview(reviewData)

    res.status(StatusCodes.CREATED).json(result)
  } catch (error) {
    next(error)
  }
}

/**
 * Cập nhật đánh giá (Admin)
 * PUT /api/v1/reviews/:reviewId
 * Admin có thể duyệt hoặc từ chối đánh giá (cập nhật status)
 * @param {string} req.params.reviewId - ID của đánh giá
 * @param {object} req.body - Dữ liệu cần cập nhật (status, adminNote)
 * @returns {object} Đánh giá đã cập nhật
 */
// PUT /api/v1/reviews/:reviewId (Admin)
const updateReview = async (req, res, next) => {
  try {
    const { reviewId } = req.params
    const updateData = req.body

    const result = await reviewService.updateReview(reviewId, updateData)

    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

/**
 * Xóa đánh giá
 * DELETE /api/v1/reviews/:reviewId
 * Người dùng chỉ xóa được đánh giá của mình, Admin xóa được tất cả
 * @param {string} req.params.reviewId - ID của đánh giá
 * @returns {object} Thông báo xóa thành công
 */
// DELETE /api/v1/reviews/:reviewId
const deleteReview = async (req, res, next) => {
  try {
    const { reviewId } = req.params
    const userId = req.jwtDecoded._id

    await reviewService.deleteReview(reviewId, userId)

    res.status(StatusCodes.OK).json({
      message: 'Review deleted successfully'
    })
  } catch (error) {
    next(error)
  }
}

export const reviewController = {
  getAllReviews,
  getReviewsByProductId,
  createReview,
  updateReview,
  deleteReview
}
