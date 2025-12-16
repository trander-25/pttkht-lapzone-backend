import { pick } from 'lodash'

/**
 * Chuyển đổi chuỗi thành slug SEO-friendly
 * @param {string} val - Chuỗi cần chuyển (ví dụ: "Laptop Dell XPS 15")
 * @returns {string} - Slug (ví dụ: "laptop-dell-xps-15")
 *
 * Quy trình:
 * 1. Normalize NFKD: Tách dấu tiếng Việt thành ký tự riêng biệt
 * 2. Xóa dấu: Loại bỏ tất cả dấu (\u0300-\u036f)
 * 3. Trim, lowercase, xóa ký tự đặc biệt
 * 4. Thay khoảng trắng bằng gạch ngang
 * 5. Xóa gạch ngang liên tiếp
 *
 * Ví dụ:
 * "Laptop Gaming Asus ROG" -> "laptop-gaming-asus-rog"
 * "Máy tính Dell" -> "may-tinh-dell"
 */
export const slugify = (val) => {
  if (!val) return ''
  return String(val)
    .normalize('NFKD') // split accented characters into their base characters and diacritical marks
    .replace(/[\u0300-\u036f]/g, '') // remove all the accents, which happen to be all in the \u03xx UNICODE block.
    .trim() // trim leading or trailing whitespace
    .toLowerCase() // convert to lowercase
    .replace(/[^a-z0-9 -]/g, '') // remove non-alphanumeric characters
    .replace(/\s+/g, '-') // replace spaces with hyphens
    .replace(/-+/g, '-') // remove consecutive hyphens
}

/**
 * Trích xuất các field an toàn của user để trả về frontend
 * @param {Object} user - User object từ database
 * @returns {Object} - User object đã lọc bỏ sensitive fields
 *
 * Mục đích:
 * - Tránh lộ thông tin nhạy cảm (password hash, verifyToken, resetPasswordToken...)
 * - Chỉ trả về fields cần thiết cho frontend
 *
 * Fields được giữ lại:
 * _id, email, username, phone, sex, addresses, avatar, role, provider, isActive, createdAt, updatedAt
 */
export const pickUser = (user) => {
  if (!user) return {}
  return pick(user, ['_id', 'email', 'username', 'phone', 'sex', 'addresses', 'avatar', 'role', 'provider', 'isActive', 'createdAt', 'updatedAt'])
}