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

export const CloudinaryProvider = { streamUpload }