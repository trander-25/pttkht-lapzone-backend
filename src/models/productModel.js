/**
 * PRODUCTMODEL.JS - MODEL QUẢN LÝ SẢN PHẨM
 *
 * Collection: products
 * Quản lý catalog sản phẩm laptop và phụ kiện máy tính
 *
 * Categories: laptop, mouse, headphone, keyboard, ram, disk, charger
 * Brands: dell, hp, asus, acer, lenovo, apple, msi, gigabyte, logitech, kingston, anker, sony
 *
 * Schema chính:
 * - name, slug (auto-generate), brand, category, condition (new/used)
 * - images: array URLs, featuredImageIndex: chỉ số ảnh chính
 * - specs: object chứa thông số kỹ thuật (khác nhau theo category)
 *   + laptop: cpu, gpu, ram, storage, screen, weight
 *   + mouse: connection, dpi, buttons
 *   + keyboard: connection, switch, layout
 * - stock: số lượng tồn kho
 * - originalPrice, currentPrice, discountPercent
 * - sold: số lượng đã bán
 * - avgRating, totalReviews: rating trung bình và số lượng reviews
 * - tags: array từ khóa tìm kiếm
 * - isActive: hiển thị trên web hay không
 */

import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { slugify } from '~/utils/formatters'
import { GET_DB } from '~/config/mongodb'
import { FIELD_REQUIRED_MESSAGE } from '~/utils/validators'
import { PRODUCT_PAGINATION } from '~/utils/constants'

// Định nghĩa các loại sản phẩm
const PRODUCT_CATEGORIES = {
  LAPTOP: 'laptop',
  MOUSE: 'mouse',
  HEADPHONE: 'headphone',
  KEYBOARD: 'keyboard',
  RAM: 'ram',
  DISK: 'disk',
  CHARGER: 'charger'
}

// Định nghĩa các thương hiệu
const PRODUCT_BRANDS = {
  DELL: 'dell',
  HP: 'hp',
  ASUS: 'asus',
  ACER: 'acer',
  LENOVO: 'lenovo',
  APPLE: 'apple',
  MSI: 'msi',
  GIGABYTE: 'gigabyte',
  LOGITECH: 'logitech',
  KINGSTON: 'kingston',
  ANKER: 'anker',
  SONY: 'sony'
}

// Tình trạng sản phẩm
const PRODUCT_CONDITIONS = {
  NEW: 'new',     // Mới 100%
  USED: 'used'    // Đã qua sử dụng
}

// Define MongoDB collection name and Joi validation schema
const PRODUCT_COLLECTION_NAME = 'products'
const PRODUCT_COLLECTION_SCHEMA = Joi.object({
  name: Joi.string().required().trim().messages({
    'any.required': FIELD_REQUIRED_MESSAGE,
    'string.empty': FIELD_REQUIRED_MESSAGE
  }),

  slug: Joi.string().trim().optional(), // Auto-generated from name

  brand: Joi.string().valid(...Object.values(PRODUCT_BRANDS)).required().messages({
    'any.required': 'Brand is required'
  }),

  category: Joi.string().valid(...Object.values(PRODUCT_CATEGORIES)).required().messages({
    'any.required': 'Category is required'
  }),

  images: Joi.array()
    .items(Joi.string().uri())
    .min(1)
    // .required()
    .messages({ 'array.min': 'At least one image is required' }),

  featuredImageIndex: Joi.number().integer().min(0).default(0),

  specs: Joi.object().when('category', {
    switch: [
      {
        is: PRODUCT_CATEGORIES.LAPTOP,
        then: Joi.object({
          cpu: Joi.string().required(),
          gpu: Joi.string().required(),
          ram: Joi.number().required(),
          storage: Joi.string().required(),
          screenSize: Joi.number().required(),
          screenDes: Joi.string().required(),
          os: Joi.string().required(),
          battery: Joi.string().required(),
          ports: Joi.string().required(),
          weight: Joi.number().required()
        }).required()
      },
      {
        is: PRODUCT_CATEGORIES.MOUSE,
        then: Joi.object({
          connection: Joi.string().required(),
          dpi: Joi.number().required(),
          buttons: Joi.number().integer().required(),
          batteryLife: Joi.number(),
          weight: Joi.number().required(),
          compatibleOS: Joi.string().required()
        }).required()
      },
      {
        is: PRODUCT_CATEGORIES.HEADPHONE,
        then: Joi.object({
          type: Joi.string().required(),
          connection: Joi.string().required(),
          mic: Joi.boolean().required(),
          batteryLife: Joi.number(),
          driverSize: Joi.number().required(),
          compatibleOS: Joi.string().required()
        }).required()
      },
      {
        is: PRODUCT_CATEGORIES.KEYBOARD,
        then: Joi.object({
          type: Joi.string().required(),
          switchType: Joi.string(),
          layout: Joi.string().required(),
          connection: Joi.string().required(),
          backlight: Joi.boolean().required(),
          compatibleOS: Joi.string().required()
        }).required()
      },
      {
        is: PRODUCT_CATEGORIES.DISK,
        then: Joi.object({
          type: Joi.string().valid('SSD', 'HDD').required(),
          capacity: Joi.string().required(),
          readSpeed: Joi.number(),
          writeSpeed: Joi.number(),
          warranty: Joi.number().required()
        }).required()
      },
      {
        is: PRODUCT_CATEGORIES.RAM,
        then: Joi.object({
          capacity: Joi.number().required(),
          type: Joi.string().required(),
          speed: Joi.number().required(),
          voltage: Joi.number().required()
        }).required()
      },
      {
        is: PRODUCT_CATEGORIES.CHARGER,
        then: Joi.object({
          power: Joi.number().required(),
          type: Joi.string().required(),
          compatibleDevices: Joi.string().required(),
          cableLength: Joi.number().required()
        }).required()
      }
    ]
  }),

  stock: Joi.number().integer().min(0).default(0),

  tags: Joi.array()
    .items(Joi.string().trim())
    .default([]),

  price: Joi.number().positive().required().messages({
    'any.required': 'Price is required',
    'number.positive': 'Price must be a positive number'
  }),

  condition: Joi.string().valid(...Object.values(PRODUCT_CONDITIONS)).default(PRODUCT_CONDITIONS.NEW),

  warranty: Joi.number().min(0).default(24),

  description: Joi.string().trim().default(''),

  views: Joi.number().integer().min(0).default(0),

  purchases: Joi.number().integer().min(0).default(0),

  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null)
})

// Các trường không được phép update (bảo vệ data integrity)
const INVALID_UPDATE_FIELDS = ['_id', 'createdAt', 'slug']

/**
 * Tạo slug từ tên sản phẩm
 * VD: "Laptop Dell XPS 15" -> "laptop-dell-xps-15"
 * @param {string} productName - Tên sản phẩm
 * @returns {string} Slug đã format
 */
const generateSlug = (productName) => {
  return slugify(productName)
}

/**
 * Tạo slug unique bằng cách thêm số suffix nếu trùng
 * VD: "laptop-dell-xps-15" -> "laptop-dell-xps-15-2" nếu đã tồn tại
 * @param {string} productName - Tên sản phẩm
 * @param {string|null} productId - ID sản phẩm (dùng khi update để exclude chính nó)
 * @returns {Promise<string>} Slug unique
 */
const generateUniqueSlug = async (productName, productId = null) => {
  try {
    let slug = generateSlug(productName)
    let counter = 1
    let isUnique = false

    // Check if slug exists
    while (!isUnique) {
      const query = { slug }
      // If updating, exclude current product
      if (productId) {
        query._id = { $ne: new ObjectId(productId) }
      }

      const existingProduct = await GET_DB().collection(PRODUCT_COLLECTION_NAME).findOne(query)

      if (!existingProduct) {
        isUnique = true // Slug is unique
      } else {
        // Slug exists, add suffix
        counter++
        slug = `${generateSlug(productName)}-${counter}`
      }
    }

    return slug
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * Validate dữ liệu trước khi tạo product
 * @param {Object} data - Product data
 * @returns {Promise<Object>} Valid data
 */
const validateBeforeCreate = async (data) => {
  return await PRODUCT_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
}

/**
 * Tạo sản phẩm mới
 * Tự động generate slug unique từ tên sản phẩm
 * @param {Object} data - Product data (name, brand, category, specs, price, etc.)
 * @returns {Promise<Object>} Insert result
 */
const createProduct = async (data) => {
  try {
    const validData = await validateBeforeCreate(data)

    // Auto-generate unique slug from product name
    if (!validData.slug) {
      validData.slug = await generateUniqueSlug(validData.name)
    }

    const createdProduct = await GET_DB().collection(PRODUCT_COLLECTION_NAME).insertOne(validData)
    return createdProduct
  } catch (error) { throw new Error(error) }
}

/**
 * Tìm sản phẩm theo ID
 * @param {string} productId - Product ObjectId
 * @returns {Promise<Object|null>} Product document
 */
const findOneById = async (productId) => {
  try {
    const result = await GET_DB().collection(PRODUCT_COLLECTION_NAME).findOne({
      _id: new ObjectId(productId)
    })
    return result
  } catch (error) { throw new Error(error) }
}

/**
 * Tìm sản phẩm theo slug (dùng cho URL SEO-friendly)
 * @param {string} slug - Product slug
 * @returns {Promise<Object|null>} Product document
 */
const findOneBySlug = async (slug) => {
  try {
    const result = await GET_DB().collection(PRODUCT_COLLECTION_NAME).findOne({ slug })
    return result
  } catch (error) { throw new Error(error) }
}

/**
 * Tìm nhiều sản phẩm với filter và pagination
 * @param {Object} filter - MongoDB query filter (VD: { category: 'laptop', brand: 'dell' })
 * @param {Object} options - { page, limit, sort }
 * @returns {Promise<Object>} { products, pagination }
 */
const findMany = async (filter = {}, options = {}) => {
  try {
    const {
      page = PRODUCT_PAGINATION.DEFAULT_PAGE,
      limit = PRODUCT_PAGINATION.DEFAULT_LIMIT,
      sort = { createdAt: -1 }
    } = options
    const skip = (page - 1) * limit

    const results = await GET_DB().collection(PRODUCT_COLLECTION_NAME)
      .find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .toArray()

    const total = await GET_DB().collection(PRODUCT_COLLECTION_NAME).countDocuments(filter)

    return {
      products: results,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  } catch (error) { throw new Error(error) }
}

/**
 * Update sản phẩm theo ID
 * - Tự động filter các trường không được phép update
 * - Tự động regenerate slug nếu thay đổi name
 * @param {string} productId - Product ID
 * @param {Object} updateData - Data cần update
 * @returns {Promise<Object>} Updated product document
 */
const updateOneById = async (productId, updateData) => {
  try {
    // Filter out fields that are not allowed to be updated
    Object.keys(updateData).forEach(fieldName => {
      if (INVALID_UPDATE_FIELDS.includes(fieldName)) {
        delete updateData[fieldName]
      }
    })

    // Auto-regenerate slug if product name is being updated
    if (updateData.name) {
      updateData.slug = await generateUniqueSlug(updateData.name, productId)
    }

    // Add updatedAt timestamp
    updateData.updatedAt = Date.now()

    const result = await GET_DB().collection(PRODUCT_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(productId) },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    return result
  } catch (error) { throw new Error(error) }
}

/**
 * Xóa sản phẩm theo ID
 * @param {string} productId - Product ID
 * @returns {Promise<Object>} Delete result
 */
const deleteOneById = async (productId) => {
  try {
    const result = await GET_DB().collection(PRODUCT_COLLECTION_NAME).deleteOne({
      _id: new ObjectId(productId)
    })
    return result
  } catch (error) { throw new Error(error) }
}

/**
 * Tìm kiếm sản phẩm theo keyword
 * Search trong name, description, tags, brand, category
 * @param {string} searchQuery - Từ khóa tìm kiếm
 * @param {Object} options - { page, limit }
 * @returns {Promise<Object>} { products, pagination }
 */
const searchProducts = async (searchQuery, options = {}) => {
  try {
    const { page = PRODUCT_PAGINATION.DEFAULT_PAGE, limit = PRODUCT_PAGINATION.DEFAULT_LIMIT } = options
    const skip = (page - 1) * limit

    const filter = {
      $or: [
        { name: { $regex: searchQuery, $options: 'i' } },
        { description: { $regex: searchQuery, $options: 'i' } },
        { tags: { $in: [new RegExp(searchQuery, 'i')] } },
        { brand: { $regex: searchQuery, $options: 'i' } },
        { category: { $regex: searchQuery, $options: 'i' } }
      ]
    }

    const results = await GET_DB().collection(PRODUCT_COLLECTION_NAME)
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    const total = await GET_DB().collection(PRODUCT_COLLECTION_NAME).countDocuments(filter)

    return {
      products: results,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  } catch (error) { throw new Error(error) }
}

/**
 * Cập nhật stock (tồn kho) của sản phẩm
 * CRITICAL: Có atomic check để prevent overselling
 * Hỗ trợ 2 trường hợp:
 * - Trừ stock (quantity âm): Kiểm tra stock đủ trước khi trừ (ngăn overselling)
 * - Cộng stock (quantity dương): Luôn cho phép (hoàn trả kho khi hủy đơn)
 * @param {string} productId - Product ID
 * @param {number} quantity - Số lượng thay đổi (âm khi bán, dương khi nhập kho/hoàn trả)
 * @returns {Promise<Object>} Updated product
 * @throws {Error} Nếu stock không đủ (khi trừ)
 */
const updateStock = async (productId, quantity) => {
  try {
    let query = { _id: new ObjectId(productId) }
    
    // Nếu TRỪ stock (quantity âm): Kiểm tra stock đủ không
    // Nếu CỘNG stock (quantity dương): Không cần kiểm tra, luôn cho phép
    if (quantity < 0) {
      // CRITICAL: Chỉ update nếu stock đủ để trừ (prevents overselling)
      query.stock = { $gte: Math.abs(quantity) }
    }
    
    const result = await GET_DB().collection(PRODUCT_COLLECTION_NAME).findOneAndUpdate(
      query,
      {
        $inc: { stock: quantity },
        $set: { updatedAt: Date.now() }
      },
      { returnDocument: 'after' }
    )
    
    // Nếu result null khi trừ stock → stock không đủ
    if (!result && quantity < 0) {
      throw new Error(`Insufficient stock for product ${productId}`)
    }
    
    // Nếu result null khi cộng stock → sản phẩm không tồn tại
    if (!result && quantity > 0) {
      throw new Error(`Product ${productId} not found`)
    }
    
    return result
  } catch (error) { throw new Error(error) }
}

/**
 * Tăng lượt xem sản phẩm (non-blocking)
 * Dùng khi user xem chi tiết sản phẩm
 * Silent fail - không ảnh hưởng API chính
 * @param {string} productId - Product ID
 */
const incrementViews = async (productId) => {
  try {
    await GET_DB().collection(PRODUCT_COLLECTION_NAME).updateOne(
      { _id: new ObjectId(productId) },
      { $inc: { views: 1 } }
    )
  } catch (error) {
    // Silent fail - không làm gián đoạn API
    console.error('Failed to increment views:', error)
  }
}

/**
 * Tăng lượt xem theo slug (non-blocking)
 * @param {string} slug - Product slug
 */
const incrementViewsBySlug = async (slug) => {
  try {
    await GET_DB().collection(PRODUCT_COLLECTION_NAME).updateOne(
      { slug },
      { $inc: { views: 1 } }
    )
  } catch (error) {
    console.error('Failed to increment views:', error)
  }
}

/**
 * Tăng số lượt mua (analytics)
 * Gọi sau khi order confirmed/delivered
 * @param {string} productId - Product ID
 * @param {number} quantity - Số lượng đã mua
 */
const incrementPurchases = async (productId, quantity = 1) => {
  try {
    await GET_DB().collection(PRODUCT_COLLECTION_NAME).updateOne(
      { _id: new ObjectId(productId) },
      { $inc: { purchases: quantity } }
    )
  } catch (error) {
    console.error('Failed to increment purchases:', error)
  }
}

/**
 * Tạo indexes cho collection products để tối ưu search và query
 * - Text index với weights cho full-text search
 * - Single field indexes cho filters thường dùng
 * - Compound indexes cho queries phức tạp
 * Chạy 1 lần khi setup database hoặc khi có thay đổi schema
 * @returns {Promise<boolean>} true nếu thành công
 */
const createSearchIndexes = async () => {
  try {
    const collection = GET_DB().collection(PRODUCT_COLLECTION_NAME)

    // Text index cho search
    await collection.createIndex(
      {
        name: 'text',
        description: 'text',
        brand: 'text',
        category: 'text',
        tags: 'text'
      },
      {
        name: 'product_text_search',
        weights: {
          name: 10,
          brand: 5,
          tags: 3,
          category: 2,
          description: 1
        }
      }
    )

    // Index cho filters thường dùng
    await collection.createIndex({ brand: 1 })
    await collection.createIndex({ category: 1 })
    await collection.createIndex({ price: 1 })
    await collection.createIndex({ 'specs.ram': 1 })
    await collection.createIndex({ 'specs.screenSize': 1 })
    await collection.createIndex({ createdAt: -1 })

    // Compound index cho queries phức tạp
    await collection.createIndex({ category: 1, brand: 1, price: 1 })

    return true
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * Atlas Search với autocomplete và fuzzy matching
 * Yêu cầu: Phải tạo Search Index "products_search" trên MongoDB Atlas
 * Hỗ trợ: typo tolerance, autocomplete suggestions
 * @param {string} searchQuery - Từ khóa tìm kiếm
 * @param {Object} options - { page, limit }
 * @returns {Promise<Array>} Array sản phẩm với search score
 */
const searchProductsAtlas = async (searchQuery, options = {}) => {
  try {
    const { limit = 10, page = 1, sortBy = 'createdAt', sortOrder = 'desc' } = options
    const validatedLimit = Math.max(parseInt(limit) || 10, 1)
    const validatedPage = Math.max(parseInt(page) || 1, 1)
    const skip = (validatedPage - 1) * validatedLimit

    const sortDirection = sortOrder === 'asc' ? 1 : -1
    let sortStage = { score: -1 }

    if (sortBy === 'price') {
      sortStage = { price: sortDirection, score: -1 }
    } else if (sortBy === 'createdAt') {
      sortStage = { createdAt: sortDirection, score: -1 }
    }

    const pipeline = [
      {
        $search: {
          index: 'products_search',
          compound: {
            should: [
              {
                autocomplete: {
                  query: searchQuery,
                  path: 'name',
                  fuzzy: { maxEdits: 1 }
                }
              },
              {
                autocomplete: {
                  query: searchQuery,
                  path: 'slug',
                  fuzzy: { maxEdits: 1 }
                }
              }
            ]
          }
        }
      },
      {
        $set: {
          score: { $meta: 'searchScore' }
        }
      },
      { $sort: sortStage },
      {
        $facet: {
          results: [
            { $skip: skip },
            { $limit: validatedLimit },
            {
              $project: {
                name: 1,
                slug: 1,
                price: 1,
                createdAt: 1,
                image: { $arrayElemAt: ['$images', 0] },
                purchases: 1,
                score: 1
              }
            }
          ],
          totalCount: [
            { $count: 'count' }
          ]
        }
      }
    ]

    const [facetResult = { results: [], totalCount: [] }] = await GET_DB().collection(PRODUCT_COLLECTION_NAME)
      .aggregate(pipeline)
      .toArray()

    const total = facetResult.totalCount?.[0]?.count || 0

    return {
      results: facetResult.results || [],
      total,
      page: validatedPage,
      limit: validatedLimit
    }
  } catch (error) {
    throw new Error(error)
  }
}

export const productModel = {
  PRODUCT_COLLECTION_NAME,
  PRODUCT_COLLECTION_SCHEMA,
  PRODUCT_CATEGORIES,
  PRODUCT_BRANDS,
  PRODUCT_CONDITIONS,
  createProduct,
  findOneById,
  findOneBySlug,
  findMany,
  updateOneById,
  deleteOneById,
  searchProducts,
  searchProductsAtlas,
  updateStock,
  incrementViews,
  incrementViewsBySlug,
  incrementPurchases,
  createSearchIndexes
}