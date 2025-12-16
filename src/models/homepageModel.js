/**
 * HOMEPAGEMODEL.JS - MODEL QUẢN LÝ CẤU HÌNH TRANG CHỦ
 *
 * Collection: homepageSettings
 * Chỉ có 1 document duy nhất trong collection này
 *
 * Chức năng:
 * - Lưu cấu hình các sections hiển thị trên trang chủ
 * - Lưu banners carousel
 * - Admin có thể customize layout trang chủ thông qua API
 *
 * Schema:
 * - sections: array các section (VD: featured products, new arrivals, flash sale, etc.)
 *   + id: string - ID unique của section
 *   + title: string - Tiêu đề section
 *   + subtitle: string - Phụ đề section
 *   + subtitleBackgroundColor: string - Màu nền subtitle (hex/rgb)
 *   + subtitleTextColor: string - Màu chữ subtitle
 *   + tag: string - Tag hiển thị (HOT, NEW, etc.)
 *   + visible: boolean - Hiển thị section hay không (default: true)
 *   + order: number - Thứ tự hiển thị (auto reset 1, 2, 3...)
 *   + backgroundColor: string - Màu nền section
 *   + textColor: string - Màu chữ section
 *   + filterLinks: array strings - Links filter/navigation
 *   + products: array - Danh sách sản phẩm (chỉ lưu slug)
 *     * slug: string - Product slug (full data fetch khi GET)
 *   + hasCountdown: boolean - Có countdown timer không (cho flash sale)
 *   + countdownStart: date - Thời gian bắt đầu countdown
 *   + countdownEnd: date - Thời gian kết thúc countdown
 * 
 * - banners: array banner images cho carousel
 *   + id: string - ID unique của banner
 *   + image: string (URL) - URL hình ảnh banner (required)
 *   + title: string - Tiêu đề banner
 *   + link: string - Link đích khi click banner
 *   + order: number - Thứ tự hiển thị (auto reset 1, 2, 3...)
 *   + visible: boolean - Hiển thị banner hay không (default: true)
 * 
 * - updatedAt: number (timestamp) - Timestamp cập nhật cuối
 * - updatedBy: object - Thông tin người cập nhật
 *   + userId: string - ID của admin/manager
 *   + name: string - Tên người cập nhật
 *   + role: string - Role (admin/manager)
 *   + note: string - Ghi chú về thay đổi này
 * - lastUpdateNote: string - Ghi chú thay đổi cuối cùng
 *
 * Data Strategy:
 * - Products: chỉ lưu slug, full data fetch real-time khi GET (luôn fresh)
 * - Banners: lưu URL (đã upload lên Cloudinary)
 * - Sections: replace toàn bộ khi update (không merge)
 */

import { GET_DB } from '~/config/mongodb'

const HOMEPAGE_COLLECTION_NAME = 'homepageSettings'

const getCollection = () => GET_DB().collection(HOMEPAGE_COLLECTION_NAME)

/**
 * Tìm config trang chủ mặc định
 * 
 * Collection chỉ có 1 document duy nhất chứa toàn bộ cấu hình
 * Không cần query điều kiện vì chỉ có 1 record
 * 
 * @async
 * @function findDefaultConfig
 * @returns {Promise<Object|null>} Homepage config document hoặc null nếu chưa tồn tại
 * 
 * @example
 * const config = await homepageModel.findDefaultConfig()
 * // Returns: { _id, sections: [...], banners: [...], updatedAt, updatedBy, lastUpdateNote }
 * // or null if not exists yet
 */
const findDefaultConfig = async () => {
  // Since there's only one homepage config, find the first document
  // Empty query {} sẽ match document đầu tiên (và duy nhất)
  return await getCollection().findOne({})
}

/**
 * Tạo config trang chủ mặc định (rỗng)
 * 
 * Chỉ gọi khi chưa có config nào tồn tại
 * Tạo document với sections và banners rỗng
 * 
 * @async
 * @function createDefaultConfig
 * @returns {Promise<Object>} Created config document với _id
 * 
 * @example
 * const config = await homepageModel.createDefaultConfig()
 * // Returns: { _id: ObjectId(...), sections: [], banners: [], updatedAt: 1701388800000, ... }
 */
const createDefaultConfig = async () => {
  const now = Date.now()
  // Document cấu trúc mặc định
  const doc = {
    sections: [],
    banners: [],
    updatedAt: now,
    updatedBy: null,
    lastUpdateNote: ''
  }
  const result = await getCollection().insertOne(doc)
  // Trả về document kèm _id vừa insert
  return { ...doc, _id: result.insertedId }
}

/**
 * Tìm hoặc tạo config trang chủ
 * 
 * Helper function đảm bảo luôn có config tồn tại
 * - Nếu đã có → trả về config hiện tại
 * - Nếu chưa có → tạo mới và trả về
 * 
 * @async
 * @function findOrCreateDefaultConfig
 * @returns {Promise<Object>} Homepage config document (luôn trả về, không bao giờ null)
 * 
 * @example
 * const config = await homepageModel.findOrCreateDefaultConfig()
 * // Always returns a config, creates one if not exists
 */
const findOrCreateDefaultConfig = async () => {
  const existing = await findDefaultConfig()
  if (existing) return existing
  // Tạo mới nếu chưa có
  return await createDefaultConfig()
}

/**
 * Lưu sections và banners cho trang chủ (Admin)
 * 
 * Upsert operation:
 * - Tạo mới nếu chưa có config nào
 * - Update nếu đã tồn tại
 * 
 * Banners handling:
 * - Nếu banners = undefined → giữ nguyên banners cũ (chỉ update sections)
 * - Nếu banners = [] → xóa hết banners
 * - Nếu banners = [...] → replace toàn bộ
 * 
 * @async
 * @function saveSections
 * @param {Object} params - Parameters object
 * @param {Array} params.sections - Danh sách sections (required)
 * @param {Array} [params.banners] - Danh sách banners (optional, undefined = keep old)
 * @param {Object} [params.updatedBy] - Thông tin người update
 * @param {string} [params.lastUpdateNote] - Ghi chú thay đổi
 * @returns {Promise<Object>} Updated config document
 * 
 * @throws {Error} Database operation errors
 * 
 * @example
 * const result = await homepageModel.saveSections({
 *   sections: [...],
 *   banners: [...],
 *   updatedBy: { userId: "123", name: "Admin", role: "admin" },
 *   lastUpdateNote: "Update Black Friday campaign"
 * })
 */
const saveSections = async ({ sections, banners, updatedBy, lastUpdateNote }) => {
  const collection = getCollection()
  const now = Date.now()

  // Build update data object
  // Luôn update sections, updatedAt, updatedBy, lastUpdateNote
  const updateData = {
    sections,
    updatedAt: now,
    updatedBy: updatedBy || null,
    lastUpdateNote: lastUpdateNote || ''
  }

  // Only update banners if provided
  // Nếu banners = undefined → không update field này (giữ nguyên)
  // Nếu banners = [] hoặc [...] → update field này
  if (banners !== undefined) {
    updateData.banners = banners
  }

  // Upsert: update nếu tồn tại, insert nếu chưa có
  const result = await collection.findOneAndUpdate(
    {}, // Empty filter → match document đầu tiên (và duy nhất)
    {
      $set: updateData
    },
    {
      upsert: true, // Tạo mới nếu không tìm thấy
      returnDocument: 'after' // Trả về document sau khi update
    }
  )

  // Trả về document đã update
  if (result?.value) return result.value

  // Fallback (should rarely happen)
  // Trường hợp findOneAndUpdate không trả về value (rất hiếm)
  const doc = {
    sections,
    banners: banners || [],
    updatedAt: now,
    updatedBy: updatedBy || null,
    lastUpdateNote: lastUpdateNote || ''
  }
  const insertResult = await collection.insertOne(doc)
  return { ...doc, _id: insertResult.insertedId }
}

export const homepageModel = {
  findDefaultConfig,
  findOrCreateDefaultConfig,
  saveSections
}

