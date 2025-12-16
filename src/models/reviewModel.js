/**
 * REVIEWMODEL.JS - MODEL QUẢN LÝ ĐÁNH GIÁ SẢN PHẨM
 *
 * Collection: reviews
 * User đánh giá sản phẩm đã mua
 *
 * Review Status:
 * - pending: Chờ admin duyệt
 * - approved: Đã duyệt, hiển thị trên web
 * - rejected: Bị từ chối (spam, nội dung không phù hợp)
 *
 * Schema:
 * - userId, username (snapshot từ user)
 * - productId, productName (snapshot từ product)
 * - rating: 1-5 sao
 * - comment: nội dung đánh giá (tối thiểu 5 ký tự)
 * - status: pending/approved/rejected
 *
 * Cập nhật avgRating và totalReviews của product khi approve/reject
 */

import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'
import { OBJECT_ID_RULE, FIELD_REQUIRED_MESSAGE } from '~/utils/validators'

// Define review status
const REVIEW_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
}

// Define rating values
const REVIEW_RATING = {
  MIN: 1,
  MAX: 5
}

// Define MongoDB collection name
const REVIEW_COLLECTION_NAME = 'reviews'

// Joi validation schema
const REVIEW_COLLECTION_SCHEMA = Joi.object({
  userId: Joi.string().required().pattern(OBJECT_ID_RULE).messages({
    'any.required': FIELD_REQUIRED_MESSAGE,
    'string.pattern.base': 'User ID must be a valid ObjectId'
  }),

  username: Joi.string().trim().optional(),

  productId: Joi.string().required().pattern(OBJECT_ID_RULE).messages({
    'any.required': FIELD_REQUIRED_MESSAGE,
    'string.pattern.base': 'Product ID must be a valid ObjectId'
  }),

  productName: Joi.string().trim().optional(),

  rating: Joi.number().integer().min(REVIEW_RATING.MIN).max(REVIEW_RATING.MAX).required().messages({
    'any.required': 'Rating is required',
    'number.min': `Rating must be at least ${REVIEW_RATING.MIN}`,
    'number.max': `Rating must be at most ${REVIEW_RATING.MAX}`,
    'number.integer': 'Rating must be an integer'
  }),

  comment: Joi.string().required().trim().min(5).messages({
    'any.required': 'Comment is required',
    'string.min': 'Comment must be at least 5 characters'
  }),

  status: Joi.string().valid(...Object.values(REVIEW_STATUS)).optional(),

  createdAt: Joi.number().optional(),
  updatedAt: Joi.number().allow(null).optional()
})

/**
 * Validate dữ liệu trước khi tạo review
 * @param {Object} data - Review data
 * @returns {Promise<Object>} Valid data
 */
const validateBeforeCreate = async (data) => {
  return await REVIEW_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
}

/**
 * Tạo review mới (user đánh giá sản phẩm)
 * Mặc định status=pending, chờ admin duyệt
 * @param {Object} data - { userId, productId, rating, comment }
 * @returns {Promise<Object>} Insert result
 */
const createReview = async (data) => {
  try {
    const validData = await validateBeforeCreate(data)

    // Convert string IDs to ObjectId before inserting
    const result = await GET_DB().collection(REVIEW_COLLECTION_NAME).insertOne({
      ...validData,
      userId: new ObjectId(validData.userId),
      productId: new ObjectId(validData.productId),
      createdAt: Date.now(),
      updatedAt: null
    })
    return result
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * Tìm review theo ID
 * @param {string} reviewId - Review ID
 * @returns {Promise<Object|null>} Review document
 */
const findOneById = async (reviewId) => {
  try {
    const result = await GET_DB().collection(REVIEW_COLLECTION_NAME).findOne({
      _id: new ObjectId(reviewId)
    })
    return result
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * Lấy tất cả reviews với pagination và filter (Admin)
 * Tự động populate username từ collection users nếu thiếu
 * @param {Object} options - { page, limit, status }
 * @returns {Promise<Object>} { reviews, pagination }
 */
const getAllReviews = async (options = {}) => {
  try {
    const {
      page = 1,
      limit = 10,
      status
    } = options

    const query = {}
    if (status) {
      query.status = status
    }

    const skip = (page - 1) * limit

    const [reviews, total] = await Promise.all([
      GET_DB().collection(REVIEW_COLLECTION_NAME)
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      GET_DB().collection(REVIEW_COLLECTION_NAME).countDocuments(query)
    ])

    // Populate username từ users collection nếu thiếu
    const reviewsWithUsername = await Promise.all(
      reviews.map(async (review) => {
        // Nếu username đã có, trả về nguyên bản
        if (review.username || review.userName) {
          return review
        }

        // Nếu không, lấy từ users collection
        try {
          // Convert userId thành ObjectId nếu là string
          const userId = typeof review.userId === 'string'
            ? new ObjectId(review.userId)
            : review.userId

          const user = await GET_DB().collection('users').findOne({
            _id: userId
          })

          if (user && user.username) {
            return {
              ...review,
              username: user.username
            }
          }
        } catch (error) {
          // Nếu không tìm thấy user, trả về review gốc
          // Silent fail - username sẽ là undefined
        }

        return review
      })
    )

    const totalPages = Math.ceil(total / limit)

    return {
      reviews: reviewsWithUsername,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    }
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * Lấy reviews của sản phẩm với pagination và thống kê rating
 * Mặc định chỉ lấy reviews approved (cho users)
 * Tính toán avgRating và ratingDistribution (5 sao, 4 sao, ...)
 * @param {string} productId - Product ID
 * @param {Object} options - { page, limit, status }
 * @returns {Promise<Object>} { reviews, statistics, pagination }
 */
const getReviewsByProductId = async (productId, options = {}) => {
  try {
    const {
      page = 1,
      limit = 10,
      status = REVIEW_STATUS.APPROVED // Mặc định chỉ hiển thị reviews đã duyệt cho users
    } = options

    const query = {
      productId: new ObjectId(productId)
    }

    if (status) {
      query.status = status
    }

    const skip = (page - 1) * limit

    const [reviews, total] = await Promise.all([
      GET_DB().collection(REVIEW_COLLECTION_NAME)
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      GET_DB().collection(REVIEW_COLLECTION_NAME).countDocuments(query)
    ])

    // Tính toán thống kê rating cho sản phẩm này
    const ratingStats = await GET_DB().collection(REVIEW_COLLECTION_NAME)
      .aggregate([
        { $match: { productId: new ObjectId(productId), status: REVIEW_STATUS.APPROVED } },
        {
          $group: {
            _id: null,
            averageRating: { $avg: '$rating' },
            totalReviews: { $sum: 1 },
            rating5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
            rating4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
            rating3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
            rating2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
            rating1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } }
          }
        }
      ])
      .toArray()

    const stats = ratingStats.length > 0 ? ratingStats[0] : {
      averageRating: 0,
      totalReviews: 0,
      rating5: 0,
      rating4: 0,
      rating3: 0,
      rating2: 0,
      rating1: 0
    }

    const totalPages = Math.ceil(total / limit)

    return {
      reviews,
      statistics: {
        averageRating: Math.round(stats.averageRating * 10) / 10, // Round to 1 decimal
        totalReviews: stats.totalReviews,
        ratingDistribution: {
          5: stats.rating5,
          4: stats.rating4,
          3: stats.rating3,
          2: stats.rating2,
          1: stats.rating1
        }
      },
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    }
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * Cập nhật review (Admin duyệt/từ chối)
 * Khi approve/reject cần update avgRating và totalReviews của product
 * @param {string} reviewId - Review ID
 * @param {Object} updateData - { status, rating, comment }
 * @returns {Promise<Object>} Updated review
 */
const updateReview = async (reviewId, updateData) => {
  try {
    const result = await GET_DB().collection(REVIEW_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(reviewId) },
      {
        $set: {
          ...updateData,
          updatedAt: Date.now()
        }
      },
      { returnDocument: 'after' }
    )

    return result
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * Xóa review
 * @param {string} reviewId - Review ID
 * @returns {Promise<Object>} Delete result
 */
const deleteReview = async (reviewId) => {
  try {
    const result = await GET_DB().collection(REVIEW_COLLECTION_NAME).deleteOne({
      _id: new ObjectId(reviewId)
    })
    return result
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * Kiểm tra user đã review sản phẩm này chưa
 * Dùng để ngăn user review trùng lặp
 * @param {string} userId - User ID
 * @param {string} productId - Product ID
 * @returns {Promise<boolean>} true nếu đã review, false nếu chưa
 */
const checkUserReviewed = async (userId, productId) => {
  try {
    const review = await GET_DB().collection(REVIEW_COLLECTION_NAME).findOne({
      userId: new ObjectId(userId),
      productId: new ObjectId(productId)
    })
    return review !== null
  } catch (error) {
    throw new Error(error)
  }
}

export const reviewModel = {
  REVIEW_COLLECTION_NAME,
  REVIEW_STATUS,
  REVIEW_RATING,
  createReview,
  findOneById,
  getAllReviews,
  getReviewsByProductId,
  updateReview,
  deleteReview,
  checkUserReviewed
}
