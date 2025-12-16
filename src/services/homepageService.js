/**
 * HOMEPAGE SERVICE - BUSINESS LOGIC CHO TRANG CHỦ
 * 
 * Module này chứa toàn bộ business logic cho homepage:
 * - getPublicConfig: Lấy cấu hình trang chủ với full product data (public)
 * - replaceSections: Thay thế toàn bộ cấu hình sections/banners (admin)
 * 
 * Data Flow:
 * 1. Controller nhận request
 * 2. Service xử lý business logic:
 *    - Validate data với Joi schemas
 *    - Preprocess & normalize data
 *    - Fetch related data (products)
 *    - Save to database
 * 3. Return kết quả cho controller
 * 
 * Schemas & Validation:
 * - SECTION_SCHEMA: Validate section structure
 * - BANNER_SCHEMA: Validate banner structure
 * - SECTION_PRODUCT_SCHEMA: Validate product trong section (chỉ cần slug)
 * 
 * Helper Functions:
 * - preprocessSections: Chuẩn hóa sections data
 * - preprocessBanners: Chuẩn hóa banners data
 * - validateSections: Validate sections với Joi
 * - validateBanners: Validate banners với Joi
 * - normalizeFilterLinks: Chuẩn hóa filter links
 * - normalizeProducts: Chuẩn hóa products (chỉ giữ slug)
 * - buildUpdatedByPayload: Tạo payload tracking ai update
 * 
 * @module services/homepageService
 */

import Joi from 'joi'
import { StatusCodes } from 'http-status-codes'
import { homepageModel } from '~/models/homepageModel'
import { productService } from '~/services/productService'
import ApiError from '~/utils/ApiError'

/**
 * Schema validation cho sản phẩm trong section
 * Chỉ cần slug để lấy thông tin sản phẩm từ database
 */
const SECTION_PRODUCT_SCHEMA = Joi.object({
  slug: Joi.string().required().trim().messages({
    'any.required': 'Product slug is required',
    'string.empty': 'Product slug cannot be empty'
  })
}).unknown(true)

/**
 * Schema validation cho section trong homepage
 * Bao gồm:
 * - Thông tin hiển thị: title, subtitle, colors, tag
 * - Cấu hình: visible, order
 * - Danh sách sản phẩm (chỉ lưu slug)
 * - Filter links cho navigation
 * - Countdown (flash sale): hasCountdown, countdownStart, countdownEnd
 */
const SECTION_SCHEMA = Joi.object({
  id: Joi.string().required(),
  title: Joi.string().allow('').default(''),
  subtitle: Joi.string().allow('').default(''),
  subtitleBackgroundColor: Joi.string().allow('').default(''),
  subtitleTextColor: Joi.string().allow('').default(''),
  tag: Joi.string().allow('').default(''),
  visible: Joi.boolean().default(true),
  order: Joi.number().integer().min(1).default(1),
  backgroundColor: Joi.string().allow('').default(''),
  textColor: Joi.string().allow('').default(''),
  filterLinks: Joi.array().items(Joi.string().allow('')).default([]),
  products: Joi.array().items(SECTION_PRODUCT_SCHEMA).default([]),
  hasCountdown: Joi.boolean().default(false),
  countdownStart: Joi.alternatives().try(Joi.date(), Joi.string().allow('')).allow(null).default(null),
  countdownEnd: Joi.alternatives().try(Joi.date(), Joi.string().allow('')).allow(null).default(null)
}).unknown(true)

const SECTION_ARRAY_SCHEMA = Joi.array().items(SECTION_SCHEMA).default([])

/**
 * Schema validation cho banner trong homepage
 * Mỗi banner cần: image URL, title, link, order, visible
 */
const BANNER_SCHEMA = Joi.object({
  id: Joi.string().required(),
  image: Joi.string().uri().required().trim().messages({
    'any.required': 'Banner image URL is required',
    'string.uri': 'Banner image must be a valid URL',
    'string.empty': 'Banner image URL cannot be empty'
  }),
  title: Joi.string().allow('').default(''),
  link: Joi.string().allow('').default(''),
  order: Joi.number().integer().min(1).default(1),
  visible: Joi.boolean().default(true)
}).unknown(true)

const BANNER_ARRAY_SCHEMA = Joi.array().items(BANNER_SCHEMA).default([])

/**
 * Chuyển đổi giá trị về string an toàn
 * 
 * Xử lý nhiều kiểu dữ liệu đầu vào và luôn trả về string
 * Tránh lỗi khi data không đúng kiểu mong đợi
 * 
 * @function toSafeString
 * @param {any} value - Giá trị cần chuyển thành string
 * @param {string} [fallback=''] - Giá trị mặc định nếu không chuyển được
 * @returns {string} String đã chuyển đổi hoặc fallback
 * 
 * @example
 * toSafeString('hello') // 'hello'
 * toSafeString(123) // '123'
 * toSafeString(null) // ''
 * toSafeString(undefined, 'default') // 'default'
 * toSafeString({id: '123'}) // '[object Object]' hoặc custom toString()
 */
const toSafeString = (value, fallback = '') => {
  if (value === undefined || value === null) return fallback
  if (typeof value === 'string') return value
  if (typeof value === 'number') return value.toString()
  if (typeof value === 'object' && value !== null) {
    if (typeof value.toString === 'function') return value.toString()
  }
  return fallback
}

/**
 * Chuẩn hóa filterLinks từ string hoặc array
 * 
 * FilterLinks có thể được input dưới nhiều format:
 * - String: "link1, link2, link3" (comma-separated)
 * - Array: ["link1", "link2", "link3"]
 * - Mixed types trong array
 * 
 * Xử lý:
 * - String → split by comma
 * - Array → map to strings
 * - Trim whitespace
 * - Filter empty values
 * 
 * @function normalizeFilterLinks
 * @param {string|Array} links - FilterLinks cần chuẩn hóa
 * @returns {Array<string>} Array các links đã chuẩn hóa
 * 
 * @example
 * normalizeFilterLinks("laptop, gaming, ultrabook")
 * // ["/laptop", "/gaming", "/ultrabook"]
 * 
 * normalizeFilterLinks(["/laptop", "/gaming"])
 * // ["/laptop", "/gaming"]
 * 
 * normalizeFilterLinks("  laptop  ,  , gaming  ")
 * // ["laptop", "gaming"] (trim + filter empty)
 */
const normalizeFilterLinks = (links) => {
  if (typeof links === 'string') {
    return links
      .split(',')
      .map(link => link.trim())
      .filter(Boolean)
  }
  if (!Array.isArray(links)) return []
  return links
    .map(link => toSafeString(link).trim())
    .filter(Boolean)
}

/**
 * Chuẩn hóa danh sách sản phẩm
 * 
 * Strategy: Chỉ lưu slug trong database
 * - Giảm kích thước document
 * - Không bị outdated khi product data thay đổi
 * - Fetch full data khi GET (always fresh data)
 * 
 * Xử lý:
 * - Lọc sản phẩm không có slug
 * - Chỉ giữ slug field
 * - Trim whitespace
 * - Remove nulls
 * 
 * @function normalizeProducts
 * @param {Array} products - Danh sách products từ input
 * @returns {Array<Object>} Array chỉ chứa {slug}
 * 
 * @example
 * normalizeProducts([
 *   { slug: "laptop-dell-xps", name: "Dell XPS", price: 25000000 },
 *   { slug: "macbook-pro" },
 *   { name: "No slug" }, // Will be filtered out
 *   null // Will be filtered out
 * ])
 * // Returns:
 * // [
 * //   { slug: "laptop-dell-xps" },
 * //   { slug: "macbook-pro" }
 * // ]
 */
const normalizeProducts = (products) => {
  if (!Array.isArray(products)) return []
  return products
    .filter(Boolean) // Lọc null/undefined
    .map((product) => {
      // Only extract and validate slug
      // Chỉ lấy slug, bỏ hết thông tin khác (name, price, etc.)
      const slug = toSafeString(product?.slug, '').trim()
      if (!slug) {
        return null // Skip products without slug
      }

      // Chỉ trả về object với slug duy nhất
      return {
        slug
      }
    })
    .filter(Boolean) // Remove null entries (products không có slug)
}

/**
 * Tiền xử lý và chuẩn hóa banners
 * 
 * Quy trình:
 * 1. Lọc banners không có image (invalid)
 * 2. Tự động generate ID nếu thiếu
 * 3. Normalize tất cả fields về đúng data types
 * 4. Sắp xếp theo order
 * 5. Reset order thành 1, 2, 3... (sequential)
 * 
 * Validation rules:
 * - image: required (URL), banners không có image sẽ bị bỏ
 * - id: auto-generate nếu thiếu
 * - title, link: optional, default ''
 * - order: sẽ được reset sau khi sort
 * - visible: default true
 * 
 * @function preprocessBanners
 * @param {Array} [banners=[]] - Danh sách banners input
 * @returns {Array<Object>} Banners đã chuẩn hóa và sắp xếp
 * 
 * @example
 * preprocessBanners([
 *   { image: "https://...", title: "Sale", order: 3 },
 *   { image: "https://...", order: 1 },
 *   { title: "No image" }, // Will be filtered out
 * ])
 * // Returns:
 * // [
 * //   { id: "banner-1", image: "https://...", title: "", link: "", order: 1, visible: true },
 * //   { id: "banner-2", image: "https://...", title: "Sale", link: "", order: 2, visible: true }
 * // ]
 */
const preprocessBanners = (banners = []) => {
  if (!Array.isArray(banners)) return []
  return banners
    .filter(Boolean)
    .map((banner, idx) => {
      const safeId = toSafeString(banner?.id ?? `banner-${idx + 1}`, `banner-${idx + 1}`)
      const image = toSafeString(banner?.image, '').trim()
      if (!image) {
        return null // Skip banners without image
      }

      return {
        id: safeId,
        image,
        title: toSafeString(banner?.title ?? '', ''),
        link: toSafeString(banner?.link ?? '', ''),
        order: Number.isFinite(banner?.order) ? Number(banner.order) : idx + 1,
        visible: typeof banner?.visible === 'boolean' ? banner.visible : true
      }
    })
    .filter(Boolean) // Remove null entries
    .sort((a, b) => {
      const orderA = Number.isFinite(a.order) ? a.order : Number.MAX_SAFE_INTEGER
      const orderB = Number.isFinite(b.order) ? b.order : Number.MAX_SAFE_INTEGER
      return orderA - orderB
    })
    .map((banner, index) => ({
      ...banner,
      order: index + 1
    }))
}

const validateBanners = async (banners) => {
  try {
    const validated = await BANNER_ARRAY_SCHEMA.validateAsync(banners, { abortEarly: false })
    return validated
  } catch (error) {
    throw new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.message)
  }
}

/**
 * Tiền xử lý và chuẩn hóa sections
 * 
 * Quy trình xử lý:
 * 1. Chuẩn hóa tất cả fields về đúng data types
 * 2. Normalize filterLinks (string → array)
 * 3. Normalize products (chỉ giữ slug)
 * 4. Parse countdown dates thành ISO string
 * 5. Sắp xếp theo order
 * 6. Reset order thành 1, 2, 3... (sequential)
 * 
 * Fields handling:
 * - Strings: title, subtitle, colors, tag → safe string conversion
 * - Boolean: visible, hasCountdown → ensure boolean type
 * - Number: order → validate is finite number
 * - Array: filterLinks, products → normalize qua helpers
 * - Dates: countdownStart/End → parse to ISO string
 * 
 * @function preprocessSections
 * @param {Array} [sections=[]] - Danh sách sections input
 * @returns {Array<Object>} Sections đã chuẩn hóa và sắp xếp
 * 
 * @example
 * preprocessSections([
 *   {
 *     id: "flash-sale",
 *     title: "Flash Sale",
 *     products: [{slug: "laptop-dell"}, {slug: "macbook"}],
 *     hasCountdown: true,
 *     countdownEnd: "2024-12-25",
 *     order: 2
 *   },
 *   {
 *     id: "new-arrivals",
 *     title: "New Arrivals",
 *     order: 1
 *   }
 * ])
 * // Returns sections sorted by order (1, 2) with normalized data
 */
const preprocessSections = (sections = []) => {
  if (!Array.isArray(sections)) return []
  return sections
    .filter(Boolean)
    .map((section, idx) => {
      const safeId = toSafeString(section?.id ?? `section-${idx + 1}`, `section-${idx + 1}`)
      return {
        id: safeId,
        title: section?.title ?? '',
        subtitle: section?.subtitle ?? '',
        subtitleBackgroundColor: toSafeString(section?.subtitleBackgroundColor ?? '', ''),
        subtitleTextColor: toSafeString(section?.subtitleTextColor ?? '', ''),
        tag: toSafeString(section?.tag ?? '', ''),
        visible: typeof section?.visible === 'boolean' ? section.visible : true,
        order: Number.isFinite(section?.order) ? Number(section.order) : idx + 1,
        backgroundColor: toSafeString(section?.backgroundColor ?? '', ''),
        textColor: toSafeString(section?.textColor ?? '', ''),
        filterLinks: normalizeFilterLinks(section?.filterLinks || []),
        products: normalizeProducts(section?.products || []),
        hasCountdown: typeof section?.hasCountdown === 'boolean' ? section.hasCountdown : false,
        countdownStart: section?.countdownStart
          ? new Date(section.countdownStart).toISOString()
          : null,
        countdownEnd: section?.countdownEnd
          ? new Date(section.countdownEnd).toISOString()
          : null
      }
    })
    .sort((a, b) => {
      const orderA = Number.isFinite(a.order) ? a.order : Number.MAX_SAFE_INTEGER
      const orderB = Number.isFinite(b.order) ? b.order : Number.MAX_SAFE_INTEGER
      return orderA - orderB
    })
    .map((section, index) => ({
      ...section,
      order: index + 1
    }))
}

const validateSections = async (sections) => {
  try {
    const validated = await SECTION_ARRAY_SCHEMA.validateAsync(sections, { abortEarly: false })
    return validated
  } catch (error) {
    throw new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.message)
  }
}

/**
 * Xây dựng payload updatedBy cho tracking
 * 
 * Mục đích: Theo dõi ai đã cập nhật homepage vào lúc nào
 * Useful cho audit trail và rollback nếu cần
 * 
 * Thông tin thu thập:
 * - userId: ID của user (từ JWT)
 * - name: Tên hiển thị (fullName > name > username > email)
 * - role: Vai trò của user (admin, manager, etc.)
 * - note: Ghi chú về thay đổi (từ metadata)
 * 
 * @function buildUpdatedByPayload
 * @param {Object} [user={}] - User object từ JWT decoded
 * @param {string} [user._id] - User ID
 * @param {string} [user.id] - User ID (alternative field)
 * @param {string} [user.userId] - User ID (alternative field)
 * @param {string} [user.fullName] - Full name (preferred)
 * @param {string} [user.name] - Name (fallback)
 * @param {string} [user.username] - Username (fallback)
 * @param {string} [user.email] - Email (fallback)
 * @param {string} [user.role] - User role
 * @param {Object} [metadata={}] - Metadata object
 * @param {string} [metadata.note] - Ghi chú thay đổi
 * @returns {Object|null} Payload hoặc null nếu không có thông tin
 * 
 * @example
 * buildUpdatedByPayload(
 *   { _id: "123", fullName: "John Doe", role: "admin" },
 *   { note: "Update Black Friday campaign" }
 * )
 * // Returns:
 * // {
 * //   userId: "123",
 * //   name: "John Doe",
 * //   role: "admin",
 * //   note: "Update Black Friday campaign"
 * // }
 */
const buildUpdatedByPayload = (user = {}, metadata = {}) => {
  if (!user) return null
  const rawId = user._id || user.id || user.userId
  const name = user.fullName || user.name || user.username || user.email || ''
  if (!rawId && !name && !metadata.note) return null
  return {
    userId: rawId ? toSafeString(rawId) : '',
    name,
    role: user.role || '',
    note: toSafeString(metadata.note || '', '')
  }
}

/**
 * Lấy cấu hình homepage public (cho frontend hiển thị)
 * 
 * Quy trình xử lý:
 * 1. Lấy config từ database (hoặc tạo default nếu chưa có)
 * 2. Thu thập tất cả product slugs từ các sections
 * 3. Fetch tất cả products theo slugs (1 query duy nhất - performance)
 * 4. Tạo Map để lookup nhanh product theo slug
 * 5. Merge thông tin sản phẩm vào sections (giữ thứ tự ban đầu)
 * 6. Lọc banners visible và sắp xếp theo order
 * 7. Trả về cấu hình hoàn chỉnh
 * 
 * Performance Optimization:
 * - Chỉ 1 query đến database cho config
 * - Chỉ 1 query đến products (fetch all slugs at once)
 * - Sử dụng Map cho O(1) lookup
 * 
 * Product Data Format:
 * - Chỉ lưu slug trong database
 * - Populate full data khi GET (name, image, price, etc.)
 * - Nếu product không tồn tại → filter out khỏi kết quả
 * 
 * @async
 * @function getPublicConfig
 * @returns {Promise<Object>} Cấu hình trang chủ hoàn chỉnh
 * @returns {Array} returns.sections - Sections với full product data
 * @returns {Array} returns.banners - Visible banners sorted by order
 * @returns {number} returns.updatedAt - Timestamp cập nhật cuối
 * @returns {Object} returns.updatedBy - Thông tin người cập nhật
 * @returns {string} returns.lastUpdateNote - Ghi chú thay đổi
 * 
 * @example
 * const config = await homepageService.getPublicConfig()
 * // Returns:
 * // {
 * //   sections: [
 * //     {
 * //       id: "flash-sale",
 * //       title: "Flash Sale",
 * //       products: [
 * //         {
 * //           _id: "123",
 * //           slug: "laptop-dell-xps",
 * //           name: "Dell XPS 13",
 * //           image: "https://...",
 * //           salePrice: 25000000,
 * //           purchases: 150
 * //         }
 * //       ]
 * //     }
 * //   ],
 * //   banners: [...],
 * //   updatedAt: 1701388800000
 * // }
 */
const getPublicConfig = async () => {
  // Lấy config từ database, tạo default nếu chưa có
  const config = await homepageModel.findOrCreateDefaultConfig()
  const sections = config.sections || []
  const banners = config.banners || []

  // Collect all product slugs from all sections
  // Tổng hợp tất cả slugs để fetch 1 lần duy nhất (optimize performance)
  const allSlugs = []
  sections.forEach(section => {
    if (Array.isArray(section.products)) {
      section.products.forEach(product => {
        if (product?.slug) {
          allSlugs.push(product.slug)
        }
      })
    }
  })

  // Fetch all products by slugs in parallel
  // productService.getManyBySlugs() sẽ query database 1 lần cho tất cả slugs
  const products = await productService.getManyBySlugs(allSlugs)

  // Create a map for quick lookup - O(1) time complexity
  // Map structure: slug -> full product data
  const productMap = new Map()
  products.forEach(product => {
    if (product?.slug) {
      // Format product data for frontend
      // Chuẩn hóa fields để frontend dùng nhất quán
      productMap.set(product.slug, {
        _id: product._id || product.id,
        id: product._id || product.id,
        productId: product._id || product.id,
        slug: product.slug,
        title: product.name || '',
        name: product.name || '',
        // Lấy featured image hoặc first image
        image: Array.isArray(product.images) && product.images.length > 0
          ? product.images[product.featuredImageIndex || 0] || product.images[0]
          : '',
        images: Array.isArray(product.images) ? product.images : [],
        salePrice: typeof product.price === 'number' ? product.price : '',
        originalPrice: '', // Product model không có field này
        discount: '', // Product model không có field này
        purchases: typeof product.purchases === 'number' ? product.purchases : 0
      })
    }
  })

  // Merge product data into sections, preserving order
  // Lấy full data từ productMap và merge vào sections
  // Giữ nguyên thứ tự sản phẩm như admin đã sắp xếp
  const sectionsWithProducts = sections.map(section => ({
    ...section,
    products: (section.products || [])
      .map(product => {
        const fullProductData = productMap.get(product.slug)
        if (fullProductData) {
          return fullProductData
        }
        // If product not found (deleted/unpublished), return null to filter out
        return null
      })
      .filter(Boolean) // Remove products that were not found
  }))

  // Filter visible banners and sort by order
  // Chỉ trả về banners có visible=true và sắp xếp theo order tăng dần
  const visibleBanners = banners
    .filter(banner => banner.visible !== false)
    .sort((a, b) => (a.order || 0) - (b.order || 0))

  return {
    sections: sectionsWithProducts,
    banners: visibleBanners,
    updatedAt: config.updatedAt || null,
    updatedBy: config.updatedBy || null,
    lastUpdateNote: config.lastUpdateNote || ''
  }
}

/**
 * Thay thế toàn bộ cấu hình homepage (Admin only)
 * 
 * ⚠️ QUAN TRỌNG: API này REPLACE toàn bộ, KHÔNG merge với data cũ!
 * 
 * Quy trình xử lý:
 * 1. Validate input (sections bắt buộc, banners optional)
 * 2. Preprocess sections:
 *    - Normalize về đúng data types
 *    - Parse dates thành ISO string
 *    - Sắp xếp theo order và reset order (1, 2, 3...)
 *    - Chỉ giữ slug của products
 * 3. Validate sections với Joi schemas
 * 4. Preprocess banners (nếu có):
 *    - Lọc banners không có image
 *    - Sắp xếp và reset order
 *    - Validate với Joi
 * 5. Build updatedBy payload (tracking ai update)
 * 6. Lưu vào database
 * 7. Trả về kết quả
 * 
 * Data Storage Strategy:
 * - Sections: lưu toàn bộ config (title, colors, countdown, etc.)
 * - Products: CHỈ lưu slug (full data fetch khi GET)
 * - Banners: lưu URL image (already uploaded to Cloudinary)
 * - UpdatedBy: tracking userId, name, role, note
 * 
 * Banners Handling:
 * - Nếu banners = undefined → giữ nguyên banners cũ
 * - Nếu banners = [] → xóa hết banners
 * - Nếu banners = [...] → thay thế toàn bộ
 * 
 * @async
 * @function replaceSections
 * @param {Object} params - Input parameters
 * @param {Array} params.sections - Danh sách sections (REQUIRED)
 * @param {Array} [params.banners] - Danh sách banners (OPTIONAL, undefined = keep old)
 * @param {Object} params.user - User info từ JWT (for tracking)
 * @param {Object} [params.metadata] - Metadata
 * @param {string} [params.metadata.note] - Ghi chú thay đổi
 * @returns {Promise<Object>} Cấu hình đã lưu
 * @returns {Array} returns.sections - Sections đã normalize & validate
 * @returns {Array} returns.banners - Banners đã normalize & validate
 * @returns {number} returns.updatedAt - Timestamp lưu
 * @returns {Object} returns.updatedBy - Thông tin người update
 * @returns {string} returns.lastUpdateNote - Ghi chú
 * 
 * @throws {ApiError} 400 - sections không phải array
 * @throws {ApiError} 422 - Validation failed
 * @throws {ApiError} 500 - Database save failed
 * 
 * @example
 * const result = await homepageService.replaceSections({
 *   sections: [
 *     {
 *       id: "flash-sale",
 *       title: "Flash Sale",
 *       products: [{slug: "laptop-dell-xps"}],
 *       hasCountdown: true,
 *       countdownEnd: "2024-12-25T00:00:00Z"
 *     }
 *   ],
 *   banners: [
 *     {
 *       id: "banner-1",
 *       image: "https://...",
 *       title: "Sale 50%",
 *       order: 1
 *     }
 *   ],
 *   user: { _id: "abc123", fullName: "Admin", role: "admin" },
 *   metadata: { note: "Update Black Friday campaign" }
 * })
 */
const replaceSections = async ({ sections, banners, user, metadata }) => {
  // Validate input: sections must be array
  if (!Array.isArray(sections)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'sections must be an array')
  }

  // Preprocess sections: normalize data types, sort, reset order
  const normalizedSections = preprocessSections(sections)
  // Validate sections with Joi schema
  const validatedSections = await validateSections(normalizedSections)

  // Process banners if provided
  let validatedBanners = undefined
  if (banners !== undefined) {
    // Nếu banners được truyền (có thể là [] để xóa hết)
    if (!Array.isArray(banners)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'banners must be an array')
    }
    // Preprocess: filter invalid, sort, reset order
    const normalizedBanners = preprocessBanners(banners)
    // Validate with Joi schema
    validatedBanners = await validateBanners(normalizedBanners)
  }
  // Nếu banners = undefined, model sẽ giữ nguyên banners cũ

  // Build tracking payload: ai update, khi nào, ghi chú gì
  const updatedBy = buildUpdatedByPayload(user, metadata)

  // Save to database
  const result = await homepageModel.saveSections({
    sections: validatedSections,
    banners: validatedBanners,
    updatedBy,
    lastUpdateNote: metadata?.note || ''
  })

  // Check save result
  if (!result) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to save homepage configuration')
  }

  // Return saved config
  return {
    sections: result.sections || [],
    banners: result.banners || [],
    updatedAt: result.updatedAt || null,
    updatedBy: result.updatedBy || null,
    lastUpdateNote: result.lastUpdateNote || ''
  }
}

export const homepageService = {
  getPublicConfig,
  replaceSections
}

