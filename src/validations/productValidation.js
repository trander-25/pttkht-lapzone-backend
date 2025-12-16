import Joi from 'joi'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import { FIELD_REQUIRED_MESSAGE } from '~/utils/validators'
import { productModel } from '~/models/productModel'

/**
 * Validation middleware cho tạo sản phẩm mới (Admin)
 * Validates: name, brand, category, images, specs, stock, tags, price, condition, warranty, description
 *
 * Lưu ý:
 * - Parse JSON strings từ multipart/form-data (specs, tags)
 * - Images: ít nhất 1 ảnh
 * - Specs: Object chứa thông số kỹ thuật (cpu, ram, gpu...)
 * - Tags: Array các tag (flash-sale, best-seller...)
 */
const createProduct = async (req, res, next) => {
  // Parse JSON strings from FormData (multipart/form-data)
  // Nếu specs được gửi dưới dạng chuỗi (multipart/form-data), parse nó
  if (req.body.specs && typeof req.body.specs === 'string') {
    try {
      req.body.specs = JSON.parse(req.body.specs)
    } catch (e) {
      // If parsing fails, keep as is and let validation handle it
      console.error('Failed to parse specs JSON:', e)
    }
  }

  // Nếu tags được gửi dưới dạng chuỗi (multipart/form-data), parse nó
  if (req.body.tags && typeof req.body.tags === 'string') {
    try {
      req.body.tags = JSON.parse(req.body.tags)
    } catch (e) {
      // If parsing fails, try to split by comma as fallback
      req.body.tags = req.body.tags.split(',').map(s => s.trim()).filter(Boolean)
    }
  }

  const correctCondition = Joi.object({
    name: Joi.string().required().trim().messages({
      'any.required': FIELD_REQUIRED_MESSAGE,
      'string.empty': FIELD_REQUIRED_MESSAGE
    }),
    brand: Joi.string().valid(...Object.values(productModel.PRODUCT_BRANDS)).required().messages({
      'any.required': 'Brand is required'
    }),
    category: Joi.string().valid(...Object.values(productModel.PRODUCT_CATEGORIES)).required().messages({
      'any.required': 'Category is required'
    }),
    images: Joi.array()
      .items(Joi.string().uri())
      .min(1)
      .messages({
        'array.min': 'At least one image is required',
        'any.required': 'Images are required'
      }),
    specs: Joi.object().required().messages({
      'any.required': 'Product specifications are required'
    }),
    stock: Joi.number().integer().min(0).default(0),
    tags: Joi.array().items(Joi.string().trim()).default([]),
    price: Joi.number().positive().required().messages({
      'any.required': 'Price is required',
      'number.positive': 'Price must be a positive number'
    }),
    condition: Joi.string().valid(...Object.values(productModel.PRODUCT_CONDITIONS)).default('New'),
    warranty: Joi.number().min(0).default(24),
    description: Joi.string().trim().allow('').default('')
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, new Error(error).message))
  }
}

/**
 * Validation middleware cho cập nhật sản phẩm (Admin)
 * Tương tự createProduct nhưng tất cả fields đều optional
 * Hỗ trợ partial update - chỉ update các fields được gửi
 */
const updateProduct = async (req, res, next) => {
  // Parse JSON strings from FormData (multipart/form-data)
  // Nếu specs được gửi dưới dạng chuỗi (multipart/form-data), parse nó
  if (req.body.specs && typeof req.body.specs === 'string') {
    try {
      req.body.specs = JSON.parse(req.body.specs)
    } catch (e) {
      // If parsing fails, keep as is and let validation handle it
      console.error('Failed to parse specs JSON:', e)
    }
  }

  // Nếu tags được gửi dưới dạng chuỗi (multipart/form-data), parse nó
  if (req.body.tags && typeof req.body.tags === 'string') {
    try {
      req.body.tags = JSON.parse(req.body.tags)
    } catch (e) {
      // If parsing fails, try to split by comma as fallback
      req.body.tags = req.body.tags.split(',').map(s => s.trim()).filter(Boolean)
    }
  }

  const correctCondition = Joi.object({
    name: Joi.string().trim(),
    brand: Joi.string().valid(...Object.values(productModel.PRODUCT_BRANDS)),
    category: Joi.string().valid(...Object.values(productModel.PRODUCT_CATEGORIES)),
    images: Joi.array().items(Joi.string().uri()),
    specs: Joi.object(),
    stock: Joi.number().integer().min(0),
    tags: Joi.array().items(Joi.string().trim()),
    price: Joi.number().positive(),
    condition: Joi.string().valid(...Object.values(productModel.PRODUCT_CONDITIONS)),
    warranty: Joi.number().min(0),
    description: Joi.string().trim().allow('')
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, new Error(error).message))
  }
}

/**
 * Validation middleware cho lấy danh sách sản phẩm với filtering phức tạp
 * Hỗ trợ filters:
 * - Pagination: page, limit
 * - Cơ bản: category, brand, condition, price, warranty
 * - Laptop: cpu, gpu, ram, screenSize, resolution, screenTech, refreshRate, storage
 * - Mouse: connection, dpi
 * - Headphone: type, connection, batteryLife, driverSize
 * - Keyboard: type, switchType, layout, connection, backlight
 * - RAM: capacity, type, speed, voltage
 * - Disk: type, capacity
 * - Charger: power, type, cableLength
 * - Search: search query, tags
 * - Sorting: sortBy, sortOrder/sort
 *
 * Lưu ý:
 * - Hỗ trợ nhiều format: "16gb", "16", "16inch"...
 * - stripUnknown: true - Xóa các query params không hợp lệ
 */
const getMany = async (req, res, next) => {
  const correctCondition = Joi.object({
    // Pagination
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(12),

    // Basic filters
    category: Joi.string().valid(...Object.values(productModel.PRODUCT_CATEGORIES)),
    brand: Joi.string().valid(...Object.values(productModel.PRODUCT_BRANDS)),
    condition: Joi.string().valid(...Object.values(productModel.PRODUCT_CONDITIONS)),

    // Price filters
    price: Joi.string().pattern(/^\d+-\d+$/), // Format: "0-3600000"
    minPrice: Joi.number().min(0),
    maxPrice: Joi.number().min(0),

    // Laptop specs filters
    ram: Joi.alternatives().try(
      Joi.number(),
      Joi.string().pattern(/^\d+(gb)?$/i) // Format: "16" or "16gb"
    ),
    screenSize: Joi.alternatives().try(
      Joi.number(),
      Joi.string().pattern(/^\d+(\.\d+)?(inch)?$/i) // Format: "16" or "16inch"
    ),
    storage: Joi.string(), // Format: "512gb" or "1tb"

    // Search
    search: Joi.string().trim(),

    // Tags filter (can be string or array)
    tags: Joi.alternatives().try(
      Joi.string().trim(),
      Joi.array().items(Joi.string().trim())
    ),

    // Warranty filter
    warranty: Joi.alternatives().try(
      Joi.number().min(0),
      Joi.string().pattern(/^\d+$/)
    ),

    // Charger specs filters
    chargerpower: Joi.alternatives().try(
      Joi.number(),
      Joi.string().pattern(/^\d+(w)?$/i) // Format: "65" or "65w"
    ),
    chargertype: Joi.string().trim(),
    chargercablelength: Joi.alternatives().try(
      Joi.number(),
      Joi.string().pattern(/^\d+(\.\d+)?(m)?$/i) // Format: "1" or "1m" or "1.5m"
    ),

    // Laptop filters
    laptopcpu: Joi.string().trim(),
    laptopgpu: Joi.string().trim(),
    laptopscreensizerange: Joi.string().valid('13', '14', '15+'),
    laptopresolution: Joi.string().valid('HD', 'FHD', '2K', '2.5K', '2.8K', '3K', '4K'),
    laptopscreentech: Joi.string().valid('OLED', 'IPS', 'Liquid Retina', 'Cảm ứng'),
    laptoprefreshrate: Joi.string().valid('60Hz', '90Hz', '120Hz', '144Hz', '165Hz', '240Hz', '360Hz'),

    // Mouse filters
    mouseconnection: Joi.string().trim(),
    mousedpi: Joi.alternatives().try(
      Joi.number(),
      Joi.string().pattern(/^\d+$/)
    ),

    // Headphone filters
    headphonetype: Joi.string().trim(),
    headphoneconnection: Joi.string().trim(),
    headphonebatterylife: Joi.alternatives().try(
      Joi.number(),
      Joi.string().pattern(/^\d+$/)
    ),
    headphonedriversize: Joi.alternatives().try(
      Joi.number(),
      Joi.string().pattern(/^\d+$/)
    ),

    // Keyboard filters
    keyboardtype: Joi.string().trim(),
    keyboardswitchtype: Joi.string().trim(),
    keyboardlayout: Joi.string().trim(),
    keyboardconnection: Joi.string().trim(),
    keyboardbacklight: Joi.string().valid('true', 'false'),

    // RAM filters
    ramcapacity: Joi.alternatives().try(
      Joi.number(),
      Joi.string().pattern(/^\d+$/)
    ),
    ramtype: Joi.string().trim(),
    ramspeed: Joi.alternatives().try(
      Joi.number(),
      Joi.string().pattern(/^\d+$/)
    ),
    ramvoltage: Joi.alternatives().try(
      Joi.number(),
      Joi.string().pattern(/^\d+(\.\d+)?$/)
    ),

    // Disk filters
    disktype: Joi.string().valid('SSD', 'HDD'),
    diskcapacity: Joi.string().trim(),

    // Sorting
    sortBy: Joi.string().valid('name', 'price', 'createdAt', 'stock').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
    sort: Joi.string().valid('asc', 'desc') // Alternative to sortOrder
  })

  try {
    const { error, value } = correctCondition.validate(req.query, { stripUnknown: true })
    if (error) {
      throw new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.message)
    }
    req.query = value
    next()
  } catch (error) {
    next(error)
  }
}

/**
 * Validation middleware cho tìm kiếm sản phẩm (Atlas Search)
 * Validates: q (search query), page, limit
 */
const searchProducts = async (req, res, next) => {
  const correctCondition = Joi.object({
    q: Joi.string().required().trim().messages({
      'any.required': 'Search query is required',
      'string.empty': 'Search query cannot be empty'
    }),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sort: Joi.string().valid('asc', 'desc'),
    sortBy: Joi.string().valid('price', 'createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc')
  })

  try {
    const { error, value } = correctCondition.validate(req.query)
    if (error) {
      throw new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.message)
    }
    req.query = value
    next()
  } catch (error) {
    next(error)
  }
}

/**
 * Validation middleware cho lấy chi tiết sản phẩm theo slug
 * Validates: slug (URL-friendly string)
 */
const getDetailsBySlug = async (req, res, next) => {
  const correctCondition = Joi.object({
    slug: Joi.string().required().trim().messages({
      'any.required': 'Slug is required'
    })
  })

  try {
    await correctCondition.validateAsync(req.params, { abortEarly: false })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, new Error(error).message))
  }
}

/**
 * Validation middleware cho sắp xếp lại thứ tự ảnh
 * Validates: imageOrder (array các index)
 * Ví dụ: [2, 0, 1, 3] - đổi vị trí ảnh
 */
const reorderImages = async (req, res, next) => {
  const correctCondition = Joi.object({
    imageOrder: Joi.array().items(Joi.number().integer().min(0)).required().messages({
      'any.required': 'Image order array is required',
      'array.base': 'Image order must be an array'
    })
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, new Error(error).message))
  }
}

/**
 * Validation middleware cho xóa ảnh
 * Validates: imageIndex (vị trí ảnh cần xóa)
 */
const deleteImage = async (req, res, next) => {
  const correctCondition = Joi.object({
    imageIndex: Joi.number().integer().min(0).required().messages({
      'any.required': 'Image index is required',
      'number.base': 'Image index must be a number'
    })
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, new Error(error).message))
  }
}

/**
 * Validation middleware cho đặt ảnh nổi bật
 * Validates: imageIndex (ảnh sẽ hiển thị chính)
 */
const setFeaturedImage = async (req, res, next) => {
  const correctCondition = Joi.object({
    imageIndex: Joi.number().integer().min(0).required().messages({
      'any.required': 'Image index is required',
      'number.base': 'Image index must be a number'
    })
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, new Error(error).message))
  }
}

export const productValidation = {
  createProduct,
  updateProduct,
  getMany,
  searchProducts,
  getDetailsBySlug,
  reorderImages,
  deleteImage,
  setFeaturedImage
}
