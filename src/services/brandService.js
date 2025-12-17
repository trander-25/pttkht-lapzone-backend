/**
 * BRAND SERVICE - Business Logic Layer
 * Implements exact functions from Brand entity specification
 */

import { Brand } from '../models/index'
import ApiError from '../utils/ApiError'
import { StatusCodes } from 'http-status-codes'

/**
 * Gets a list of all brands
 * @returns {Promise<Array>} - List of brands
 */
const getAllBrands = async () => {
  try {
    const brands = await Brand.findAll({
      order: [['brand_id', 'ASC']]
    })
    
    return brands
  } catch (error) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error getting all brands')
  }
}

/**
 * Adds a new brand
 * @param {Object} brand - Brand data { brand_name }
 * @returns {Promise<Boolean>} - True if successful
 */
const insertBrand = async (brand) => {
  try {
    await Brand.create({
      brand_name: brand.brand_name
    })
    
    return true
  } catch (error) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error inserting brand')
  }
}

/**
 * Updates brand name
 * @param {Object} brand - Brand data { brand_id, brand_name }
 * @returns {Promise<Boolean>} - True if successful
 */
const updateBrand = async (brand) => {
  try {
    const [updated] = await Brand.update(
      { brand_name: brand.brand_name },
      { where: { brand_id: brand.brand_id } }
    )
    
    return updated > 0
  } catch (error) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error updating brand')
  }
}

/**
 * Removes a brand
 * @param {number} brand_id - Brand ID
 * @returns {Promise<Boolean>} - True if successful
 */
const deleteBrand = async (brand_id) => {
  try {
    const deleted = await Brand.destroy({
      where: { brand_id }
    })
    
    return deleted > 0
  } catch (error) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error deleting brand')
  }
}

export const brandService = {
  getAllBrands,
  insertBrand,
  updateBrand,
  deleteBrand
}
