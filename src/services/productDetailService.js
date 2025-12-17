/**
 * PRODUCT DETAIL SERVICE - Business Logic Layer
 * Implements exact functions from ProductDetail entity specification
 */

import { ProductDetail } from '../models/index'
import ApiError from '../utils/ApiError'
import { StatusCodes } from 'http-status-codes'

/**
 * Gets full technical specs of a laptop
 * @param {number} product_id - Product ID
 * @returns {Promise<Object>} - ProductDetail object
 */
const getProductDetails = async (product_id) => {
  try {
    const details = await ProductDetail.findOne({
      where: { product_id }
    })

    if (!details) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Product details not found')
    }

    return details
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error getting product details')
  }
}

/**
 * Adds specs for a new product
 * @param {Object} details - { product_id, cpu, ram, storage, screen, gpu }
 * @returns {Promise<Boolean>} - True if successful
 */
const insertProductDetails = async (details) => {
  try {
    await ProductDetail.create({
      product_id: details.product_id,
      cpu: details.cpu || null,
      ram: details.ram || null,
      storage: details.storage || null,
      screen: details.screen || null,
      gpu: details.gpu || null
    })

    return true
  } catch (error) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error inserting product details')
  }
}

/**
 * Updates specs of a product
 * @param {Object} details - { product_id, cpu, ram, storage, screen, gpu }
 * @returns {Promise<Boolean>} - True if successful
 */
const updateProductDetails = async (details) => {
  try {
    const updateData = {}

    if (details.cpu) updateData.cpu = details.cpu
    if (details.ram) updateData.ram = details.ram
    if (details.storage) updateData.storage = details.storage
    if (details.screen) updateData.screen = details.screen
    if (details.gpu) updateData.gpu = details.gpu

    const [updated] = await ProductDetail.update(updateData, {
      where: { product_id: details.product_id }
    })

    return updated > 0
  } catch (error) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error updating product details')
  }
}

export const productDetailService = {
  getProductDetails,
  insertProductDetails,
  updateProductDetails
}
