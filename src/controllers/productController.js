import { StatusCodes } from 'http-status-codes'
import { productService } from '~/services/productService'

/**
 * Tạo sản phẩm mới (Admin)
 * @param {object} req.body - Thông tin sản phẩm (name, description, price, category, brand, stock, specs, etc.)
 * @param {array} req.files - Danh sách hình ảnh sản phẩm (từ Multer)
 * @returns {object} Sản phẩm vừa được tạo
 */
const createProduct = async (req, res, next) => {
  try {
    const productImages = req.files // Multer files
    const createdProduct = await productService.createProduct(req.body, productImages)

    res.status(StatusCodes.CREATED).json(createdProduct)
  } catch (error) { next(error) }
}

/**
 * Lấy danh sách sản phẩm với phân trang và bộ lọc
 * @param {object} req.query - Các tham số query (page, limit, category, brand, minPrice, maxPrice, sort, etc.)
 * @returns {object} Danh sách sản phẩm và thông tin phân trang
 */
const getMany = async (req, res, next) => {
  try {
    const result = await productService.getMany(req.query)

    res.status(StatusCodes.OK).json(result)
  } catch (error) { next(error) }
}

/**
 * Lấy thông tin chi tiết sản phẩm theo ID
 * @param {string} req.params.id - ID của sản phẩm
 * @returns {object} Thông tin chi tiết sản phẩm bao gồm reviews và rating trung bình
 */
const getDetails = async (req, res, next) => {
  try {
    const productId = req.params.id
    const product = await productService.getDetails(productId)

    res.status(StatusCodes.OK).json(product)
  } catch (error) { next(error) }
}

/**
 * Lấy thông tin chi tiết sản phẩm theo slug (URL thân thiện)
 * @param {string} req.params.slug - Slug của sản phẩm (vd: "laptop-dell-inspiron-15")
 * @returns {object} Thông tin chi tiết sản phẩm
 */
const getDetailsBySlug = async (req, res, next) => {
  try {
    const slug = req.params.slug
    const product = await productService.getDetailsBySlug(slug)

    res.status(StatusCodes.OK).json(product)
  } catch (error) { next(error) }
}

/**
 * Cập nhật thông tin sản phẩm (Admin)
 * @param {string} req.params.id - ID của sản phẩm cần cập nhật
 * @param {object} req.body - Dữ liệu cần cập nhật
 * @param {array} req.files - Hình ảnh mới (nếu có)
 * @returns {object} Sản phẩm đã được cập nhật
 */
const updateProduct = async (req, res, next) => {
  try {
    const productId = req.params.id
    const productImages = req.files // Multer files
    const updatedProduct = await productService.updateProduct(productId, req.body, productImages)

    res.status(StatusCodes.OK).json(updatedProduct)
  } catch (error) { next(error) }
}

/**
 * Xóa sản phẩm (Admin)
 * Sản phẩm sẽ bị xóa mềm (isDeleted = true) thay vì xóa vĩnh viễn
 * @param {string} req.params.id - ID của sản phẩm cần xóa
 * @returns {object} Thông báo xóa thành công
 */
const deleteProduct = async (req, res, next) => {
  try {
    const productId = req.params.id
    const result = await productService.deleteProduct(productId)

    res.status(StatusCodes.OK).json(result)
  } catch (error) { next(error) }
}

/**
 * Tìm kiếm sản phẩm theo từ khóa
 * Tìm kiếm trong tên, mô tả, thương hiệu và danh mục sản phẩm
 * @param {string} req.query.q - Từ khóa tìm kiếm
 * @param {number} req.query.page - Trang hiện tại (mặc định: 1)
 * @param {number} req.query.limit - Số lượng kết quả mỗi trang (mặc định: 10)
 * @returns {object} Kết quả tìm kiếm và thông tin phân trang
 */
const searchProducts = async (req, res, next) => {
  try {
    const { q, page = 1, limit = 10, sort, sortBy, sortOrder } = req.query
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort,
      sortBy,
      sortOrder
    }
    const result = await productService.searchProducts(q, options)

    res.status(StatusCodes.OK).json(result)
  } catch (error) { next(error) }
}

/**
 * Sắp xếp lại thứ tự hình ảnh của sản phẩm (Admin)
 * @param {string} req.params.id - ID của sản phẩm
 * @param {array} req.body.imageOrder - Mảng chỉ số thứ tự mới của hình ảnh
 * @returns {object} Sản phẩm với thứ tự hình ảnh đã được cập nhật
 */
const reorderImages = async (req, res, next) => {
  try {
    const productId = req.params.id
    const { imageOrder } = req.body
    const updatedProduct = await productService.reorderImages(productId, imageOrder)

    res.status(StatusCodes.OK).json(updatedProduct)
  } catch (error) { next(error) }
}

/**
 * Xóa một hình ảnh của sản phẩm (Admin)
 * @param {string} req.params.id - ID của sản phẩm
 * @param {number} req.body.imageIndex - Chỉ số của hình ảnh cần xóa
 * @returns {object} Sản phẩm sau khi xóa hình ảnh
 */
const deleteImage = async (req, res, next) => {
  try {
    const productId = req.params.id
    const { imageIndex } = req.body
    const updatedProduct = await productService.deleteImage(productId, imageIndex)

    res.status(StatusCodes.OK).json(updatedProduct)
  } catch (error) { next(error) }
}

/**
 * Đặt hình ảnh nổi bật cho sản phẩm (Admin)
 * Hình ảnh này sẽ được hiển thị đầu tiên trong danh sách
 * @param {string} req.params.id - ID của sản phẩm
 * @param {number} req.body.imageIndex - Chỉ số của hình ảnh muốn đặt làm featured
 * @returns {object} Sản phẩm với hình ảnh featured đã được cập nhật
 */
const setFeaturedImage = async (req, res, next) => {
  try {
    const productId = req.params.id
    const { imageIndex } = req.body
    const updatedProduct = await productService.setFeaturedImage(productId, imageIndex)

    res.status(StatusCodes.OK).json(updatedProduct)
  } catch (error) { next(error) }
}

export const productController = {
  createProduct,
  getMany,
  getDetails,
  getDetailsBySlug,
  updateProduct,
  deleteProduct,
  searchProducts,
  reorderImages,
  deleteImage,
  setFeaturedImage
}
