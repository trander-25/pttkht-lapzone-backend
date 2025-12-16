import Joi from 'joi'
import ApiError from '~/utils/ApiError'
import StatusCodes from 'http-status-codes'
import { FIELD_REQUIRED_MESSAGE, EMAIL_RULE, EMAIL_RULE_MESSAGE, PASSWORD_RULE, PASSWORD_RULE_MESSAGE } from '~/utils/validators'

/**
 * Validation middleware cho cập nhật thông tin user
 * Validates: current_password, new_password, phone, sex
 * allowUnknown: true - Hỗ trợ partial update
 */
const updateUser = async (req, res, next) => {
  const correctCondition = Joi.object({
    current_password: Joi.string().pattern(PASSWORD_RULE).message(`current_password: ${PASSWORD_RULE_MESSAGE}`),
    new_password: Joi.string().pattern(PASSWORD_RULE).message(`new_password: ${PASSWORD_RULE_MESSAGE}`),
    phone: Joi.string().pattern(/^[0-9]{10,11}$/),
    sex: Joi.string().valid('male', 'female')
  })

  try {
    // Allow unknown fields for update flexibility without requiring all fields to be present
    await correctCondition.validateAsync(req.body, { abortEarly: false, allowUnknown: true })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, new Error(error).message))
  }
}

/**
 * Validation middleware cho thêm địa chỉ mới
 * Validates: street, ward, district, province (bắt buộc), isDefault (optional)
 * Hệ thống tự động generate addressId
 */
const addAddress = async (req, res, next) => {
  const correctCondition = Joi.object({
    street: Joi.string().required().trim().message(FIELD_REQUIRED_MESSAGE),
    ward: Joi.string().required().trim().message(FIELD_REQUIRED_MESSAGE),
    district: Joi.string().required().trim().message(FIELD_REQUIRED_MESSAGE),
    province: Joi.string().required().trim().message(FIELD_REQUIRED_MESSAGE),
    isDefault: Joi.boolean().default(false)
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, new Error(error).message))
  }
}

/**
 * Validation middleware cho cập nhật địa chỉ
 * Validates: addressId (bắt buộc) + ít nhất 1 field khác
 * Hỗ trợ partial update
 */
const updateAddress = async (req, res, next) => {
  const correctCondition = Joi.object({
    addressId: Joi.string().required(),
    street: Joi.string().trim(),
    ward: Joi.string().trim(),
    district: Joi.string().trim(),
    province: Joi.string().trim(),
    isDefault: Joi.boolean()
  }) // Ít nhất phải có addressId + 1 field khác

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, new Error(error).message))
  }
}

/**
 * Validation middleware cho xóa địa chỉ
 * Validates: addressId
 */
const deleteAddress = async (req, res, next) => {
  const correctCondition = Joi.object({
    addressId: Joi.string().required().message(FIELD_REQUIRED_MESSAGE)
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, new Error(error).message))
  }
}

/**
 * ADMIN VALIDATIONS - Quản lý user
 */

/**
 * Validation middleware cho admin cập nhật user
 * Validates: username, phone, sex, isActive, role, addresses
 * Phải có ít nhất 1 field để update
 */
const updateUserByAdmin = async (req, res, next) => {
  const correctCondition = Joi.object({
    username: Joi.string().trim(),
    phone: Joi.string().pattern(/^[0-9]{10,11}$/),
    sex: Joi.string().valid('male', 'female'),
    isActive: Joi.boolean(),
    role: Joi.string().valid('customer', 'manager', 'admin'),
    addresses: Joi.array().items(
      Joi.object({
        addressId: Joi.string(),
        street: Joi.string().trim(),
        ward: Joi.string().trim(),
        district: Joi.string().trim(),
        province: Joi.string().trim(),
        isDefault: Joi.boolean()
      })
    )
  }).min(1) // At least one field must be provided

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, new Error(error).message))
  }
}

export const userValidation = {
  updateUser,
  addAddress,
  updateAddress,
  deleteAddress,
  // Admin validations
  updateUserByAdmin
}