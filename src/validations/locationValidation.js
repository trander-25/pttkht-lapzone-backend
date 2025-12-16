import Joi from 'joi'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'

/**
 * Validation middleware cho lấy danh sách quận/huyện theo tỉnh
 * Validates: provinceId (integer) từ URL params
 */
const getDistricts = async (req, res, next) => {
  const correctCondition = Joi.object({
    provinceId: Joi.number().integer().required().messages({
      'any.required': 'Province ID is required',
      'number.base': 'Province ID must be a number'
    })
  })

  try {
    await correctCondition.validateAsync(req.params, { abortEarly: false })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, new Error(error.message)))
  }
}

/**
 * Validation middleware cho lấy danh sách phường/xã theo quận/huyện
 * Validates: districtId (integer) từ URL params
 */
const getWards = async (req, res, next) => {
  const correctCondition = Joi.object({
    districtId: Joi.number().integer().required().messages({
      'any.required': 'District ID is required',
      'number.base': 'District ID must be a number'
    })
  })

  try {
    await correctCondition.validateAsync(req.params, { abortEarly: false })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, new Error(error.message)))
  }
}

export const locationValidation = {
  getDistricts,
  getWards
}
