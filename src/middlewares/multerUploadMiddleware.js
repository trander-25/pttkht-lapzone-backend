import multer from 'multer'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'

// File upload limits and allowed types
const LIMIT_COMMON_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOW_COMMON_FILE_TYPES = ['image/jpeg', 'image/jpg', 'image/png']

const customFileFilter = (req, file, callback) => {
  if (!ALLOW_COMMON_FILE_TYPES.includes(file.mimetype)) {
    const errMessage = 'File type is invalid. Only accept jpg, jpeg and png'
    return callback(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, errMessage), null)
  }
  return callback(null, true)
}

/**
 * Multer upload middleware
 * - Memory storage (lưu vào RAM)
 * - Giới hạn: LIMIT_COMMON_FILE_SIZE
 * - File types: jpg, jpeg, png
 * 
 * Ví dụ:
 * router.post('/upload', upload.single('avatar'), userController.updateAvatar)
 */
const upload = multer({
  limits: { fileSize: LIMIT_COMMON_FILE_SIZE },
  fileFilter: customFileFilter
})
export const multerUploadMiddleware = { upload }
