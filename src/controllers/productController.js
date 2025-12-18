/**
 * PRODUCT CONTROLLER
 * Implements exact functions from product controller specification
 */

import { StatusCodes } from 'http-status-codes'
import { productService } from '../services/productService'
import ApiError from '../utils/ApiError'

/**
 * Gets all products with pagination
 * @query {number} page - Page number (default: 1)
 * @query {number} limit - Items per page (default: 12, max: 50)
 * @returns {Object} - { products, pagination }
 */
const getAllProducts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = Math.min(parseInt(req.query.limit) || 12, 50) // Max 50 items per page
    
    const result = await productService.getAllProducts(page, limit)

    res.status(StatusCodes.OK).json({
      success: true,
      data: result.products,
      pagination: result.pagination
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Get product details by ID
 * @param {number} req.params.id - Product ID
 * @returns {Object} - Product with full details
 */
const getProductDetails = async (req, res, next) => {
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
 * Search products by keyword
 * @query {string} keyword - Search keyword
 * @query {number} page - Page number (default: 1)
 * @query {number} limit - Items per page (default: 12, max: 50)
 * @returns {Object} - { products, pagination }
 */
const searchProducts = async (req, res, next) => {
  try {
    const { keyword } = req.query
    
    if (!keyword) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Keyword is required')
    }
    
    const page = parseInt(req.query.page) || 1
    const limit = Math.min(parseInt(req.query.limit) || 12, 50)
    
    const result = await productService.searchProducts(keyword, page, limit)
    
    res.status(StatusCodes.OK).json({
      success: true,
      data: result.products,
      pagination: result.pagination
    })
  } catch (error) {
    next(error)
  }
}

export const productController = {
  getAllProducts,
  getProductDetails,
  searchProducts
}
