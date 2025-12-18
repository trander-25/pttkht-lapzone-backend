/**
 * VOUCHER SERVICE - Business Logic Layer
 * Implements voucher validation and discount calculation
 */

import { Voucher } from '../models/index'
import ApiError from '../utils/ApiError'
import { StatusCodes } from 'http-status-codes'

/**
 * Gets voucher by code
 * @param {string} code - Voucher code
 * @returns {Promise<Object>} - Voucher object
 */
const getVoucherByCode = async (code) => {
  try {
    const voucher = await Voucher.findOne({
      where: { code }
    })
    
    if (!voucher) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Voucher not found')
    }
    
    return voucher
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error getting voucher')
  }
}

/**
 * Validates if voucher can be used
 * @param {Object} voucher - Voucher object
 * @returns {boolean} - True if valid
 */
const validateVoucher = (voucher) => {
  if (!voucher.is_active) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Voucher is not active or invalid')
  }
  
  return true
}

/**
 * Calculates discount amount based on voucher
 * @param {Object} voucher - Voucher object { discount_value, max_discount }
 * @param {number} subtotal - Subtotal amount before discount
 * @returns {number} - Discount amount
 */
const calculateDiscount = (voucher, subtotal) => {
  // Calculate discount based on percentage
  const discountPercentage = voucher.discount_value / 100
  let discountAmount = subtotal * discountPercentage
  
  // Apply max discount limit
  if (voucher.max_discount && discountAmount > parseFloat(voucher.max_discount)) {
    discountAmount = parseFloat(voucher.max_discount)
  }
  
  return discountAmount
}

/**
 * Increments voucher usage count
 * @param {number} voucher_id - Voucher ID
 * @returns {Promise<boolean>} - True if successful
 */
const incrementUsageCount = async (voucher_id) => {
  try {
    await Voucher.increment('usage_count', {
      where: { voucher_id }
    })
    
    return true
  } catch (error) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error updating voucher usage')
  }
}

export const voucherService = {
  getVoucherByCode,
  validateVoucher,
  calculateDiscount,
  incrementUsageCount
}
