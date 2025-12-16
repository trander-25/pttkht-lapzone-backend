/**
 * WISHLISTMODEL.JS - MODEL QUẢN LÝ DANH SÁCH YÊU THÍCH
 *
 * Collection: wishlists
 * Mỗi user có 1 wishlist duy nhất
 *
 * Schema:
 * - userId: ObjectId của user
 * - items: array sản phẩm yêu thích
 *   + productId, name, slug, price, image
 *   + addedAt: thời điểm thêm vào wishlist
 *
 * Chức năng:
 * - User lưu sản phẩm để mua sau
 * - Hiển thị wishlist với pagination
 * - Dễ dàng thêm vào giỏ hàng từ wishlist
 */

import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'
import { OBJECT_ID_RULE, FIELD_REQUIRED_MESSAGE } from '~/utils/validators'

// Define MongoDB collection name
const WISHLIST_COLLECTION_NAME = 'wishlists'

// Joi validation schema
const WISHLIST_COLLECTION_SCHEMA = Joi.object({
  userId: Joi.string().required().pattern(OBJECT_ID_RULE).messages({
    'any.required': FIELD_REQUIRED_MESSAGE,
    'string.pattern.base': 'User ID must be a valid ObjectId'
  }),

  items: Joi.array().items(
    Joi.object({
      productId: Joi.string().required().pattern(OBJECT_ID_RULE).messages({
        'any.required': 'Product ID is required',
        'string.pattern.base': 'Product ID must be a valid ObjectId'
      }),
      name: Joi.string().required().trim(),
      slug: Joi.string().required().trim(),
      price: Joi.number().positive().required(),
      image: Joi.string().uri().optional(),
      addedAt: Joi.date().timestamp('javascript').default(Date.now)
    })
  ).default([]),

  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null)
})

/**
 * Validate dữ liệu trước khi tạo wishlist
 * @param {Object} data - Wishlist data
 * @returns {Promise<Object>} Valid data
 */
const validateBeforeCreate = async (data) => {
  return await WISHLIST_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
}

/**
 * Tìm wishlist theo userId
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} Wishlist document
 */
const findByUserId = async (userId) => {
  try {
    const result = await GET_DB().collection(WISHLIST_COLLECTION_NAME).findOne({
      userId: new ObjectId(userId)
    })
    return result
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * Tìm wishlist với pagination (slice items array)
 * @param {string} userId - User ID
 * @param {Object} options - { page, limit }
 * @returns {Promise<Object>} { items, pagination }
 */
const findByUserIdWithPagination = async (userId, options = {}) => {
  try {
    const { page = 1, limit = 12 } = options

    const wishlist = await GET_DB().collection(WISHLIST_COLLECTION_NAME).findOne({
      userId: new ObjectId(userId)
    })

    if (!wishlist || !wishlist.items) {
      return {
        items: [],
        pagination: {
          page: 1,
          totalPages: 0,
          total: 0
        }
      }
    }

    // Calculate pagination
    const total = wishlist.items.length
    const totalPages = Math.ceil(total / limit)
    const skip = (page - 1) * limit

    // Slice items for pagination
    const paginatedItems = wishlist.items.slice(skip, skip + limit)

    return {
      items: paginatedItems,
      pagination: {
        page,
        totalPages,
        total
      }
    }
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * Tạo wishlist mới cho user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Insert result
 */
const createWishlist = async (userId) => {
  try {
    const validData = await validateBeforeCreate({
      userId: userId.toString(),
      items: []
    })

    const result = await GET_DB().collection(WISHLIST_COLLECTION_NAME).insertOne({
      ...validData,
      userId: new ObjectId(userId),
      createdAt: Date.now(),
      updatedAt: null
    })

    return result
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * Thêm sản phẩm vào wishlist
 * Tự động tạo wishlist nếu user chưa có (upsert: true)
 * @param {string} userId - User ID
 * @param {Object} productData - { productId, name, slug, price, image }
 * @returns {Promise<Object>} Updated wishlist
 */
const addProduct = async (userId, productData) => {
  try {
    const result = await GET_DB().collection(WISHLIST_COLLECTION_NAME).findOneAndUpdate(
      { userId: new ObjectId(userId) },
      {
        $push: {
          items: {
            productId: new ObjectId(productData.productId),
            name: productData.name,
            slug: productData.slug,
            price: productData.price,
            image: productData.image || '',
            addedAt: Date.now()
          }
        },
        $set: { updatedAt: Date.now() }
      },
      { returnDocument: 'after', upsert: true }
    )

    return result
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * Xóa sản phẩm khỏi wishlist
 * @param {string} userId - User ID
 * @param {string} productId - Product ID cần xóa
 * @returns {Promise<Object>} Updated wishlist
 */
const removeProduct = async (userId, productId) => {
  try {
    const result = await GET_DB().collection(WISHLIST_COLLECTION_NAME).findOneAndUpdate(
      { userId: new ObjectId(userId) },
      {
        $pull: { items: { productId: new ObjectId(productId) } },
        $set: { updatedAt: Date.now() }
      },
      { returnDocument: 'after' }
    )

    return result
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * Xóa nhiều sản phẩm khỏi wishlist (batch delete)
 * @param {string} userId - User ID
 * @param {Array<string>} productIds - Array các Product IDs cần xóa
 * @returns {Promise<Object>} Updated wishlist
 */
const removeMultipleProducts = async (userId, productIds) => {
  try {
    const objectIds = productIds.map(id => new ObjectId(id))
    const result = await GET_DB().collection(WISHLIST_COLLECTION_NAME).findOneAndUpdate(
      { userId: new ObjectId(userId) },
      {
        $pull: { items: { productId: { $in: objectIds } } },
        $set: { updatedAt: Date.now() }
      },
      { returnDocument: 'after' }
    )

    return result
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * Kiểm tra sản phẩm có trong wishlist không
 * @param {string} userId - User ID
 * @param {string} productId - Product ID cần kiểm tra
 * @returns {Promise<boolean>} true nếu có, false nếu không
 */
const isProductInWishlist = async (userId, productId) => {
  try {
    const wishlist = await GET_DB().collection(WISHLIST_COLLECTION_NAME).findOne({
      userId: new ObjectId(userId),
      'items.productId': new ObjectId(productId)
    })

    return wishlist !== null
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * Xóa tất cả items trong wishlist
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Updated wishlist
 */
const clearWishlist = async (userId) => {
  try {
    const result = await GET_DB().collection(WISHLIST_COLLECTION_NAME).findOneAndUpdate(
      { userId: new ObjectId(userId) },
      {
        $set: { items: [], updatedAt: Date.now() }
      },
      { returnDocument: 'after' }
    )

    return result
  } catch (error) {
    throw new Error(error)
  }
}

export const wishlistModel = {
  WISHLIST_COLLECTION_NAME,
  findByUserId,
  findByUserIdWithPagination,
  createWishlist,
  addProduct,
  removeProduct,
  removeMultipleProducts,
  isProductInWishlist,
  clearWishlist
}
