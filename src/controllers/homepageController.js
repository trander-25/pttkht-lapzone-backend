/**
 * HOMEPAGE CONTROLLER - XỬ LÝ REQUEST CHO TRANG CHỦ
 * 
 * Module này chứa các controller handlers cho homepage:
 * - getConfig: Lấy cấu hình trang chủ (public)
 * - updateSections: Cập nhật cấu hình (admin)
 * - uploadBannerImage: Upload banner image (admin)
 * 
 * @module controllers/homepageController
 */

import { StatusCodes } from 'http-status-codes'
import { homepageService } from '~/services/homepageService'
import { CloudinaryProvider } from '~/providers/CloudinaryProvider'

/**
 * Handler: Lấy cấu hình trang chủ (Public API)
 * 
 * Flow:
 * 1. Gọi homepageService.getPublicConfig()
 * 2. Service sẽ fetch config + populate products data
 * 3. Trả về JSON với sections, banners, metadata
 * 
 * Response bao gồm:
 * - sections: Array các section với full product data
 * - banners: Array banners đã filter visible
 * - updatedAt: Timestamp cập nhật cuối
 * - updatedBy: Thông tin người cập nhật
 * - lastUpdateNote: Ghi chú thay đổi
 * 
 * @async
 * @function getConfig
 * @param {Express.Request} req - Express request object
 * @param {Express.Response} res - Express response object
 * @param {Express.NextFunction} next - Express next middleware
 * @returns {Promise<void>} JSON response với cấu hình trang chủ
 * 
 * @example
 * GET /api/v1/homepage
 * Response:
 * {
 *   "sections": [
 *     {
 *       "id": "flash-sale",
 *       "title": "Flash Sale",
 *       "products": [...],
 *       "hasCountdown": true,
 *       "countdownEnd": "2024-12-25T00:00:00Z"
 *     }
 *   ],
 *   "banners": [...],
 *   "updatedAt": 1701388800000
 * }
 */
const getConfig = async (req, res, next) => {
  try {
    const config = await homepageService.getPublicConfig()
    res.status(StatusCodes.OK).json(config)
  } catch (error) {
    next(error)
  }
}

/**
 * Handler: Cập nhật cấu hình trang chủ (Admin API)
 * 
 * ⚠️ QUAN TRỌNG: API này REPLACE toàn bộ cấu hình, không merge!
 * 
 * Flow:
 * 1. Validate request body (đã validate ở middleware)
 * 2. Extract sections, banners, metadata từ body
 * 3. Gọi homepageService.replaceSections() với user info
 * 4. Service sẽ:
 *    - Preprocess & normalize data
 *    - Validate schemas
 *    - Save vào database
 *    - Track updatedBy info
 * 5. Trả về cấu hình đã lưu
 * 
 * Input validation:
 * - sections: array (required) - validate ở homepageValidation
 * - banners: array (optional) - nếu undefined sẽ giữ nguyên banners cũ
 * - metadata.note: string (optional) - ghi chú thay đổi
 * 
 * Authorization:
 * - Cần đăng nhập (authMiddleware.isAuthorized)
 * - Cần role admin/manager (rbacMiddleware)
 * 
 * @async
 * @function updateSections
 * @param {Express.Request} req - Express request object
 * @param {Object} req.body - Request body
 * @param {Array} req.body.sections - Danh sách sections (required)
 * @param {Array} [req.body.banners] - Danh sách banners (optional)
 * @param {Object} [req.body.metadata] - Metadata
 * @param {string} [req.body.metadata.note] - Ghi chú thay đổi
 * @param {Object} req.jwtDecoded - User info từ JWT token
 * @param {Express.Response} res - Express response object
 * @param {Express.NextFunction} next - Express next middleware
 * @returns {Promise<void>} JSON response với cấu hình đã cập nhật
 * 
 * @example
 * PUT /api/v1/homepage/sections
 * Body:
 * {
 *   "sections": [
 *     {
 *       "id": "flash-sale",
 *       "title": "Flash Sale",
 *       "products": [{"slug": "laptop-dell-xps-13"}],
 *       "hasCountdown": true
 *     }
 *   ],
 *   "banners": [...],
 *   "metadata": {"note": "Cập nhật Black Friday"}
 * }
 */
const updateSections = async (req, res, next) => {
  try {
    const result = await homepageService.replaceSections({
      sections: req.body.sections,
      banners: req.body.banners,
      user: req.jwtDecoded,
      metadata: req.body.metadata
    })
    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

/**
 * Handler: Upload banner image lên Cloudinary (Admin API)
 * 
 * Workflow sử dụng:
 * 1. Admin upload file qua API này
 * 2. Nhận được imageUrl từ response
 * 3. Dùng imageUrl đó trong body khi PUT /sections
 * 
 * Flow xử lý:
 * 1. Check file tồn tại (từ Multer middleware)
 * 2. Upload file buffer lên Cloudinary folder 'banners'
 * 3. Nhận secure_url từ Cloudinary
 * 4. Trả về imageUrl cho client
 * 
 * File constraints:
 * - Đã validate ở multerUploadMiddleware
 * - Format: JPG, PNG, WebP
 * - Max size: cấu hình ở Multer config
 * - Upload vào folder: banners
 * 
 * Authorization:
 * - Cần đăng nhập (authMiddleware.isAuthorized)
 * - Cần role admin/manager (rbacMiddleware)
 * 
 * @async
 * @function uploadBannerImage
 * @param {Express.Request} req - Express request object
 * @param {Object} req.file - File object từ Multer middleware
 * @param {Buffer} req.file.buffer - File buffer
 * @param {string} req.file.originalname - Tên file gốc
 * @param {string} req.file.mimetype - MIME type
 * @param {Express.Response} res - Express response object
 * @param {Express.NextFunction} next - Express next middleware
 * @returns {Promise<void>} JSON response với imageUrl
 * 
 * @example
 * POST /api/v1/homepage/upload-banner
 * Content-Type: multipart/form-data
 * Body: { image: <file> }
 * 
 * Response:
 * {
 *   "imageUrl": "https://res.cloudinary.com/demo/image/upload/v1234567890/banners/abc123.jpg"
 * }
 */
const uploadBannerImage = async (req, res, next) => {
  try {
    // Kiểm tra file có được upload hay không
    // Multer middleware đã xử lý parsing, nhưng có thể user không gửi file
    if (!req.file) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'No image file provided'
      })
    }

    // Upload file buffer lên Cloudinary
    // - req.file.buffer: binary data của file
    // - 'banners': folder name trên Cloudinary
    // - Trả về object chứa secure_url, public_id, etc.
    const uploadResult = await CloudinaryProvider.streamUpload(req.file.buffer, 'banners')

    // Trả về URL của hình ảnh đã upload
    // Client sẽ dùng URL này khi PUT /sections
    res.status(StatusCodes.OK).json({
      imageUrl: uploadResult.secure_url
    })
  } catch (error) {
    // Forward error đến error handling middleware
    // Có thể là lỗi network, Cloudinary quota, file corrupt, etc.
    next(error)
  }
}

export const homepageController = {
  getConfig,
  updateSections,
  uploadBannerImage
}

