import cloudinary from 'cloudinary'
import streamifier from 'streamifier'
import { env } from '~/config/environment'

/*
Tham khảo tài liệu:
https://cloudinary.com/blog/node_js_file_upload_to_a_local_server_or_to_the_cloud
*/

/**
 * Cấu hình Cloudinary v2 với thông tin xác thực từ biến môi trường
 * Cloudinary là dịch vụ lưu trữ và quản lý hình ảnh/video trên cloud
 */
const cloudinaryV2 = cloudinary.v2
cloudinaryV2.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET
})

/**
 * Upload file lên Cloudinary bằng phương pháp stream
 * Phương pháp này hiệu quả hơn cho các file lớn vì không cần lưu tạm vào đĩa
 * @param {Buffer} fileBuffer - Dữ liệu file dạng buffer từ Multer
 * @param {string} folderName - Tên thư mục trên Cloudinary để lưu file (vd: 'products', 'avatars')
 * @returns {Promise<object>} Thông tin file đã upload (bao gồm secure_url)
 */
const streamUpload = (fileBuffer, folderName) => {
  return new Promise((resolve, reject) => {
    // Tạo upload stream với cấu hình thư mục đích
    const stream = cloudinaryV2.uploader.upload_stream({ folder: folderName }, (err, result) => {
      if (err) reject(err)
      else resolve(result)
    })

    // Thực hiện upload bằng cách pipe file buffer qua streamifier
    streamifier.createReadStream(fileBuffer).pipe(stream)
  })
}

/**
 * Xóa file trên Cloudinary bằng public_id
 * @param {string} publicId - Public ID của file cần xóa (extract từ URL)
 * @returns {Promise<object>} Kết quả xóa file
 */
const deleteImage = (publicId) => {
  return new Promise((resolve, reject) => {
    cloudinaryV2.uploader.destroy(publicId, (err, result) => {
      if (err) reject(err)
      else resolve(result)
    })
  })
}

/**
 * Trích xuất public_id từ Cloudinary URL
 * VD: https://res.cloudinary.com/demo/image/upload/v1234567890/products/abc123.jpg
 * => products/abc123
 * @param {string} imageUrl - URL đầy đủ của ảnh trên Cloudinary
 * @returns {string|null} Public ID hoặc null nếu không phải URL Cloudinary
 */
const extractPublicId = (imageUrl) => {
  if (!imageUrl || !imageUrl.includes('cloudinary.com')) {
    return null
  }
  
  try {
    // URL format: https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/{folder}/{public_id}.{ext}
    const parts = imageUrl.split('/upload/')
    if (parts.length < 2) return null
    
    // Lấy phần sau /upload/
    const pathParts = parts[1].split('/')
    // Bỏ version (vXXXXXXXXXX)
    const withoutVersion = pathParts.slice(1)
    // Join lại và bỏ extension
    const publicIdWithExt = withoutVersion.join('/')
    const publicId = publicIdWithExt.substring(0, publicIdWithExt.lastIndexOf('.'))
    
    return publicId
  } catch (error) {
    return null
  }
}

export const CloudinaryProvider = { streamUpload, deleteImage, extractPublicId }
