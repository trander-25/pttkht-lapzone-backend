import multer from 'multer'
import { LIMIT_COMMON_FILE_SIZE, ALLOW_COMMON_FILE_TYPES } from '~/utils/validators'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'

/**
 * Middleware upload file sử dụng multer
 * Docs: https://www.npmjs.com/package/multer
 * 
 * Cấu hình:
 * - Giới hạn dung lượng file: LIMIT_COMMON_FILE_SIZE (từ validators.js)
 * - Các loại file được phép: ALLOW_COMMON_FILE_TYPES (image/jpeg, image/jpg, image/png)
 * - Sử dụng memory storage (file được lưu trong RAM dưới dạng Buffer)
 * - Sau đó upload lên Cloudinary thông qua stream (không lưu file vào disk)
 * 
 * Quy trình upload:
 * 1. Multer nhận file từ FormData
 * 2. Kiểm tra mimetype có hợp lệ không (customFileFilter)
 * 3. Kiểm tra dung lượng có vượt giới hạn không
 * 4. Lưu file vào req.file hoặc req.files (dạng Buffer)
 * 5. Controller xử lý upload Buffer lên Cloudinary
 */

/**
 * Hàm kiểm tra loại file được chấp nhận
 * @param {Object} req - Express request
 * @param {Object} file - File object từ multer (chứa mimetype, originalname, size...)
 * @param {Function} callback - Callback để tiếp tục hoặc reject file
 */
const customFileFilter = (req, file, callback) => {
  // Multer kiểm tra file type qua mimetype (không dựa vào extension để tránh giả mạo)
  if (!ALLOW_COMMON_FILE_TYPES.includes(file.mimetype)) {
    const errMessage = 'File type is invalid. Only accept jpg, jpeg and png'
    return callback(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, errMessage), null)
  }
  // File hợp lệ → cho phép upload
  return callback(null, true)
}

/**
 * Khởi tạo multer instance với cấu hình:
 * - limits.fileSize: Giới hạn dung lượng tối đa (thường 10MB)
 * - fileFilter: Function kiểm tra loại file
 * - storage: Mặc định MemoryStorage (lưu vào RAM, không tạo file tạm)
 * 
 * Cách sử dụng trong route:
 * - Single file: upload.single('fieldName')
 * - Multiple files: upload.array('fieldName', maxCount)
 * - Mixed fields: upload.fields([{ name: 'avatar' }, { name: 'photos' }])
 * 
 * Ví dụ:
 * router.post('/upload', upload.single('avatar'), userController.updateAvatar)
 */
const upload = multer({
  limits: { fileSize: LIMIT_COMMON_FILE_SIZE },
  fileFilter: customFileFilter
})
export const multerUploadMiddleware = { upload }