/**
 * HOMEPAGE VALIDATION - VALIDATE REQUEST DATA CHO HOMEPAGE
 * 
 * Module này chứa middleware validation cho homepage endpoints:
 * - updateSections: Validate body khi cập nhật cấu hình trang chủ
 * 
 * Sử dụng Joi cho schema validation
 * Chi tiết validation sections/banners/products nằm ở homepageService
 * 
 * @module validations/homepageValidation
 */

import Joi from 'joi'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'

/**
 * Validation middleware cho endpoint cập nhật sections homepage (Admin)
 * 
 * Validation rules:
 * - sections: array (REQUIRED) - phải có ít nhất 1 section
 * - metadata.note: string (OPTIONAL) - ghi chú về thay đổi
 * - allowUnknown: true - cho phép banners và các fields khác pass through
 * 
 * Chi tiết validation:
 * - Chỉ validate structure cơ bản ở đây
 * - Validation chi tiết (products, banners, dates, etc.) ở homepageService
 * - Approach này tách validation layer: basic → detailed
 * 
 * Flow:
 * 1. Validate basic structure với Joi
 * 2. Nếu fail → throw ApiError 422
 * 3. Nếu pass → normalize data vào req.body và next()
 * 4. Service layer sẽ validate chi tiết hơn
 * 
 * @async
 * @function updateSections
 * @param {Express.Request} req - Express request object
 * @param {Object} req.body - Request body cần validate
 * @param {Array} req.body.sections - Danh sách sections (required)
 * @param {Object} [req.body.metadata] - Metadata (optional)
 * @param {string} [req.body.metadata.note] - Ghi chú (optional)
 * @param {Express.Response} res - Express response object
 * @param {Express.NextFunction} next - Express next middleware
 * @returns {Promise<void>} Call next() nếu valid, hoặc next(error) nếu invalid
 * 
 * @throws {ApiError} 422 - Validation failed
 * 
 * @example
 * // Valid request
 * {
 *   "sections": [
 *     {"id": "flash-sale", "title": "Flash Sale", "products": [...]}
 *   ],
 *   "banners": [...],
 *   "metadata": {"note": "Update for Black Friday"}
 * }
 * 
 * @example
 * // Invalid - sections missing
 * {}
 * // Error: "sections is required"
 */
const updateSections = async (req, res, next) => {
  // Define schema: sections bắt buộc, metadata optional
  // allowUnknown sẽ được set khi validateAsync để cho phép banners pass through
  const schema = Joi.object({
    sections: Joi.array().required().messages({
      'any.required': 'sections is required',
      'array.base': 'sections must be an array'
    }),
    metadata: Joi.object({
      note: Joi.string().allow('') // Cho phép empty string
    }).optional()
  })

  try {
    // Validate request body
    // - abortEarly: false → collect tất cả errors, không dừng ở error đầu tiên
    // - allowUnknown: true → cho phép fields khác như banners (sẽ validate ở service)
    const value = await schema.validateAsync(req.body, { abortEarly: false, allowUnknown: true })
    
    // Normalize validated data vào req.body
    // Service sẽ access req.body.sections và req.body.metadata
    req.body.sections = value.sections
    req.body.metadata = value.metadata
    
    // Validation success → tiếp tục đến controller
    next()
  } catch (error) {
    // Validation failed → throw 422 Unprocessable Entity
    // error.message chứa chi tiết validation errors từ Joi
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.message))
  }
}

export const homepageValidation = {
  updateSections
}

