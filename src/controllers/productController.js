/**
 * PRODUCT CONTROLLER
 * Implements exact functions from product controller specification
 */

import { StatusCodes } from 'http-status-codes'
import { productService } from '../services/productService'
import ApiError from '../utils/ApiError'

/**
 * Gets all products
 * @returns {Object} - List of all products
 */
const getAllProducts = async (req, res, next) => {
  try {
    const products = await productService.getAllProducts()

    res.status(StatusCodes.OK).json({
      success: true,
      data: products
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Gets product details
 * @param {number} req.params.id - Product ID
 * @returns {Object} - Product with full details
 */
const processProductDetailsRequest = async (req, res, next) => {
  try {
    const { id } = req.params

    const product = await productService.getProduct(parseInt(id))

    res.status(StatusCodes.OK).json({
      success: true,
      data: product
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Searches products
 * @param {string} req.query.keyword - Search keyword
 * @returns {Object} - List of matching products
 */
const processSearchRequest = async (req, res, next) => {
  try {
    const { keyword } = req.query
    
    if (!keyword) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Keyword is required')
    }
    
    const products = await productService.searchProducts(keyword)
    
    res.status(StatusCodes.OK).json({
      success: true,
      data: products
    })
  } catch (error) {
    next(error)
  }
}

export const productController = {
  getAllProducts,
  processProductDetailsRequest,
  processSearchRequest
}
