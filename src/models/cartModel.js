/**
 * CARTMODEL.JS - MODEL QUẢN LÝ GIỎ HÀNG
 *
 * Collection: carts
 * Mỗi user có 1 cart duy nhất (1-1 relationship)
 *
 * Schema:
 * - userId: ObjectId - User sở hữu cart (required, unique per user)
 * - items: array - Danh sách sản phẩm trong giỏ (default: [])
 *   + productId: ObjectId - ID sản phẩm (required)
 *   + name: string - Tên sản phẩm (required, snapshot từ product)
 *   + price: number - Giá sản phẩm (required, min: 0, snapshot từ product)
 *   + image: string - URL hình ảnh sản phẩm (optional)
 *   + quantity: number - Số lượng (required, default: 1, min: 1)
 *   + selected: boolean - Sản phẩm có được chọn để checkout không (default: false)
 * - selectedAmount: number - Tổng giá trị các items được chọn (selected=true, default: 0, min: 0)
 * - updatedAt: number (timestamp) - Thời gian cập nhật cuối (default: null)
 *
 * Business Logic:
 * - Tự động tạo cart (upsert) khi user thêm sản phẩm lần đầu
 * - Nếu productId đã tồn tại → tăng quantity
 * - Nếu productId chưa có → thêm mới vào items array
 * - selectedAmount tự động tính lại sau mỗi thao tác update/delete
 * - Formula: selectedAmount = sum(price × quantity) của items có selected=true
 *
 * Chức năng:
 * - Add/Update item (tự động merge nếu trùng productId)
 * - Update quantity, selected status
 * - Delete item / Delete selected items
 * - Auto calculate selectedAmount
 */

import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'
import { FIELD_REQUIRED_MESSAGE, OBJECT_ID_RULE } from '~/utils/validators'

// Tên collection và schema validation
const CART_COLLECTION_NAME = 'carts'
const CART_COLLECTION_SCHEMA = Joi.object({
  userId: Joi.string().required().pattern(OBJECT_ID_RULE).messages({
    'any.required': FIELD_REQUIRED_MESSAGE,
    'string.empty': FIELD_REQUIRED_MESSAGE,
    'string.pattern.base': 'userId must be a valid ObjectId'
  }),

  items: Joi.array().items(
    Joi.object({
      productId: Joi.string().required().pattern(OBJECT_ID_RULE).messages({
        'any.required': 'Product ID is required',
        'string.pattern.base': 'Product ID must be a valid ObjectId'
      }),
      name: Joi.string().required().messages({
        'any.required': 'Product name is required'
      }),
      price: Joi.number().required().min(0).messages({
        'any.required': 'Product price is required',
        'number.min': 'Price must be greater than or equal to 0'
      }),
      image: Joi.string().allow('').optional(),
      quantity: Joi.number().required().default(1).messages({
        'any.required': 'Quantity is required',
        'number.min': 'Quantity must be at least 1'
      }),
      selected: Joi.boolean().default(false) // Sản phẩm có được chọn để checkout không
    })
  ).default([]),

  selectedAmount: Joi.number().default(0).min(0),

  updatedAt: Joi.date().timestamp('javascript').default(null)
})

/**
 * Validate dữ liệu trước khi tạo cart
 * @param {Object} data - Cart data
 * @returns {Promise<Object>} Valid data
 */
const validateBeforeCreate = async (data) => {
  return await CART_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
}

/**
 * Tạo giỏ hàng mới cho user
 * @param {Object} data - Cart data (userId, items)
 * @returns {Promise<Object>} Insert result
 */
const createCart = async (data) => {
  try {
    const validData = await validateBeforeCreate(data)
    const newCartToCreate = {
      ...validData,
      userId: new ObjectId(validData.userId),
      updatedAt: null
    }

    const createdCart = await GET_DB().collection(CART_COLLECTION_NAME).insertOne(newCartToCreate)
    return createdCart
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * Tìm giỏ hàng theo userId
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} Cart document
 */
const findByUserId = async (userId) => {
  try {
    const result = await GET_DB().collection(CART_COLLECTION_NAME).findOne({
      userId: new ObjectId(userId)
    })
    return result
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * Thêm sản phẩm vào giỏ hoặc tăng số lượng nếu đã có
 * - Tự động tạo cart mới nếu user chưa có
 * - Tăng quantity nếu sản phẩm đã tồn tại
 * - Thêm mới nếu chưa có
 * @param {string} userId - User ID
 * @param {Object} itemData - { productId, name, price, image, quantity }
 * @returns {Promise<Object>} Updated cart
 */
const addOrUpdateItem = async (userId, itemData) => {
  try {
    const cart = await findByUserId(userId)

    if (!cart) {
      // Tạo giỏ hàng mới nếu user chưa có
      const newCart = {
        userId: userId,
        items: [{
          productId: itemData.productId,
          name: itemData.name,
          price: itemData.price,
          image: itemData.image || '',
          quantity: itemData.quantity || 1,
          selected: false
        }],
        selectedAmount: 0
      }
      await createCart(newCart)
      return await findByUserId(userId)
    }

    // Kiểm tra sản phẩm đã có trong giỏ chưa
    const existingItemIndex = cart.items.findIndex(
      item => item.productId.toString() === itemData.productId.toString()
    )

    if (existingItemIndex > -1) {
      // Tăng số lượng nếu sản phẩm đã tồn tại
      await GET_DB().collection(CART_COLLECTION_NAME).findOneAndUpdate(
        {
          userId: new ObjectId(userId),
          'items.productId': new ObjectId(itemData.productId)
        },
        {
          $inc: { [`items.${existingItemIndex}.quantity`]: itemData.quantity || 1 },
          $set: { updatedAt: Date.now() }
        },
        { returnDocument: 'after' }
      )

      // Tính lại tổng tiền
      await updateTotalAmount(userId)
      return await findByUserId(userId)
    } else {
      // Thêm sản phẩm mới vào giỏ
      await GET_DB().collection(CART_COLLECTION_NAME).findOneAndUpdate(
        { userId: new ObjectId(userId) },
        {
          $push: {
            items: {
              productId: new ObjectId(itemData.productId),
              name: itemData.name,
              price: itemData.price,
              image: itemData.image || '',
              quantity: itemData.quantity || 1,
              selected: false
            }
          },
          $set: { updatedAt: Date.now() }
        },
        { returnDocument: 'after' }
      )

      // Tính lại tổng tiền
      await updateTotalAmount(userId)
      return await findByUserId(userId)
    }
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * Cập nhật tổng tiền của giỏ hàng
 * Tính selectedAmount: tổng tiền các items được chọn (selected=true)
 * @param {string} userId - User ID
 * @returns {Promise<Object>} { selectedAmount }
 */
const updateTotalAmount = async (userId) => {
  try {
    const cart = await findByUserId(userId)
    if (!cart) return null

    // Tính tổng tiền các items được chọn (selected=true)
    const selectedAmount = cart.items.reduce((sum, item) => {
      if (item.selected) {
        return sum + (item.price * item.quantity)
      }
      return sum
    }, 0)

    await GET_DB().collection(CART_COLLECTION_NAME).updateOne(
      { userId: new ObjectId(userId) },
      {
        $set: {
          selectedAmount,
          updatedAt: Date.now()
        }
      }
    )

    return { selectedAmount }
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * Lấy giỏ hàng với tất cả items
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} Cart document với items array
 */
const getCart = async (userId) => {
  try {
    const cart = await findByUserId(userId)
    return cart
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * Cập nhật item trong giỏ hàng (quantity, selected)
 * Có thể cập nhật:
 * - quantity: Số lượng sản phẩm
 * - selected: Trạng thái chọn để checkout
 * Tự động tính lại selectedAmount sau khi cập nhật
 * @param {string} userId - User ID
 * @param {string} productId - Product ID
 * @param {Object} updateData - { quantity, selected }
 * @returns {Promise<Object>} Updated cart
 */
const updateItem = async (userId, productId, updateData) => {
  try {
    const cart = await findByUserId(userId)
    if (!cart) {
      throw new Error('Cart not found')
    }

    // Tìm index của item trong giỏ
    const itemIndex = cart.items.findIndex(
      item => item.productId.toString() === productId.toString()
    )

    if (itemIndex === -1) {
      throw new Error('Product not found in cart')
    }

    // Chuẩn bị object cập nhật
    const updateFields = {}
    if (updateData.quantity !== undefined) {
      updateFields[`items.${itemIndex}.quantity`] = updateData.quantity
    }
    if (updateData.selected !== undefined) {
      updateFields[`items.${itemIndex}.selected`] = updateData.selected
    }

    // Cập nhật item
    await GET_DB().collection(CART_COLLECTION_NAME).updateOne(
      { userId: new ObjectId(userId) },
      {
        $set: {
          ...updateFields,
          updatedAt: Date.now()
        }
      }
    )

    // Tính lại tổng tiền (quan trọng!)
    await updateTotalAmount(userId)

    return await findByUserId(userId)
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * Xóa item khỏi giỏ hàng
 * Sử dụng $pull operator để xóa item khỏi array
 * Tự động tính lại selectedAmount
 * @param {string} userId - User ID
 * @param {string} productId - Product ID cần xóa
 * @returns {Promise<Object>} Updated cart
 */
const deleteItem = async (userId, productId) => {
  try {
    const cart = await findByUserId(userId)
    if (!cart) {
      throw new Error('Cart not found')
    }

    // Kiểm tra sản phẩm có trong giỏ không
    const itemExists = cart.items.some(
      item => item.productId.toString() === productId.toString()
    )

    if (!itemExists) {
      throw new Error('Product not found in cart')
    }

    // Xóa item khỏi giỏ sử dụng $pull
    await GET_DB().collection(CART_COLLECTION_NAME).updateOne(
      { userId: new ObjectId(userId) },
      {
        $pull: {
          items: { productId: new ObjectId(productId) }
        }
      }
    )

    // Tính lại tổng tiền
    await updateTotalAmount(userId)

    return await findByUserId(userId)
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * Xóa nhiều items khỏi giỏ hàng (xóa các items đã chọn)
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Updated cart
 */
const deleteSelectedItems = async (userId) => {
  try {
    const cart = await findByUserId(userId)
    if (!cart) {
      throw new Error('Cart not found')
    }

    // Xóa tất cả items có selected=true
    await GET_DB().collection(CART_COLLECTION_NAME).updateOne(
      { userId: new ObjectId(userId) },
      {
        $pull: {
          items: { selected: true }
        }
      }
    )

    // Tính lại tổng tiền
    await updateTotalAmount(userId)

    return await findByUserId(userId)
  } catch (error) {
    throw new Error(error)
  }
}

export const cartModel = {
  CART_COLLECTION_NAME,
  CART_COLLECTION_SCHEMA,
  createCart,
  findByUserId,
  addOrUpdateItem,
  updateTotalAmount,
  getCart,
  updateItem,
  deleteItem,
  deleteSelectedItems
}
