/**
 * USERMODEL.JS - MODEL QUẢN LÝ NGƯỜI DÙNG
 *
 * Collection: users
 * Chức năng:
 * - Quản lý thông tin người dùng (customer, manager, admin)
 * - Hỗ trợ đăng ký local (email/password) và Google OAuth
 * - Quản lý địa chỉ giao hàng (multi-address)
 * - Reset password với token có thời hạn
 * - Phân quyền RBAC theo role
 *
 * Schema chính:
 * - email (unique), password (required cho local, null cho google)
 * - username, phone, sex, avatar
 * - role: customer (default), manager, admin
 * - addresses: array các địa chỉ với addressId, street, ward, district, province, isDefault
 * - provider: local (default) hoặc google
 * - isActive: false (default) -> true sau khi verify email
 * - verifyToken: token để verify email lần đầu
 * - resetPasswordToken, resetPasswordExpires: token reset mật khẩu
 */

import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'
import { FIELD_REQUIRED_MESSAGE, EMAIL_RULE, EMAIL_RULE_MESSAGE, PHONE_RULE, PHONE_RULE_MESSAGE } from '~/utils/validators'

// Định nghĩa các role của user cho hệ thống phân quyền RBAC
const USER_ROLES = {
  CUSTOMER: 'customer', // Khách hàng - quyền mua hàng, review, chat AI
  MANAGER: 'manager',   // Quản lý - quyền quản lý sản phẩm, đơn hàng
  ADMIN: 'admin'        // Admin - full quyền quản trị toàn hệ thống
}

// Giới tính
const USER_SEX = {
  MALE: 'male',
  FEMALE: 'female'
}

// Provider - phương thức đăng ký/đăng nhập
const USER_PROVIDER = {
  LOCAL: 'local',   // Đăng ký bằng email/password
  GOOGLE: 'google'  // Đăng nhập bằng Google OAuth2
}

// Tên collection trong MongoDB
const USER_COLLECTION_NAME = 'users'

/**
 * Joi schema validation cho User
 * - email: bắt buộc, unique (kiểm tra ở service layer)
 * - password: bắt buộc nếu provider='local', null nếu provider='google'
 * - username: bắt buộc, tên hiển thị
 * - phone: optional, theo format PHONE_RULE
 * - sex: optional, male hoặc female
 * - avatar: optional, URL ảnh đại diện
 * - role: mặc định là 'customer'
 * - addresses: array địa chỉ, mỗi địa chỉ có addressId tự tạo bằng ObjectId
 * - provider: mặc định 'local', 'google' nếu đăng nhập qua OAuth
 * - isActive: mặc định false, cần verify email để active
 * - verifyToken: token verify email (tự động generate khi tạo user)
 * - resetPasswordToken, resetPasswordExpires: dùng cho chức năng reset password
 */
const USER_COLLECTION_SCHEMA = Joi.object({
  email: Joi.string().required().pattern(EMAIL_RULE).message(EMAIL_RULE_MESSAGE), // unique
  password: Joi.alternatives().conditional('provider', {
    is: 'local',
    then: Joi.string().required(),
    otherwise: Joi.string().allow(null, '').default(null)
  }),

  username: Joi.string().required().trim().strict(),
  phone: Joi.string().pattern(PHONE_RULE).message(PHONE_RULE_MESSAGE).default(null),
  sex: Joi.string().valid(...Object.values(USER_SEX)).default(null),
  avatar: Joi.string().default(null),
  role: Joi.string().valid(...Object.values(USER_ROLES)).default(USER_ROLES.CUSTOMER),

  addresses: Joi.array()
    .items(
      Joi.object({
        addressId: Joi.string().default(() => new ObjectId().toString()),
        street: Joi.string().required().trim().message(FIELD_REQUIRED_MESSAGE),
        ward: Joi.string().required().trim().message(FIELD_REQUIRED_MESSAGE),
        district: Joi.string().required().trim().message(FIELD_REQUIRED_MESSAGE),
        province: Joi.string().required().trim().message(FIELD_REQUIRED_MESSAGE),
        isDefault: Joi.boolean().default(false)
      }).unknown(false)
    )
    .default([]),

  provider: Joi.string().valid(...Object.values(USER_PROVIDER)).default(USER_PROVIDER.LOCAL),
  isActive: Joi.boolean().default(false),
  verifyToken: Joi.string(),

  resetPasswordToken: Joi.string().allow(null).default(null),
  resetPasswordExpires: Joi.date().timestamp('javascript').allow(null).default(null),

  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null)
})

// Các trường không được phép update (bảo vệ data integrity)
const INVALID_UPDATE_FIELDS = ['_id', 'email', 'createdAt']

/**
 * Validate dữ liệu trước khi create user mới
 * @param {Object} data - User data cần validate
 * @returns {Promise<Object>} Valid data sau khi validate
 */
const validateBeforeCreate = async (data) => {
  return await USER_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
}

/**
 * Tạo user mới trong database
 * @param {Object} data - User data (email, password, username, etc.)
 * @returns {Promise<Object>} Insert result với insertedId
 */
const createUser = async (data) => {
  try {
    const validData = await validateBeforeCreate(data)
    const createdUser = await GET_DB().collection(USER_COLLECTION_NAME).insertOne(validData)
    return createdUser
  } catch (error) { throw new Error(error) }
}

/**
 * Tìm user theo ID
 * @param {string} userId - User ObjectId string
 * @returns {Promise<Object|null>} User document hoặc null nếu không tìm thấy
 */
const findOneById = async (userId) => {
  try {
    const result = await GET_DB().collection(USER_COLLECTION_NAME).findOne({ _id: new ObjectId(userId) })
    return result
  } catch (error) { throw new Error(error) }
}

/**
 * Tìm user theo email (dùng khi login, check duplicate email)
 * @param {string} emailValue - Email cần tìm
 * @returns {Promise<Object|null>} User document hoặc null
 */
const findOneByEmail = async (emailValue) => {
  try {
    const result = await GET_DB().collection(USER_COLLECTION_NAME).findOne({ email: emailValue })
    return result
  } catch (error) { throw new Error(error) }
}

/**
 * Update thông tin user theo ID
 * Tự động filter các trường không được phép update (email, _id, createdAt)
 * @param {string} userId - User ID cần update
 * @param {Object} updateData - Data cần update
 * @returns {Promise<Object>} Updated user document
 */
const updateOneById = async (userId, updateData) => {
  try {
    // Lọc bỏ các field không được phép update để bảo vệ data integrity
    Object.keys(updateData).forEach(fieldName => {
      if (INVALID_UPDATE_FIELDS.includes(fieldName)) {
        delete updateData[fieldName]
      }
    })

    const result = await GET_DB().collection(USER_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(userId) },
      { $set: updateData },
      { returnDocument: 'after' } // Trả về document sau khi update thay vì trước update
    )

    return result
  } catch (error) { throw new Error(error) }
}

/**
 * Update địa chỉ cụ thể trong mảng addresses
 * Dùng khi user sửa 1 địa chỉ trong danh sách
 * @param {string} userId - User ID
 * @param {string} addressId - Address ID cần update
 * @param {Object} updateData - Data mới của address
 * @returns {Promise<Object>} Updated user document
 */
const updateAddressById = async (userId, addressId, updateData) => {
  try {
    const result = await GET_DB().collection(USER_COLLECTION_NAME).findOneAndUpdate(
      {
        _id: new ObjectId(userId),
        'addresses.addressId': addressId
      },
      { $set: { 'addresses.$': { ...updateData, addressId } } },
      { returnDocument: 'after' }
    )
    return result
  } catch (error) { throw new Error(error) }
}

/**
 * Xóa địa chỉ khỏi mảng addresses
 * Dùng $pull để remove element khỏi array
 * @param {string} userId - User ID
 * @param {string} addressId - Address ID cần xóa
 * @returns {Promise<Object>} Updated user document
 */
const deleteAddressById = async (userId, addressId) => {
  try {
    const result = await GET_DB().collection(USER_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(userId) },
      { $pull: { addresses: { addressId } } },
      { returnDocument: 'after' }
    )
    return result
  } catch (error) { throw new Error(error) }
}

/**
 * Set reset password token cho user (khi quên mật khẩu)
 * Token có thời hạn expires để bảo mật
 * @param {string} userId - User ID
 * @param {string} token - Random token để reset password
 * @param {number} expires - Unix timestamp khi token hết hạn
 * @returns {Promise<Object>} Updated user document
 */
const setResetPasswordToken = async (userId, token, expires) => {
  try {
    const result = await GET_DB().collection(USER_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(userId) },
      {
        $set: {
          resetPasswordToken: token,
          resetPasswordExpires: expires,
          updatedAt: Date.now()
        }
      },
      { returnDocument: 'after' }
    )
    return result
  } catch (error) { throw new Error(error) }
}

/**
 * Tìm user theo reset token và kiểm tra còn hạn không
 * @param {string} token - Reset password token
 * @returns {Promise<Object|null>} User document nếu token hợp lệ và chưa hết hạn
 */
const findByResetToken = async (token) => {
  try {
    const result = await GET_DB().collection(USER_COLLECTION_NAME).findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() } // Token phải chưa hết hạn
    })
    return result
  } catch (error) { throw new Error(error) }
}

/**
 * Xóa reset password token sau khi đã reset thành công
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Updated user document
 */
const clearResetPasswordToken = async (userId) => {
  try {
    const result = await GET_DB().collection(USER_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(userId) },
      {
        $set: {
          resetPasswordToken: null,
          resetPasswordExpires: null,
          updatedAt: Date.now()
        }
      },
      { returnDocument: 'after' }
    )
    return result
  } catch (error) { throw new Error(error) }
}

/**
 * Lấy danh sách users với pagination và search (Admin)
 * @param {Object} options - { page, limit, search, role }
 * @returns {Promise<Object>} { users: [], pagination: {...} }
 */
const findAllWithPagination = async ({ page = 1, limit = 20, search = '', role = '' }) => {
  try {
    const skip = (page - 1) * limit

    // Xây dựng filter query
    const filter = {}

    // Search theo email, username hoặc phone
    if (search) {
      filter.$or = [
        { email: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ]
    }

    // Filter theo role nếu có
    if (role && Object.values(USER_ROLES).includes(role)) {
      filter.role = role
    }

    // Đếm tổng số users matching filter
    const total = await GET_DB().collection(USER_COLLECTION_NAME).countDocuments(filter)

    // Lấy users với pagination
    const users = await GET_DB().collection(USER_COLLECTION_NAME)
      .find(filter)
      .sort({ createdAt: -1 }) // Mới nhất trước
      .skip(skip)
      .limit(limit)
      .toArray()

    return {
      users,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      }
    }
  } catch (error) { throw new Error(error) }
}

export const userModel = {
  USER_COLLECTION_NAME,
  USER_COLLECTION_SCHEMA,
  USER_ROLES,
  USER_PROVIDER,
  createUser,
  findOneById,
  findOneByEmail,
  updateOneById,
  updateAddressById,
  deleteAddressById,
  setResetPasswordToken,
  findByResetToken,
  clearResetPasswordToken,
  findAllWithPagination
}