import Joi from 'joi'
import ApiError from '~/utils/ApiError'
import StatusCodes from 'http-status-codes'
import { EMAIL_RULE, EMAIL_RULE_MESSAGE, PASSWORD_RULE, PASSWORD_RULE_MESSAGE } from '~/utils/validators'

/**
 * Validation middleware cho đổi mật khẩu
 * Validates: current_password, new_password
 * Luồng: User đã đăng nhập → Nhập mật khẩu hiện tại + mật khẩu mới
 * 
 * Quy tắc mật khẩu (PASSWORD_RULE):
 * - Tối thiểu 8 ký tự
 * - Ít nhất 1 chữ hoa (A-Z)
 * - Ít nhất 1 chữ thường (a-z)
 * - Ít nhất 1 số (0-9)
 * 
 * Lưu ý: allowUnknown: true cho phép gửi thêm fields không được validate
 */
const changePassword = async (req, res, next) => {
  const correctCondition = Joi.object({
    current_password: Joi.string().pattern(PASSWORD_RULE).message(`current_password: ${PASSWORD_RULE_MESSAGE}`),
    new_password: Joi.string().pattern(PASSWORD_RULE).message(`new_password: ${PASSWORD_RULE_MESSAGE}`)
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
 * Validation middleware cho tạo tài khoản mới
 * Validates: email, password, username
 * 
 * Quy tắc:
 * - Email: bắt buộc, phải hợp lệ (format: user@domain.com), unique trong DB (check ở service layer)
 * - Password: bắt buộc, ít nhất 8 ký tự, 1 chữ hoa, 1 chữ thường, 1 số
 * - Username: bắt buộc, trim whitespace, strict mode (không convert type)
 * 
 * Sau khi đăng ký thành công:
 * - User nhận email chứa verifyToken (UUID)
 * - isActive = false (cần verify email mới login được)
 * - verifyToken không hết hạn
 */
const createAccount = async (req, res, next) => {
  const correctCondition = Joi.object({
    email: Joi.string().required().pattern(EMAIL_RULE).message(EMAIL_RULE_MESSAGE),
    password: Joi.string().required().pattern(PASSWORD_RULE).message(PASSWORD_RULE_MESSAGE),
    username: Joi.string().required().trim().strict()
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, new Error(error.message)))
  }
}

/**
 * Validation middleware cho đăng nhập
 * Validates: email, password
 * 
 * Quy tắc:
 * - Email: bắt buộc, format hợp lệ
 * - Password: bắt buộc, khớp với PASSWORD_RULE
 * 
 * Logic kiểm tra ở service layer:
 * - Email có tồn tại không → 404
 * - isActive = true chưa → 406 (chưa verify email)
 * - Password có đúng không → 406
 */
const login = async (req, res, next) => {
  const correctCondition = Joi.object({
    email: Joi.string().required().pattern(EMAIL_RULE).message(EMAIL_RULE_MESSAGE),
    password: Joi.string().required().pattern(PASSWORD_RULE).message(PASSWORD_RULE_MESSAGE)
  })
  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, new Error(error.message)))
  }
}

/**
 * Validation middleware cho quên mật khẩu
 * Validates: email
 * Luồng: User nhập email → Hệ thống gửi link reset về email
 * 
 * Xử lý:
 * - Kiểm tra email tồn tại trong DB → 404 nếu không
 * - Kiểm tra provider='local' → 400 nếu là Google account
 * - Tạo resetPasswordToken (32 bytes, SHA256 hashed) + expires (15 phút)
 * - Gửi email chứa raw token (chưa hash)
 * - Nếu gửi email thất bại → Rollback (xóa token khỏi DB)
 */
const forgotPassword = async (req, res, next) => {
  const correctCondition = Joi.object({
    email: Joi.string().required().pattern(EMAIL_RULE).message(EMAIL_RULE_MESSAGE)
  })
  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, new Error(error.message)))
  }
}

/**
 * Validation middleware cho reset mật khẩu
 * Validates: token (từ email), newPassword
 * Luồng: User click link trong email -> Nhập mật khẩu mới
 * Token hết hạn sau 15 phút (TOKEN_EXPIRY.RESET_PASSWORD)
 */
const resetPassword = async (req, res, next) => {
  const correctCondition = Joi.object({
    token: Joi.string().required().messages({
      'any.required': 'Reset token is required',
      'string.empty': 'Reset token cannot be empty'
    }),
    newPassword: Joi.string().required().pattern(PASSWORD_RULE).message(`newPassword: ${PASSWORD_RULE_MESSAGE}`)
  })
  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, new Error(error.message)))
  }
}

/**
 * Validation middleware cho xác thực tài khoản
 * Validates: email, token (từ email xác thực)
 * Luồng: User đăng ký -> Nhận email -> Click link xác thực
 * Token không hết hạn (chỉ hủy khi tài khoản được kích hoạt)
 */
const verifyAccount = async (req, res, next) => {
  const correctCondition = Joi.object({
    email: Joi.string().required().pattern(EMAIL_RULE).message(EMAIL_RULE_MESSAGE),
    token: Joi.string().required().messages({
      'any.required': 'Verification token is required',
      'string.empty': 'Verification token cannot be empty'
    })
  })
  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, new Error(error.message)))
  }
}

export const authValidation = {
  createAccount,
  login,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyAccount
}