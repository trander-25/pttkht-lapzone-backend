/**
 * PRODUCT DETAIL SERVICE - Business Logic Layer
 * Implements exact functions from ProductDetail entity specification
 */

import { ProductDetail } from '../models/index'
import ApiError from '../utils/ApiError'
import { StatusCodes } from 'http-status-codes'

/**
 * Adds specs for a new product (Admin)
 * @param {Object} details - { product_id, cpu, ram, storage, screen, gpu, weight, battery }
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
      gpu: details.gpu || null,
      weight: details.weight || null,
      battery: details.battery || null
    })

    return true
  } catch (error) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error inserting product details')
  }
}

/**
 * Updates specs of a product (Admin)
 * @param {Object} details - { product_id, cpu, ram, storage, screen, gpu, weight, battery }
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
    if (details.weight) updateData.weight = details.weight
    if (details.battery) updateData.battery = details.battery

    const [updated] = await ProductDetail.update(updateData, {
      where: { product_id: details.product_id }
    })

    return updated > 0
  } catch (error) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error updating product details')
  }
}

export const productDetailService = {
  insertProductDetails,
  updateProductDetails
}
