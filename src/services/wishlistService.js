import { StatusCodes } from 'http-status-codes'
import { ObjectId } from 'mongodb'
import { wishlistModel } from '~/models/wishlistModel'
import { productModel } from '~/models/productModel'
import ApiError from '~/utils/ApiError'
import { WISHLIST_PAGINATION } from '~/utils/constants'

/**
 * Lấy danh sách yêu thích của người dùng với phân trang
 * Tự động tạo wishlist nếu người dùng chưa có
 * @param {string} userId - ID người dùng
 * @param {object} queryParams - Tham số phân trang (page, limit)
 * @returns {object} { data: sản phẩm, pagination: thông tin trang }
 */
const getWishlist = async (userId, queryParams = {}) => {
  try {
    const {
      page = WISHLIST_PAGINATION.DEFAULT_PAGE,
      limit = WISHLIST_PAGINATION.DEFAULT_LIMIT
    } = queryParams

    // Xác thực và giới hạn phân trang
    const validatedPage = Math.max(parseInt(page) || WISHLIST_PAGINATION.DEFAULT_PAGE, WISHLIST_PAGINATION.DEFAULT_PAGE)
    const validatedLimit = Math.min(
      Math.max(parseInt(limit) || WISHLIST_PAGINATION.DEFAULT_LIMIT, WISHLIST_PAGINATION.MIN_LIMIT),
      WISHLIST_PAGINATION.MAX_LIMIT
    )

    // Kiểm tra wishlist tồn tại, tạo mới nếu chưa có
    let wishlist = await wishlistModel.findByUserId(userId)
    if (!wishlist) {
      await wishlistModel.createWishlist(userId)
    }

    // Lấy wishlist có phân trang
    const result = await wishlistModel.findByUserIdWithPagination(userId, {
      page: validatedPage,
      limit: validatedLimit
    })

    // Transform response structure
    return {
      data: result.items,
      pagination: {
        currentPage: result.pagination.page,
        totalPages: result.pagination.totalPages,
        totalItems: result.pagination.total,
        hasNextPage: result.pagination.page < result.pagination.totalPages,
        hasPrevPage: result.pagination.page > 1
      }
    }
  } catch (error) {
    throw error
  }
}

/**
 * Thêm sản phẩm vào danh sách yêu thích
 * Quy trình:
 * 1. Xác thực productId hợp lệ
 * 2. Kiểm tra sản phẩm tồn tại
 * 3. Kiểm tra sản phẩm chưa có trong wishlist
 * 4. Thêm vào wishlist
 * @param {string} userId - ID người dùng
 * @param {string} productId - ID sản phẩm
 * @returns {object} Kết quả thêm vào wishlist
 */
const addToWishlist = async (userId, productId) => {
  try {
    // Xác thực định dạng productId
    if (!ObjectId.isValid(productId)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid product ID')
    }

    // Kiểm tra sản phẩm có tồn tại không
    const product = await productModel.findOneById(productId)
    if (!product) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Product not found')
    }

    // Kiểm tra sản phẩm đã có trong wishlist chưa
    const isInWishlist = await wishlistModel.isProductInWishlist(userId, productId)
    if (isInWishlist) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Product already in wishlist')
    }

    // Prepare product data for wishlist
    const productData = {
      productId: product._id.toString(),
      name: product.name,
      slug: product.slug,
      price: product.price,
      image: product.images && product.images.length > 0 ? product.images[0] : ''
    }

    // Add to wishlist
    const result = await wishlistModel.addProduct(userId, productData)

    return result
  } catch (error) {
    throw error
  }
}

/**
 * Xóa sản phẩm khỏi danh sách yêu thích
 * @param {string} userId - ID người dùng
 * @param {string} productId - ID sản phẩm cần xóa
 * @returns {object} Kết quả xóa khỏi wishlist
 */
const removeFromWishlist = async (userId, productId) => {
  try {
    // Validate productId format
    if (!ObjectId.isValid(productId)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid product ID')
    }

    // Check if product is in wishlist
    const isInWishlist = await wishlistModel.isProductInWishlist(userId, productId)
    if (!isInWishlist) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Product not found in wishlist')
    }

    // Remove from wishlist
    const result = await wishlistModel.removeProduct(userId, productId)

    return result
  } catch (error) {
    throw error
  }
}

// Remove multiple products or clear wishlist
const removeMultipleFromWishlist = async (userId, productIds) => {
  try {
    // If no productIds provided or empty array, clear entire wishlist
    if (!productIds || productIds.length === 0) {
      const result = await wishlistModel.clearWishlist(userId)
      return result
    }

    // Validate all productIds
    const invalidIds = productIds.filter(id => !ObjectId.isValid(id))
    if (invalidIds.length > 0) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'One or more product IDs are invalid')
    }

    // Remove multiple products
    const result = await wishlistModel.removeMultipleProducts(userId, productIds)

    return result
  } catch (error) {
    throw error
  }
}

export const wishlistService = {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  removeMultipleFromWishlist
}
