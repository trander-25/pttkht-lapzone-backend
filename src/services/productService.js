/**
 * PRODUCT SERVICE - Business Logic Layer
 * Implements exact functions from Product entity specification
 */

import { Product } from '../models/index'
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
      order: [['product_id', 'DESC']],
      limit: limit,
      offset: offset
    })
    
    const formattedProducts = rows.map(product => product.toJSON())
    
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
    const product = await Product.findByPk(product_id)
    
    if (!product) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Product not found')
    }
    
    return { product: product.toJSON() }
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error getting product')
  }
}

/**
 * Finds products matching the keyword
 * @param {string} keyword - Search keyword
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Promise<Object>} - { products, pagination }
 */
const searchProducts = async (keyword, page = 1, limit = 12) => {
  try {
    const offset = (page - 1) * limit
    
    const { count, rows } = await Product.findAndCountAll({
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
      order: [['product_id', 'DESC']],
      limit: limit,
      offset: offset
    })
    
    const totalPages = Math.ceil(count / limit)
    
    return {
      products: rows,
      pagination: {
        total: count,
        totalPages: totalPages,
        currentPage: page,
        limit: limit,
        hasMore: page < totalPages
      }
    }
  } catch (error) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error searching products')
  }
}

/**
 * Adds a new product (Admin)
 * @param {Object} product - Product data { product_name, brand, price, stock, image, description, warranty_month, cpu, ram, storage, gpu, screen, weight, battery }
 * @returns {Promise<number>} - Created product ID
 */
const insertProduct = async (product) => {
  try {
    const newProduct = await Product.create({
      product_name: product.product_name,
      brand: product.brand,
      price: product.price,
      stock: product.stock || 0,
      image: product.image || null,
      description: product.description || null,
      warranty_month: product.warranty_month || 12,
      is_show: true,
      cpu: product.cpu || null,
      ram: product.ram || null,
      storage: product.storage || null,
      gpu: product.gpu || null,
      screen: product.screen || null,
      weight: product.weight || null,
      battery: product.battery || null
    })
    
    return newProduct.product_id
  } catch (error) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error inserting product')
  }
}

/**
 * Updates product information (Admin)
 * @param {Object} product - Product data { product_id, product_name, brand, price, stock, image, description, warranty_month, is_show, cpu, ram, storage, gpu, screen, weight, battery }
 * @returns {Promise<Boolean>} - True if successful
 */
const updateProduct = async (product) => {
  try {
    const updateData = {}
    
    if (product.product_name) updateData.product_name = product.product_name
    if (product.brand) updateData.brand = product.brand
    if (product.price !== undefined) updateData.price = product.price
    if (product.stock !== undefined) updateData.stock = product.stock
    if (product.image) updateData.image = product.image
    if (product.description) updateData.description = product.description
    if (product.warranty_month) updateData.warranty_month = product.warranty_month
    if (product.is_show !== undefined) updateData.is_show = product.is_show
    if (product.cpu !== undefined) updateData.cpu = product.cpu
    if (product.ram !== undefined) updateData.ram = product.ram
    if (product.storage !== undefined) updateData.storage = product.storage
    if (product.gpu !== undefined) updateData.gpu = product.gpu
    if (product.screen !== undefined) updateData.screen = product.screen
    if (product.weight !== undefined) updateData.weight = product.weight
    if (product.battery !== undefined) updateData.battery = product.battery
    
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

/**
 * Checks if product has enough stock
 * @param {number} product_id - Product ID
 * @param {number} required_quantity - Required quantity
 * @returns {Promise<Object>} - { available: boolean, product: Object }
 */
const checkStock = async (product_id, required_quantity) => {
  try {
    const product = await Product.findByPk(product_id)
    
    if (!product) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Product not found')
    }
    
    return {
      available: product.stock >= required_quantity,
      product: product.toJSON(),
      availableStock: product.stock
    }
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error checking stock')
  }
}

/**
 * Decrements product stock
 * @param {number} product_id - Product ID
 * @param {number} quantity - Quantity to decrement
 * @returns {Promise<Boolean>} - True if successful
 */
const decrementStock = async (product_id, quantity) => {
  try {
    const product = await Product.findByPk(product_id)
    
    if (!product) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Product not found')
    }
    
    if (product.stock < quantity) {
      throw new ApiError(StatusCodes.BAD_REQUEST, `Insufficient stock for ${product.product_name}`)
    }
    
    await product.update({
      stock: product.stock - quantity
    })
    
    return true
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error decrementing stock')
  }
}

/**
 * Increments product stock (for order cancellation/return)
 * @param {number} product_id - Product ID
 * @param {number} quantity - Quantity to increment
 * @returns {Promise<Boolean>} - True if successful
 */
const incrementStock = async (product_id, quantity) => {
  try {
    const product = await Product.findByPk(product_id)
    
    if (!product) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Product not found')
    }
    
    await product.update({
      stock: product.stock + quantity
    })
    
    return true
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error incrementing stock')
  }
}

/**
 * Gets all products for admin (including hidden products)
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Promise<Object>} - { products, pagination }
 */
const getAllProductsForAdmin = async (page = 1, limit = 12) => {
  try {
    const offset = (page - 1) * limit
    
    const { count, rows } = await Product.findAndCountAll({
      order: [['product_id', 'DESC']],
      limit: limit,
      offset: offset
    })
    
    const totalPages = Math.ceil(count / limit)
    
    return {
      products: rows,
      pagination: {
        total: count,
        totalPages: totalPages,
        currentPage: page,
        limit: limit,
        hasMore: page < totalPages
      }
    }
  } catch (error) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error getting products for admin')
  }
}

/**
 * Searches products for admin by keyword
 * @param {string} keyword - Search keyword
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Promise<Object>} - { products, pagination }
 */
const searchProductsForAdmin = async (keyword, page = 1, limit = 12) => {
  try {
    const offset = (page - 1) * limit
    
    const { count, rows } = await Product.findAndCountAll({
      where: {
        [Op.or]: [
          { product_name: { [Op.like]: `%${keyword}%` } },
          { description: { [Op.like]: `%${keyword}%` } }
        ]
      },
      order: [['product_id', 'DESC']],
      limit: limit,
      offset: offset
    })
    
    const totalPages = Math.ceil(count / limit)
    
    return {
      products: rows,
      pagination: {
        total: count,
        totalPages: totalPages,
        currentPage: page,
        limit: limit,
        hasMore: page < totalPages
      }
    }
  } catch (error) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error searching products for admin')
  }
}

export const productService = {
  getAllProducts,
  getProduct,
  searchProducts,
  insertProduct,
  updateProduct,
  deleteProduct,
  checkStock,
  decrementStock,
  incrementStock,
  getAllProductsForAdmin,
  searchProductsForAdmin
}
