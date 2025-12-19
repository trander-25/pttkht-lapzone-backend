/**
 * MANAGE PRODUCT CONTROLLER - Admin product management
 */

import { StatusCodes } from 'http-status-codes'
import { productService } from '../services/productService'
import { CloudinaryProvider } from '../providers/CloudinaryProvider'
import ApiError from '../utils/ApiError'

/**
 * Get all products (including hidden ones)
 * GET /api/v1/manage/products?page=1&limit=12
 * @query {number} page - Page number (default: 1)
 * @query {number} limit - Items per page (default: 12, max: 50)
 */
const getAllProducts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = Math.min(parseInt(req.query.limit) || 12, 50)
    
    const result = await productService.getAllProductsForAdmin(page, limit)

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
 * Search products by keyword
 * GET /api/v1/manage/products/search?keyword=xxx&page=1&limit=12
 * @query {string} keyword - Search keyword
 * @query {number} page - Page number (default: 1)
 * @query {number} limit - Items per page (default: 12, max: 50)
 */
const searchProducts = async (req, res, next) => {
  try {
    const { keyword } = req.query

    if (!keyword) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Keyword is required')
    }
    
    const page = parseInt(req.query.page) || 1
    const limit = Math.min(parseInt(req.query.limit) || 12, 50)

    const result = await productService.searchProductsForAdmin(keyword, page, limit)

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
 * GET /api/v1/manage/products/:product_id
 */
const getProductDetails = async (req, res, next) => {
  try {
    const { product_id } = req.params

    const product = await productService.getProduct(parseInt(product_id))

    res.status(StatusCodes.OK).json({
      success: true,
      data: product
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Create new product with details
 * POST /api/v1/manage/products
 * @body { product_name, brand, price, stock, image, description, warranty_month, cpu, ram, storage, gpu, screen, weight, battery }
 */
const createProduct = async (req, res, next) => {
  try {
    const {
      product_name,
      brand,
      price,
      stock,
      image,
      description,
      warranty_month,
      cpu,
      ram,
      storage,
      gpu,
      screen,
      weight,
      battery
    } = req.body

    // Validate required fields
    if (!product_name || !price) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Product name and price are required')
    }

    // Handle image upload to Cloudinary
    let imageUrl = image // Default to provided URL (if any)
    if (req.file) {
      const uploadResult = await CloudinaryProvider.streamUpload(req.file.buffer, 'products')
      imageUrl = uploadResult.secure_url
    }

    // Insert product
    const productId = await productService.insertProduct({
      product_name,
      brand,
      price,
      stock,
      image: imageUrl,
      description,
      warranty_month,
      cpu,
      ram,
      storage,
      gpu,
      screen,
      weight,
      battery
    })

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Product created successfully',
      data: { product_id: productId }
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Update product and details
 * PUT /api/v1/manage/products/:product_id
 * Use is_show field to hide/show product (soft delete): is_show: false to hide, is_show: true to show
 */
const updateProduct = async (req, res, next) => {
  try {
    const { product_id } = req.params
    const {
      product_name,
      brand,
      price,
      stock,
      image,
      description,
      warranty_month,
      is_show,
      cpu,
      ram,
      storage,
      gpu,
      screen,
      weight,
      battery
    } = req.body

    // Handle image upload to Cloudinary if new file provided
    let imageUrl = image // Keep existing URL if no new file
    if (req.file) {
      // Get current product to retrieve old image URL
      const currentProduct = await productService.getProduct(parseInt(product_id))
      
      // Delete old image from Cloudinary if exists
      if (currentProduct.product.image) {
        const oldPublicId = CloudinaryProvider.extractPublicId(currentProduct.product.image)
        if (oldPublicId) {
          try {
            await CloudinaryProvider.deleteImage(oldPublicId)
          } catch (deleteError) {
            // Log error but continue with upload (old image might already be deleted)
            console.warn('Failed to delete old image:', deleteError.message)
          }
        }
      }
      
      // Upload new image
      const uploadResult = await CloudinaryProvider.streamUpload(req.file.buffer, 'products')
      imageUrl = uploadResult.secure_url
    }

    // Update product
    const productUpdated = await productService.updateProduct({
      product_id: parseInt(product_id),
      product_name,
      brand,
      price,
      stock,
      image: imageUrl,
      description,
      warranty_month,
      is_show,
      cpu,
      ram,
      storage,
      gpu,
      screen,
      weight,
      battery
    })

    res.status(StatusCodes.OK).json({
      success: productUpdated,
      message: 'Product updated successfully'
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Delete product permanently from database (hard delete)
 * DELETE /api/v1/manage/products/:product_id
 * Only works if product is not in any cart or order
 * To hide product from customers, use PUT endpoint with is_show: false instead
 */
const deleteProduct = async (req, res, next) => {
  try {
    const { product_id } = req.params

    const result = await productService.deleteProduct(parseInt(product_id))

    res.status(StatusCodes.OK).json({
      success: result,
      message: 'Product permanently deleted from database'
    })
  } catch (error) {
    next(error)
  }
}

export const manageProductController = {
  getAllProducts,
  searchProducts,
  getProductDetails,
  createProduct,
  updateProduct,
  deleteProduct
}
