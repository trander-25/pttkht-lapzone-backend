/**
 * PRODUCT SERVICE - Business Logic Layer
 * Implements exact functions from Product entity specification
 */

import { Product, ProductDetail, Brand } from '../models/index'
import ApiError from '../utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import { Op } from 'sequelize'

/**
 * Gets a list of all available products with pagination
 * @param {number} page - Page number (default: 1)
 * @param {number} limit - Items per page (default: 12)
 * @returns {Promise<Object>} - { products, pagination: { total, totalPages, currentPage, hasMore } }
 */
const getAllProducts = async (page = 1, limit = 12) => {
  try {
    const offset = (page - 1) * limit
    
    const { count, rows } = await Product.findAndCountAll({
      where: { is_show: true },
      include: [
        { 
          model: Brand, 
          as: 'brand',
          attributes: ['brand_name']
        }
      ],
      order: [['product_id', 'DESC']],
      limit: limit,
      offset: offset
    })
    
    // Flatten brand data to same level as product data
    const formattedProducts = rows.map(product => {
      const productData = product.toJSON()
      const { brand, ...rest } = productData
      return {
        ...rest,
        brand_name: brand?.brand_name || null
      }
    })
    
    const totalPages = Math.ceil(count / limit)
    
    return {
      products: formattedProducts,
      pagination: {
        total: count,
        totalPages: totalPages,
        currentPage: page,
        limit: limit,
        hasMore: page < totalPages
      }
    }
  } catch (error) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error getting all products')
  }
}

/**
 * Gets basic info of a specific product
 * @param {number} product_id - Product ID
 * @returns {Promise<Object>} - Product object
 */
const getProduct = async (product_id) => {
  try {
    const product = await Product.findByPk(product_id, {
      include: [
        { model: Brand, as: 'brand' },
        { model: ProductDetail, as: 'details' }
      ]
    })
    
    if (!product) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Product not found')
    }
    
    return product
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error getting product')
  }
}

/**
 * Finds products matching the keyword
 * @param {string} keyword - Search keyword
 * @returns {Promise<Array>} - List of matching products
 */
const searchProducts = async (keyword) => {
  try {
    const products = await Product.findAll({
      where: {
        [Op.and]: [
          { is_show: true },
          {
            [Op.or]: [
              { product_name: { [Op.like]: `%${keyword}%` } },
              { description: { [Op.like]: `%${keyword}%` } }
            ]
          }
        ]
      },
      include: [
        { model: Brand, as: 'brand' },
        { model: ProductDetail, as: 'details' }
      ]
    })
    
    return products
  } catch (error) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error searching products')
  }
}

/**
 * Adds a new product (Admin)
 * @param {Object} product - Product data { product_name, brand_id, price, stock, image, description, warranty_month }
 * @returns {Promise<number>} - Created product ID
 */
const insertProduct = async (product) => {
  try {
    const newProduct = await Product.create({
      product_name: product.product_name,
      brand_id: product.brand_id,
      price: product.price,
      stock: product.stock || 0,
      image: product.image || null,
      description: product.description || null,
      warranty_month: product.warranty_month || 12,
      is_show: true
    })
    
    return newProduct.product_id
  } catch (error) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error inserting product')
  }
}

/**
 * Updates product information (Admin)
 * @param {Object} product - Product data { product_id, product_name, brand_id, price, stock, image, description, warranty_month, is_show }
 * @returns {Promise<Boolean>} - True if successful
 */
const updateProduct = async (product) => {
  try {
    const updateData = {}
    
    if (product.product_name) updateData.product_name = product.product_name
    if (product.brand_id) updateData.brand_id = product.brand_id
    if (product.price !== undefined) updateData.price = product.price
    if (product.stock !== undefined) updateData.stock = product.stock
    if (product.image) updateData.image = product.image
    if (product.description) updateData.description = product.description
    if (product.warranty_month) updateData.warranty_month = product.warranty_month
    if (product.is_show !== undefined) updateData.is_show = product.is_show
    
    const [updated] = await Product.update(updateData, {
      where: { product_id: product.product_id }
    })
    
    return updated > 0
  } catch (error) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error updating product')
  }
}

/**
 * Removes a product - soft delete (Admin)
 * @param {number} product_id - Product ID
 * @returns {Promise<Boolean>} - True if successful
 */
const deleteProduct = async (product_id) => {
  try {
    const [updated] = await Product.update(
      { is_show: false },
      { where: { product_id } }
    )
    
    return updated > 0
  } catch (error) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error deleting product')
  }
}

export const productService = {
  getAllProducts,
  getProduct,
  searchProducts,
  insertProduct,
  updateProduct,
  deleteProduct
}
