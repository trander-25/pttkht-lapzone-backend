/**
 * MANAGE PRODUCT CONTROLLER - Admin product management
 */

import { StatusCodes } from 'http-status-codes'
import { productService } from '../services/productService'
import { CloudinaryProvider } from '../providers/CloudinaryProvider'
import ApiError from '../utils/ApiError'

/**
 * Get all products (including hidden ones)
 * GET /api/v1/manage/products
 */
const getAllProducts = async (req, res, next) => {
  try {
    const products = await productService.getAllProductsForAdmin()

    res.status(StatusCodes.OK).json({
      success: true,
      data: products
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Search products by keyword
 * GET /api/v1/manage/products/search?keyword=xxx
 */
const searchProducts = async (req, res, next) => {
  try {
    const { keyword } = req.query

    if (!keyword) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Keyword is required')
    }

    const products = await productService.searchProductsForAdmin(keyword)

    res.status(StatusCodes.OK).json({
      success: true,
      data: products
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
 * @body { product_name, brand_id, price, stock, image, description, warranty_month, cpu, ram, storage, gpu, screen, weight, battery }
 */
const createProduct = async (req, res, next) => {
  try {
    const {
      product_name,
      brand_id,
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
      brand_id,
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
 */
const updateProduct = async (req, res, next) => {
  try {
    const { product_id } = req.params
    const {
      product_name,
      brand_id,
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
      brand_id,
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
 * Delete product (soft delete)
 * DELETE /api/v1/manage/products/:product_id
 */
const deleteProduct = async (req, res, next) => {
  try {
    const { product_id } = req.params

    const result = await productService.deleteProduct(parseInt(product_id))

    res.status(StatusCodes.OK).json({
      success: result,
      message: 'Product deleted successfully'
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
