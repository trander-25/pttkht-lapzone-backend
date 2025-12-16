/**
 * Validation patterns và constants cho form validation
 *
 * Sử dụng với Joi validation trong các file validation
 * Ví dụ: email: Joi.string().pattern(EMAIL_RULE).message(EMAIL_RULE_MESSAGE)
 */

// MongoDB ObjectId validation (24 ký tỳ hexadecimal)
export const OBJECT_ID_RULE = /^[0-9a-fA-F]{24}$/
export const OBJECT_ID_RULE_MESSAGE = 'Your string fails to match the Object Id pattern!'

// Thông báo chung cho fields bắt buộc
export const FIELD_REQUIRED_MESSAGE = 'This field is required.'

// Email validation (format cơ bản: user@domain.extension)
export const EMAIL_RULE = /^\S+@\S+\.\S+$/
export const EMAIL_RULE_MESSAGE = 'Email is invalid.'

// Số điện thoại Việt Nam (bắt đầu bằng 0, 10-11 số)
export const PHONE_RULE = /^0\d{9,10}$/
export const PHONE_RULE_MESSAGE = 'Invalid phone number format.'

/**
 * Mật khẩu mạnh:
 * - Ít nhất 1 chữ hoa (A-Z)
 * - Ít nhất 1 số (0-9)
 * - Độ dài 8-256 ký tự
 * - Chấp nhận chữ thường, chữ hoa, số, ký tự đặc biệt
 */
export const PASSWORD_RULE = /^(?=.*[A-Z])(?=.*\d)[A-Za-z\d\W]{8,256}$/
export const PASSWORD_RULE_MESSAGE = 'Password must include at least 1 uppercase letter, 1 number, and at least 8 characters.'
export const PASSWORD_CONFIRMATION_MESSAGE = 'Password Confirmation does not match!'

/**
 * Giới hạn upload file (bảo mật và hiệu suất)
 * - Dung lượng tối đa: 10MB (10485760 bytes)
 * - Loại file cho phép: JPG, JPEG, PNG (chỉ cho phép ảnh)
 */
export const LIMIT_COMMON_FILE_SIZE = 10485760 // 10 MB tính bằng bytes
export const ALLOW_COMMON_FILE_TYPES = ['image/jpg', 'image/jpeg', 'image/png']