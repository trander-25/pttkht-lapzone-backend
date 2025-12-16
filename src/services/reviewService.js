import { StatusCodes } from 'http-status-codes'
import { ObjectId } from 'mongodb'
import { reviewModel } from '~/models/reviewModel'
import { productModel } from '~/models/productModel'
import ApiError from '~/utils/ApiError'

/**
 * Lấy tất cả đánh giá (Admin)
 * @param {object} options - Tùy chọn phân trang và lọc (page, limit, status)
 * @returns {object} Danh sách đánh giá với thông tin phân trang
 */
const getAllReviews = async (options) => {
  try {
    const result = await reviewModel.getAllReviews(options)
    return result
  } catch (error) {
    throw error
  }
}

/**
 * Lấy các đánh giá theo ID sản phẩm
 * Kiểm tra sản phẩm tồn tại và trả về danh sách đánh giá
 * @param {string} productId - ID sản phẩm
 * @param {object} options - Tùy chọn phân trang (page, limit, status)
 * @returns {object} Danh sách đánh giá của sản phẩm
 */
const getReviewsByProductId = async (productId, options) => {
  try {
    // Xác thực định dạng ObjectId
    if (!ObjectId.isValid(productId)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid product ID')
    }

    // Kiểm tra sản phẩm có tồn tại không
    const product = await productModel.findOneById(productId)
    if (!product) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Product not found')
    }

    const result = await reviewModel.getReviewsByProductId(productId, options)
    return result
  } catch (error) {
    throw error
  }
}

/**
 * Tạo đánh giá mới cho sản phẩm
 * Quy trình:
 * 1. Kiểm tra sản phẩm tồn tại
 * 2. Thêm tên sản phẩm vào đánh giá
 * 3. Set trạng thái ban đầu là PENDING (chờ duyệt)
 * @param {object} reviewData - { userId, productId, rating, comment, orderId }
 * @returns {object} Đánh giá vừa được tạo
 */
const createReview = async (reviewData) => {
  try {
    const { userId, productId } = reviewData

    // Kiểm tra sản phẩm có tồn tại không
    const product = await productModel.findOneById(productId)
    if (!product) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Product not found')
    }

    // Thêm tên sản phẩm và set trạng thái ban đầu
    const reviewToCreate = {
      ...reviewData,
      productName: product.name,
      status: reviewModel.REVIEW_STATUS.PENDING // Chờ admin duyệt
    }

    const result = await reviewModel.createReview(reviewToCreate)

    // Lấy đánh giá vừa tạo
    const createdReview = await reviewModel.findOneById(result.insertedId)

    return createdReview
  } catch (error) {
    throw error
  }
}

/**
 * Cập nhật đánh giá (Admin)
 * Admin có thể thay đổi trạng thái (duyệt/từ chối) và thêm ghi chú
 * @param {string} reviewId - ID đánh giá
 * @param {object} updateData - Dữ liệu cập nhật (status, adminNote)
 * @returns {object} Đánh giá đã cập nhật
 */
const updateReview = async (reviewId, updateData) => {
  try {
    // Xác thực ObjectId
    if (!ObjectId.isValid(reviewId)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid review ID')
    }

    // Kiểm tra đánh giá có tồn tại không
    const existingReview = await reviewModel.findOneById(reviewId)
    if (!existingReview) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Review not found')
    }

    // Xác thực status nếu được cung cấp
    if (updateData.status && !Object.values(reviewModel.REVIEW_STATUS).includes(updateData.status)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid status value')
    }

    // Cập nhật đánh giá
    const result = await reviewModel.updateReview(reviewId, updateData)

    return result
  } catch (error) {
    throw error
  }
}

/**
 * Xóa đánh giá
 * Người dùng chỉ xóa được đánh giá của mình, Admin xóa được tất cả
 * @param {string} reviewId - ID đánh giá
 * @param {string} userId - ID người dùng yêu cầu xóa
 * @returns {void}
 */
const deleteReview = async (reviewId, userId) => {
  try {
    // Validate ObjectId
    if (!ObjectId.isValid(reviewId)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid review ID')
    }

    // Check if review exists
    const existingReview = await reviewModel.findOneById(reviewId)
    if (!existingReview) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Review not found')
    }

    // Check if user owns this review
    if (existingReview.userId.toString() !== userId.toString()) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'You can only delete your own reviews')
    }

    // Delete review
    const result = await reviewModel.deleteReview(reviewId)

    if (result.deletedCount === 0) {
      throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to delete review')
    }

    return { success: true }
  } catch (error) {
    throw error
  }
}

export const reviewService = {
  getAllReviews,
  getReviewsByProductId,
  createReview,
  updateReview,
  deleteReview
}
