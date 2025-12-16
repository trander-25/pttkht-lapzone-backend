import { productModel } from '~/models/productModel'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import { CloudinaryProvider } from '~/providers/CloudinaryProvider'
import { PRODUCT_PAGINATION } from '~/utils/constants'

/**
 * Tạo sản phẩm mới
 * @param {Object} reqBody - Thông tin sản phẩm (name, price, category, specs...)
 * @param {Array} productImages - Mảng file ảnh từ multer (Buffer)
 * @returns {Promise<Object>} - Sản phẩm vừa được tạo
 *
 * Quy trình:
 * 1. Upload ảnh lên Cloudinary nếu có file ảnh từ multer
 * 2. Hoặc sử dụng URL ảnh từ reqBody.images nếu có
 * 3. Tạo sản phẩm với ảnh đã upload và featuredImageIndex = 0 (ảnh đầu tiên)
 * 4. Trả về sản phẩm vừa tạo
 */
const createProduct = async (reqBody, productImages) => {
  try {
    let imageUrls = []

    // Upload images to Cloudinary if provided via files
    if (productImages && productImages.length > 0) {
      const uploadPromises = productImages.map(file =>
        CloudinaryProvider.streamUpload(file.buffer, 'products')
      )
      const uploadResults = await Promise.all(uploadPromises)
      imageUrls = uploadResults.map(result => result.secure_url)
    } else if (reqBody.images && Array.isArray(reqBody.images)) {
      // Use provided image URLs from request body
      imageUrls = reqBody.images
    } else {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'At least one image is required')
    }

    const newProduct = {
      ...reqBody,
      images: imageUrls,
      featuredImageIndex: 0 // Default to first image
    }

    const createdProduct = await productModel.createProduct(newProduct)
    const getNewProduct = await productModel.findOneById(createdProduct.insertedId)

    return getNewProduct
  } catch (error) { throw error }
}

/**
 * Lấy danh sách sản phẩm với filtering, sorting và pagination
 * @param {Object} queryParams - Query parameters từ request
 * @returns {Promise<Object>} - { data: products[], pagination: {...} }
 *
 * Hỗ trợ filters:
 * - Cơ bản: category, brand, price (min-max), tags, warranty
 * - Laptop: cpu, gpu, screenSize, resolution, screenTech, refreshRate, ram, storage
 * - Mouse: connection, dpi
 * - Headphone: type, connection, batteryLife, driverSize
 * - Keyboard: type, switchType, layout, connection, backlight
 * - RAM: capacity, type, speed, voltage
 * - Disk: type, capacity
 * - Charger: power, type, cableLength
 *
 * Sorting: asc (giá tăng), desc (giá giảm), default (mới nhất)
 * Search: Tìm trong name, description, brand, category, tags
 *
 * Lưu ý:
 * - Validate page/limit để tránh overload
 * - Sử dụng regex case-insensitive cho text search
 * - Hỗ trợ filter phức tạp cho laptop (screenDes chứa nhiều thông tin)
 */
const getMany = async (queryParams) => {
  try {
    const {
      page = PRODUCT_PAGINATION.DEFAULT_PAGE,
      limit = PRODUCT_PAGINATION.DEFAULT_LIMIT,
      category, // Product category
      brand,
      price, // Format: "0-3600000"
      ram, // Format: "16gb"
      screensize, // Format: "16inch"
      storage, // Storage capacity
      q, // Search query (alias of 'search' in validation)
      search, // may come from validator
      tags, // string or array
      sort, // Format: "asc" hoặc "desc" (cho giá)
      warranty, // Warranty in months
      chargerpower, // Charger power in watts
      chargertype, // Charger type
      chargercablelength, // Charger cable length in meters
      // Laptop filters
      laptopcpu, // Laptop CPU
      laptopgpu, // Laptop GPU
      laptopscreensizerange, // Laptop screen size range: "13", "14", "15+"
      laptopresolution, // Laptop screen resolution: "HD", "FHD", "2.8K", "3K", "4K"
      laptopscreentech, // Laptop screen technology: "OLED", "IPS", "Liquid Retina", "Cảm ứng"
      laptoprefreshrate, // Laptop refresh rate: "60Hz", "90Hz", "120Hz", "144Hz", "165Hz"
      // Mouse filters
      mouseconnection, // Mouse connection type
      mousedpi, // Mouse DPI
      // Headphone filters
      headphonetype, // Headphone type
      headphoneconnection, // Headphone connection type
      headphonebatterylife, // Headphone battery life in hours
      headphonedriversize, // Headphone driver size in mm
      // Keyboard filters
      keyboardtype, // Keyboard type
      keyboardswitchtype, // Keyboard switch type
      keyboardlayout, // Keyboard layout
      keyboardconnection, // Keyboard connection type
      keyboardbacklight, // Keyboard backlight: "true" or "false"
      // RAM filters
      ramcapacity, // RAM capacity in GB
      ramtype, // RAM type
      ramspeed, // RAM speed in MHz
      ramvoltage, // RAM voltage
      // Disk filters
      disktype, // Disk type: "SSD" or "HDD"
      diskcapacity // Disk capacity
    } = queryParams

    // Validate and limit pagination
    const validatedPage = Math.max(parseInt(page) || PRODUCT_PAGINATION.DEFAULT_PAGE, PRODUCT_PAGINATION.DEFAULT_PAGE)
    const validatedLimit = Math.min(
      Math.max(parseInt(limit) || PRODUCT_PAGINATION.DEFAULT_LIMIT, PRODUCT_PAGINATION.MIN_LIMIT),
      PRODUCT_PAGINATION.MAX_LIMIT
    )

    // Build filter object
    const filter = {}

    // Filter by category (case-insensitive exact match)
    if (category) {
      filter.category = { $regex: new RegExp(`^${category}$`, 'i') }
    }

    // Filter by brand (case-insensitive)
    if (brand) {
      filter.brand = { $regex: new RegExp(`^${brand}$`, 'i') }
    }

    // Filter by price range
    if (price) {
      const [min, max] = price.split('-').map(p => parseFloat(p))
      if (!isNaN(min) && !isNaN(max)) {
        filter.price = { $gte: min, $lte: max }
      }
    }

    // Filter by RAM
    if (ram) {
      const ramValue = parseFloat(ram.toString().replace(/gb/i, ''))
      if (!isNaN(ramValue)) {
        filter['specs.ram'] = ramValue
      }
    }

    // Filter by screen size (only if laptopscreensizerange is not set)
    if (screensize && !laptopscreensizerange) {
      const screenValue = parseFloat(screensize.toString().replace(/inch/i, ''))
      if (!isNaN(screenValue)) {
        filter['specs.screenSize'] = screenValue
      }
    }

    // Filter by storage (case-insensitive)
    if (storage) {
      filter['specs.storage'] = { $regex: new RegExp(storage, 'i') }
    }

    // Search filter
    const finalQ = (q || search || '').toString().trim()
    if (finalQ) {
      const searchRegex = new RegExp(finalQ, 'i')
      filter.$or = [
        { name: searchRegex },
        { description: searchRegex },
        { brand: searchRegex },
        { category: searchRegex },
        { tags: { $in: [searchRegex] } }
      ]
    }

    // Tags filter (case-insensitive exact match for any tag)
    if (typeof tags !== 'undefined' && tags !== null && tags !== '') {
      const tagList = Array.isArray(tags) ? tags : [tags]
      const normalizedTags = tagList
        .map(t => String(t).trim())
        .filter(Boolean)
        .map(t => new RegExp(`^${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'))
      if (normalizedTags.length) {
        filter.tags = { $in: normalizedTags }
      }
    }

    // Filter by warranty (in months)
    if (warranty) {
      const warrantyValue = parseFloat(warranty)
      if (!isNaN(warrantyValue)) {
        filter.warranty = warrantyValue
      }
    }

    // Filter by charger power (in watts)
    if (chargerpower) {
      const powerValue = parseFloat(chargerpower.toString().replace(/w/i, ''))
      if (!isNaN(powerValue)) {
        filter['specs.power'] = powerValue
      }
    }

    // Filter by charger type
    if (chargertype) {
      filter['specs.type'] = { $regex: new RegExp(`^${chargertype}$`, 'i') }
    }

    // Filter by charger cable length (in meters)
    if (chargercablelength) {
      const cableLengthValue = parseFloat(chargercablelength.toString().replace(/m/i, ''))
      if (!isNaN(cableLengthValue)) {
        filter['specs.cableLength'] = cableLengthValue
      }
    }

    // Laptop filters
    if (laptopcpu) {
      // Search CPU by type in specs.cpu (case-insensitive)
      // Similar to screenDes filters - search anywhere in the string
      // Special handling for "Khác" (Other) - match CPUs that don't contain any predefined type
      if (laptopcpu === 'Khác') {
        const predefinedTypes = [
          'Intel Core i3', 'Intel Core i5', 'Intel Core i7', 'Intel Core i9',
          'AMD Ryzen 3', 'AMD Ryzen 5', 'AMD Ryzen 7', 'AMD Ryzen 9',
          'Intel Core Ultra 5', 'Intel Core Ultra 7', 'Intel Core Ultra 9',
          'Intel Core Xeon', 'Apple M1', 'Apple M2', 'Apple M3'
        ]
        // Match CPUs that don't contain any predefined type
        const regexPattern = predefinedTypes
          .map(type => type.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
          .join('|')
        filter['specs.cpu'] = {
          $regex: new RegExp(`^(?!.*(${regexPattern})).*`, 'i')
        }
      } else {
        // Search for CPU type anywhere in specs.cpu (case-insensitive)
        // Examples: "Intel Core i3" matches "Intel Core i3-12450H", "Intel Core i3-12100F", etc.
        const escapedCpuType = laptopcpu.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        filter['specs.cpu'] = { $regex: new RegExp(escapedCpuType, 'i') }
      }
    }
    if (laptopgpu) {
      filter['specs.gpu'] = { $regex: new RegExp(`^${laptopgpu.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    }
    if (laptopscreensizerange) {
      const range = laptopscreensizerange.toString()
      if (range === '13') {
        filter['specs.screenSize'] = { $gte: 12.5, $lt: 13.5 }
      } else if (range === '14') {
        filter['specs.screenSize'] = { $gte: 13.5, $lt: 14.5 }
      } else if (range === '15+') {
        filter['specs.screenSize'] = { $gte: 14.5 }
      }
    }

    // Filter by screen properties - search in screenDes
    // Combine multiple filters if they all apply to screenDes
    const screenDesFilters = []
    if (laptopresolution) {
      let resolutionPattern
      if (laptopresolution === 'HD') {
        // For "HD", use negative lookbehind to avoid matching "FHD"
        // Match "HD" but not when preceded by "F" or "f" (case-insensitive)
        // MongoDB supports lookbehind in newer versions, but we'll use a safer approach
        // Match HD that is either at start, after space, or not after F/f
        resolutionPattern = '(?<![Ff])HD'
      } else {
        // For other resolutions (FHD, 2.8K, 3K, 4K), match normally
        const escapedResolution = laptopresolution.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        resolutionPattern = escapedResolution
      }
      // Match resolution in screenDes (case-insensitive)
      // Examples: "HD" matches "HD" but not "FHD", "FHD" matches "FHD", "4K" matches "4K"
      screenDesFilters.push({ 'specs.screenDes': { $regex: new RegExp(resolutionPattern, 'i') } })
    }
    if (laptopscreentech) {
      const escapedTech = laptopscreentech.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      // Match technology in screenDes (case-insensitive)
      // Examples: "OLED", "IPS", "Liquid Retina", "Cảm ứng"
      screenDesFilters.push({ 'specs.screenDes': { $regex: new RegExp(escapedTech, 'i') } })
    }
    if (laptoprefreshrate) {
      const escapedRefreshRate = laptoprefreshrate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      // Match refresh rate in screenDes (case-insensitive)
      // Examples: "60Hz", "120Hz", "144Hz" should match in strings like "IPS FHD 60Hz" or "OLED 4K 120Hz"
      screenDesFilters.push({ 'specs.screenDes': { $regex: new RegExp(escapedRefreshRate, 'i') } })
    }

    // If multiple screenDes filters exist, combine them with $and
    if (screenDesFilters.length > 0) {
      if (screenDesFilters.length === 1) {
        // Single filter - apply directly
        Object.assign(filter, screenDesFilters[0])
      } else {
        // Multiple filters - use $and to combine
        if (!filter.$and) {
          filter.$and = []
        }
        filter.$and.push(...screenDesFilters)
      }
    }

    // Mouse filters
    if (mouseconnection) {
      filter['specs.connection'] = { $regex: new RegExp(`^${mouseconnection.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    }
    if (mousedpi) {
      const dpiValue = parseFloat(mousedpi)
      if (!isNaN(dpiValue)) {
        filter['specs.dpi'] = dpiValue
      }
    }

    // Headphone filters
    if (headphonetype) {
      filter['specs.type'] = { $regex: new RegExp(`^${headphonetype.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    }
    if (headphoneconnection) {
      filter['specs.connection'] = { $regex: new RegExp(`^${headphoneconnection.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    }
    if (headphonebatterylife) {
      const batteryLifeValue = parseFloat(headphonebatterylife)
      if (!isNaN(batteryLifeValue)) {
        filter['specs.batteryLife'] = batteryLifeValue
      }
    }
    if (headphonedriversize) {
      const driverSizeValue = parseFloat(headphonedriversize)
      if (!isNaN(driverSizeValue)) {
        filter['specs.driverSize'] = driverSizeValue
      }
    }

    // Keyboard filters
    if (keyboardtype) {
      filter['specs.type'] = { $regex: new RegExp(`^${keyboardtype.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    }
    if (keyboardswitchtype) {
      filter['specs.switchType'] = { $regex: new RegExp(`^${keyboardswitchtype.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    }
    if (keyboardlayout) {
      filter['specs.layout'] = { $regex: new RegExp(`^${keyboardlayout.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    }
    if (keyboardconnection) {
      filter['specs.connection'] = { $regex: new RegExp(`^${keyboardconnection.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    }
    if (keyboardbacklight !== undefined && keyboardbacklight !== null && keyboardbacklight !== '') {
      const backlightValue = keyboardbacklight.toString().toLowerCase() === 'true'
      filter['specs.backlight'] = backlightValue
    }

    // RAM filters
    if (ramcapacity) {
      const capacityValue = parseFloat(ramcapacity)
      if (!isNaN(capacityValue)) {
        filter['specs.capacity'] = capacityValue
      }
    }
    if (ramtype) {
      filter['specs.type'] = { $regex: new RegExp(`^${ramtype.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    }
    if (ramspeed) {
      const speedValue = parseFloat(ramspeed)
      if (!isNaN(speedValue)) {
        filter['specs.speed'] = speedValue
      }
    }
    if (ramvoltage) {
      const voltageValue = parseFloat(ramvoltage)
      if (!isNaN(voltageValue)) {
        filter['specs.voltage'] = voltageValue
      }
    }

    // Disk filters
    if (disktype) {
      filter['specs.type'] = { $regex: new RegExp(`^${disktype.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    }
    if (diskcapacity) {
      filter['specs.capacity'] = { $regex: new RegExp(diskcapacity, 'i') }
    }

    // Build sort object - sort theo giá
    const sortObject = {}
    if (sort === 'asc') {
      sortObject.price = 1 // Giá tăng dần
    } else if (sort === 'desc') {
      sortObject.price = -1 // Giá giảm dần
    } else {
      sortObject.createdAt = -1 // Default: mới nhất
    }

    const options = {
      page: validatedPage,
      limit: validatedLimit,
      sort: sortObject
    }

    const result = await productModel.findMany(filter, options)

    // Transform response structure
    return {
      data: result.products,
      pagination: {
        currentPage: result.pagination.page,
        totalPages: result.pagination.totalPages,
        totalItems: result.pagination.total,
        hasNextPage: result.pagination.page < result.pagination.totalPages,
        hasPrevPage: result.pagination.page > 1
      }
    }
  } catch (error) { throw error }
}

/**
 * Lấy chi tiết sản phẩm theo ID
 * @param {string} productId - MongoDB ObjectId
 * @returns {Promise<Object>} - Thông tin chi tiết sản phẩm
 */
const getDetails = async (productId) => {
  try {
    const product = await productModel.findOneById(productId)
    if (!product) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Product not found!')
    }
    return product
  } catch (error) { throw error }
}

/**
 * Lấy chi tiết sản phẩm theo slug và tăng lượt xem
 * @param {string} slug - Product slug (SEO-friendly URL)
 * @returns {Promise<Object>} - Thông tin chi tiết sản phẩm
 *
 * Chức năng:
 * - Tìm sản phẩm theo slug
 * - Tự động tăng views (non-blocking, không chờ kết quả)
 * - Sử dụng cho trang chi tiết sản phẩm public
 */
const getDetailsBySlug = async (slug) => {
  try {
    const product = await productModel.findOneBySlug(slug)
    if (!product) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Product not found!')
    }

    // Increment views (non-blocking - không chờ kết quả)
    productModel.incrementViewsBySlug(slug).catch(() => {})

    return product
  } catch (error) { throw error }
}

/**
 * Lấy nhiều sản phẩm theo danh sách slugs
 * @param {Array<string>} slugs - Mảng product slugs
 * @returns {Promise<Array>} - Mảng sản phẩm theo thứ tự slugs input
 *
 * Đặc biệt:
 * - Trả về products theo đúng thứ tự slugs array (quan trọng cho homepage sections)
 * - Lọc bỏ slugs không hợp lệ (empty, null, undefined)
 * - Trả về empty array nếu lỗi (để homepage vẫn load được)
 * - Sử dụng Map để lookup nhanh và giữ thứ tự
 */
const getManyBySlugs = async (slugs) => {
  try {
    if (!Array.isArray(slugs) || slugs.length === 0) {
      return []
    }

    // Filter out empty/invalid slugs
    const validSlugs = slugs.filter(slug => slug && typeof slug === 'string' && slug.trim().length > 0)
    if (validSlugs.length === 0) {
      return []
    }

    // Query products by slugs
    const filter = { slug: { $in: validSlugs } }
    const result = await productModel.findMany(filter, {
      page: 1,
      limit: validSlugs.length,
      sort: { createdAt: -1 }
    })

    // Create a map for quick lookup
    const productMap = new Map()
    if (result?.products) {
      result.products.forEach(product => {
        if (product.slug) {
          productMap.set(product.slug, product)
        }
      })
    }

    // Return products in the same order as slugs array
    return validSlugs.map(slug => productMap.get(slug)).filter(Boolean)
  } catch (error) {
    // Return empty array to prevent homepage from breaking if products can't be fetched
    // Error is silently handled to ensure homepage still loads
    return []
  }
}

/**
 * Cập nhật thông tin sản phẩm
 * @param {string} productId - MongoDB ObjectId
 * @param {Object} reqBody - Dữ liệu cần update
 * @param {Array} productImages - File ảnh mới từ multer (optional)
 * @returns {Promise<Object>} - Sản phẩm đã update
 *
 * Quy trình:
 * 1. Kiểm tra sản phẩm tồn tại
 * 2. Upload ảnh mới lên Cloudinary nếu có
 * 3. Merge ảnh mới với ảnh cũ (giữ lại ảnh cũ + thêm ảnh mới)
 * 4. Validate featuredImageIndex (phải nằm trong range hợp lệ)
 * 5. Deep merge specs (hỗ trợ partial update specs)
 * 6. Parse JSON nếu specs gửi dưới dạng string (multipart/form-data)
 */
const updateProduct = async (productId, reqBody, productImages) => {
  try {
    const existProduct = await productModel.findOneById(productId)
    if (!existProduct) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Product not found!')
    }

    let updateData = { ...reqBody }

    // Handle image uploads if new images are provided
    if (productImages && productImages.length > 0) {
      const uploadPromises = productImages.map(file =>
        CloudinaryProvider.streamUpload(file.buffer, 'products')
      )
      const uploadResults = await Promise.all(uploadPromises)
      const newImageUrls = uploadResults.map(result => result.secure_url)

      // Merge with existing images or replace
      const existingImages = existProduct.images || []
      if (updateData.images && Array.isArray(updateData.images)) {
        // Client sent image URLs to keep, merge with new uploads
        updateData.images = [...updateData.images, ...newImageUrls]
      } else {
        // Append new images to existing ones
        updateData.images = [...existingImages, ...newImageUrls]
      }
    }
    // If updateData.images is provided as array, it's already set (for reordering)

    // Ensure featuredImageIndex is valid
    if (updateData.featuredImageIndex !== undefined) {
      const imageCount = (updateData.images || existProduct.images || []).length
      if (updateData.featuredImageIndex < 0 || updateData.featuredImageIndex >= imageCount) {
        updateData.featuredImageIndex = 0
      }
    }

    // Nếu specs được gửi dưới dạng chuỗi (multipart/form-data), parse nó
    if (updateData.specs && typeof updateData.specs === 'string') {
      try { updateData.specs = JSON.parse(updateData.specs) } catch (e) { /* ignore parse error */ }
    }

    // Deep merge specs (client có thể gửi partial specs)
    const deepMerge = (target = {}, source = {}) => {
      const out = { ...target }
      Object.keys(source).forEach(key => {
        const srcVal = source[key]
        if (srcVal && typeof srcVal === 'object' && !Array.isArray(srcVal)) {
          out[key] = deepMerge(target[key], srcVal)
        } else {
          out[key] = srcVal
        }
      })
      return out
    }

    if (updateData.specs && typeof updateData.specs === 'object') {
      updateData.specs = deepMerge(existProduct.specs || {}, updateData.specs)
    }

    const updatedProduct = await productModel.updateOneById(productId, updateData)
    return updatedProduct
  } catch (error) { throw error }
}

/**
 * Xóa sản phẩm
 * @param {string} productId - MongoDB ObjectId
 * @returns {Promise<Object>} - Message xác nhận xóa
 */
const deleteProduct = async (productId) => {
  try {
    const existProduct = await productModel.findOneById(productId)
    if (!existProduct) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Product not found!')
    }

    await productModel.deleteOneById(productId)
    return { message: 'Product deleted successfully!' }
  } catch (error) { throw error }
}

/**
 * Tìm kiếm sản phẩm sử dụng MongoDB Atlas Search
 * @param {string} searchQuery - Từ khóa tìm kiếm
 * @param {Object} options - { page, limit }
 * @returns {Promise<Object>} - Kết quả tìm kiếm với pagination
 *
 * Sử dụng Atlas Search Index để tìm kiếm full-text nâng cao
 */
const searchProducts = async (searchQuery, options = {}) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort,
      sortBy,
      sortOrder
    } = options
    const validatedPage = Math.max(parseInt(page) || 1, 1)
    const validatedLimit = Math.max(parseInt(limit) || 10, 1)

    let resolvedSortBy = 'createdAt'
    let resolvedSortOrder = 'desc'

    if (sort && (sort === 'asc' || sort === 'desc')) {
      resolvedSortBy = 'price'
      resolvedSortOrder = sort
    } else if (sortBy && (sortBy === 'price' || sortBy === 'createdAt')) {
      resolvedSortBy = sortBy
      if (sortOrder && (sortOrder === 'asc' || sortOrder === 'desc')) {
        resolvedSortOrder = sortOrder
      }
    }

    const { results, total } = await productModel.searchProductsAtlas(searchQuery, {
      page: validatedPage,
      limit: validatedLimit,
      sortBy: resolvedSortBy,
      sortOrder: resolvedSortOrder
    })

    return {
      data: results,
      pagination: {
        currentPage: validatedPage,
        totalPages: total > 0 ? Math.ceil(total / validatedLimit) : 0,
        totalItems: total,
        limit: validatedLimit
      }
    }
  } catch (error) { throw error }
}

/**
 * Sắp xếp lại thứ tự ảnh sản phẩm
 * @param {string} productId - MongoDB ObjectId
 * @param {Array<number>} imageOrder - Mảng index mới [2, 0, 1, 3]
 * @returns {Promise<Object>} - Sản phẩm đã update
 *
 * Ví dụ:
 * - Ảnh hiện tại: [A, B, C, D]
 * - imageOrder: [2, 0, 1, 3]
 * - Kết quả: [C, A, B, D]
 *
 * Validation:
 * - Số lượng phải khớp với số ảnh hiện có
 * - Không có index trùng lặp
 * - Tất cả index phải hợp lệ (0 đến length-1)
 * - Tự động điều chỉnh featuredImageIndex
 */
const reorderImages = async (productId, imageOrder) => {
  try {
    const existProduct = await productModel.findOneById(productId)
    if (!existProduct) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Product not found!')
    }

    const currentImages = existProduct.images || []

    // Validate image order array
    if (!Array.isArray(imageOrder) || imageOrder.length !== currentImages.length) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid image order array')
    }

    // Validate all indices are valid
    const validIndices = imageOrder.every((idx) =>
      Number.isInteger(idx) && idx >= 0 && idx < currentImages.length
    )
    if (!validIndices || new Set(imageOrder).size !== imageOrder.length) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid image indices')
    }

    // Reorder images
    const reorderedImages = imageOrder.map(idx => currentImages[idx])

    // Update featuredImageIndex if needed
    let featuredImageIndex = existProduct.featuredImageIndex || 0
    const oldFeaturedIndex = imageOrder.indexOf(featuredImageIndex)
    if (oldFeaturedIndex !== -1) {
      featuredImageIndex = oldFeaturedIndex
    } else {
      featuredImageIndex = 0
    }

    const updatedProduct = await productModel.updateOneById(productId, {
      images: reorderedImages,
      featuredImageIndex
    })

    return updatedProduct
  } catch (error) { throw error }
}

/**
 * Xóa một ảnh khỏi sản phẩm
 * @param {string} productId - MongoDB ObjectId
 * @param {number} imageIndex - Vị trí ảnh cần xóa
 * @returns {Promise<Object>} - Sản phẩm đã update
 *
 * Quy tắc:
 * - Sản phẩm phải có ít nhất 1 ảnh (không cho xóa ảnh cuối)
 * - Tự động điều chỉnh featuredImageIndex nếu xóa ảnh featured
 * - Nếu xóa ảnh trước featured, giảm featuredImageIndex đi 1
 */
const deleteImage = async (productId, imageIndex) => {
  try {
    const existProduct = await productModel.findOneById(productId)
    if (!existProduct) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Product not found!')
    }

    const currentImages = existProduct.images || []
    const index = parseInt(imageIndex)

    if (isNaN(index) || index < 0 || index >= currentImages.length) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid image index')
    }

    if (currentImages.length <= 1) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Product must have at least one image')
    }

    // Remove image at index
    const updatedImages = currentImages.filter((_, i) => i !== index)

    // Update featuredImageIndex if needed
    let featuredImageIndex = existProduct.featuredImageIndex || 0
    if (index === featuredImageIndex) {
      featuredImageIndex = 0 // Reset to first image
    } else if (index < featuredImageIndex) {
      featuredImageIndex = featuredImageIndex - 1 // Adjust index
    }

    const updatedProduct = await productModel.updateOneById(productId, {
      images: updatedImages,
      featuredImageIndex
    })

    return updatedProduct
  } catch (error) { throw error }
}

/**
 * Đặt ảnh nổi bật (ảnh hiển thị chính) cho sản phẩm
 * @param {string} productId - MongoDB ObjectId
 * @param {number} imageIndex - Vị trí ảnh muốn set làm featured
 * @returns {Promise<Object>} - Sản phẩm đã update
 *
 * Ảnh featured sẽ được hiển thị:
 * - Trong danh sách sản phẩm (thumbnail)
 * - Ảnh đầu tiên trong product carousel
 */
const setFeaturedImage = async (productId, imageIndex) => {
  try {
    const existProduct = await productModel.findOneById(productId)
    if (!existProduct) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Product not found!')
    }

    const currentImages = existProduct.images || []
    const index = parseInt(imageIndex)

    if (isNaN(index) || index < 0 || index >= currentImages.length) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid image index')
    }

    const updatedProduct = await productModel.updateOneById(productId, {
      featuredImageIndex: index
    })

    return updatedProduct
  } catch (error) { throw error }
}

export const productService = {
  createProduct,
  getMany,
  getDetails,
  getDetailsBySlug,
  getManyBySlugs,
  updateProduct,
  deleteProduct,
  searchProducts,
  reorderImages,
  deleteImage,
  setFeaturedImage
}
