/**
 * ORDERMODEL.JS - MODEL QUẢN LÝ ĐƠN HÀNG
 *
 * Collection: orders
 * Quản lý toàn bộ đơn hàng của khách hàng trong hệ thống e-commerce
 *
 * ===========================================
 * BUSINESS LOGIC FLOW:
 * ===========================================
 *
 * 1. TẠO ĐƠN HÀNG (Create Order):
 *    - User checkout từ cart hoặc mua ngay (buy now)
 *    - Kiểm tra tồn kho sản phẩm TRƯỚC khi tạo đơn
 *    - Trừ stock ngay khi tạo đơn (ngăn overselling)
 *    - Tạo đơn với status=PENDING, paymentStatus=UNPAID
 *    - Xóa items đã mua khỏi cart (nếu mua từ cart)
 *    - Tạo payment URL (nếu thanh toán online)
 *
 * 2. TRẠNG THÁI ĐƠN HÀNG (Order Status Flow):
 *    PENDING → CONFIRMED → SHIPPING → DELIVERED
 *       ↓          ↓           ↓
 *    CANCELLED  CANCELLED  CANCELLED
 *
 *    - PENDING: Chờ xác nhận (có thể hủy)
 *    - CONFIRMED: Đã xác nhận (có thể hủy)
 *    - SHIPPING: Đang giao hàng (KHÔNG thể hủy)
 *    - DELIVERED: Đã giao hàng (KHÔNG thể hủy)
 *    - CANCELLED: Đã hủy (hoàn stock)
 *
 * 3. THANH TOÁN (Payment):
 *    - COD: Thanh toán khi nhận hàng (paymentStatus=UNPAID cho đến khi delivered)
 *    - MoMo: Thanh toán online qua ví MoMo (cập nhật paymentStatus qua callback)
 *
 * 4. HỦY ĐƠN HÀNG (Cancel Order):
 *    - Chỉ hủy được khi status=PENDING hoặc CONFIRMED
 *    - Tự động hoàn stock về kho khi hủy
 *    - User chỉ hủy được đơn của mình
 *    - Admin/Manager hủy được mọi đơn
 *
 * 5. AUTO-CANCEL:
 *    - Đơn hàng PENDING quá 24h → tự động hủy (cron job)
 *    - Tự động hoàn stock khi auto-cancel
 *
 * ===========================================
 * SCHEMA FIELDS:
 * ===========================================
 * - userId: ID khách hàng
 * - orderCode: Mã đơn hàng (auto-generate, format: ORD + timestamp + random)
 * - items: Danh sách sản phẩm [{ productId, name, price, quantity, image }]
 * - shippingAddress: { fullName, phone, province, district, ward, street }
 * - paymentMethod: 'cod' | 'momo'
 * - paymentStatus: 'unpaid' | 'paid' | 'refunded'
 * - status: 'pending' | 'confirmed' | 'shipping' | 'delivered' | 'cancelled'
 * - total: Tổng tiền đơn hàng (sum của price × quantity tất cả items)
 * - note: Ghi chú từ khách hàng
 * - paymentTransactionId: Transaction ID từ MoMo (nếu có)
 * - paymentUrl: URL thanh toán MoMo (nếu có)
 * - Timestamps: pendingAt, confirmedAt, shippingAt, deliveredAt, cancelledAt
 */

import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'
import { FIELD_REQUIRED_MESSAGE, OBJECT_ID_RULE } from '~/utils/validators'
import { ORDER_PAGINATION } from '~/utils/constants'

/**
 * ===========================================
 * CONSTANTS - TRẠNG THÁI & PHƯƠNG THỨC
 * ===========================================
 */

/**
 * Trạng thái đơn hàng (Order Status)
 * Quy tắc chuyển đổi:
 * - PENDING → CONFIRMED → SHIPPING → DELIVERED (flow chuẩn)
 * - PENDING/CONFIRMED → CANCELLED (có thể hủy)
 * - SHIPPING/DELIVERED → KHÔNG THỂ HỦY (đã giao hàng)
 */
const ORDER_STATUS = {
  PENDING: 'pending',       // Chờ xác nhận - Có thể hủy
  CONFIRMED: 'confirmed',   // Đã xác nhận - Có thể hủy
  SHIPPING: 'shipping',     // Đang giao hàng - KHÔNG thể hủy
  DELIVERED: 'delivered',   // Đã giao hàng - KHÔNG thể hủy
  CANCELLED: 'cancelled'    // Đã hủy - Hoàn stock
}

/**
 * Phương thức thanh toán (Payment Methods)
 */
const PAYMENT_METHOD = {
  COD: 'cod',    // Cash on Delivery - Thanh toán khi nhận hàng
  MOMO: 'momo'   // MoMo E-Wallet - Thanh toán online qua ví điện tử
}

/**
 * Trạng thái thanh toán (Payment Status)
 */
const PAYMENT_STATUS = {
  UNPAID: 'unpaid',       // Chưa thanh toán (mặc định khi tạo đơn)
  PAID: 'paid',           // Đã thanh toán (sau khi MoMo callback success)
  REFUNDED: 'refunded'    // Đã hoàn tiền (khi hủy đơn đã thanh toán)
}

/**
 * Tên collection trong MongoDB
 */
const ORDER_COLLECTION_NAME = 'orders'

/**
 * ===========================================
 * JOI VALIDATION SCHEMA
 * ===========================================
 * Validate dữ liệu đơn hàng trước khi lưu vào database
 * Đảm bảo tính toàn vẹn dữ liệu
 */
const ORDER_COLLECTION_SCHEMA = Joi.object({
  userId: Joi.string().required().pattern(OBJECT_ID_RULE).messages({
    'any.required': FIELD_REQUIRED_MESSAGE,
    'string.pattern.base': 'User ID must be a valid ObjectId'
  }),

  orderCode: Joi.string().required().messages({
    'any.required': 'Order code is required'
  }),

  items: Joi.array().items(
    Joi.object({
      productId: Joi.string().required().pattern(OBJECT_ID_RULE),
      name: Joi.string().required(),
      price: Joi.number().required().min(0),
      quantity: Joi.number().required().min(1),
      image: Joi.string().allow('')
    })
  ).min(1).required(),

  shippingAddress: Joi.object({
    fullName: Joi.string().required(),
    phone: Joi.string().required(),
    province: Joi.string().required(),
    district: Joi.string().required(),
    ward: Joi.string().required(),
    street: Joi.string().required()
  }).required(),

  paymentMethod: Joi.string().valid(...Object.values(PAYMENT_METHOD)).required(),
  paymentStatus: Joi.string().valid(...Object.values(PAYMENT_STATUS)).default(PAYMENT_STATUS.UNPAID),

  status: Joi.string().valid(...Object.values(ORDER_STATUS)).default(ORDER_STATUS.PENDING),

  total: Joi.number().required().min(0),

  note: Joi.string().allow('').default(''),

  // Payment transaction info (for MoMo, VNPay, etc.)
  paymentTransactionId: Joi.string().allow('').default(''),
  paymentUrl: Joi.string().allow('').default(''),

  // Status timestamps
  pendingAt: Joi.date().timestamp('javascript').allow(null),
  confirmedAt: Joi.date().timestamp('javascript').allow(null),
  shippingAt: Joi.date().timestamp('javascript').allow(null),
  deliveredAt: Joi.date().timestamp('javascript').allow(null),
  cancelledAt: Joi.date().timestamp('javascript').allow(null),

  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null)
})

/**
 * ===========================================
 * VALIDATION FUNCTIONS
 * ===========================================
 */

/**
 * Validate dữ liệu đơn hàng trước khi tạo
 * Kiểm tra:
 * - userId, orderCode, items, shippingAddress hợp lệ
 * - paymentMethod, paymentStatus, status đúng enum
 * - subtotal, total >= 0
 * - Tất cả required fields có đầy đủ
 *
 * @param {Object} data - Dữ liệu đơn hàng cần validate
 * @returns {Promise<Object>} Dữ liệu đã được validate
 * @throws {Error} Nếu dữ liệu không hợp lệ
 */
const validateBeforeCreate = async (data) => {
  return await ORDER_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
}

/**
 * ===========================================
 * HELPER FUNCTIONS
 * ===========================================
 */

/**
 * Tạo mã đơn hàng duy nhất (Order Code Generator)
 *
 * Format: ORD + timestamp(8 chữ số cuối) + random(4 chữ số)
 * - Prefix: ORD (Order)
 * - Timestamp: 8 chữ số cuối của Date.now() (đảm bảo unique theo thời gian)
 * - Random: 4 chữ số ngẫu nhiên (tránh trùng lặp trong cùng millisecond)
 *
 * Ví dụ: ORD123456789012
 *
 * @returns {string} Mã đơn hàng unique
 */
const generateOrderCode = () => {
  const timestamp = Date.now().toString().slice(-8)  // 8 chữ số cuối của timestamp
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')  // Random 0000-9999
  return `ORD${timestamp}${random}`
}

/**
 * ===========================================
 * CRUD OPERATIONS
 * ===========================================
 */

/**
 * Tạo đơn hàng mới (Create Order - Checkout)
 *
 * Flow:
 * 1. Validate dữ liệu đầu vào (userId, items, shippingAddress, paymentMethod, ...)
 * 2. Convert string IDs → ObjectId (userId, productId)
 * 3. Set status mặc định = PENDING, paymentStatus = UNPAID
 * 4. Khởi tạo timestamps:
 *    - pendingAt = hiện tại (vừa tạo đơn)
 *    - confirmedAt, shippingAt, deliveredAt, cancelledAt = null
 * 5. Insert vào database
 *
 * Lưu ý:
 * - Function này CHỈ tạo đơn trong DB
 * - Logic trừ stock, xóa cart phải xử lý ở SERVICE LAYER
 * - Không tự động confirm đơn, phải đợi admin xác nhận
 *
 * @param {Object} data - Dữ liệu đơn hàng
 * @param {string} data.userId - ID khách hàng
 * @param {string} data.orderCode - Mã đơn hàng (từ generateOrderCode)
 * @param {Array} data.items - Danh sách sản phẩm [{ productId, name, price, quantity, image }]
 * @param {Object} data.shippingAddress - Địa chỉ giao hàng
 * @param {string} data.paymentMethod - Phương thức thanh toán ('cod' | 'momo')
 * @param {number} data.total - Tổng tiền đơn hàng
 * @param {string} [data.note] - Ghi chú (optional)
 * @param {string} [data.paymentTransactionId] - Transaction ID từ payment gateway (optional)
 * @param {string} [data.paymentUrl] - Payment URL (optional)
 *
 * @returns {Promise<Object>} Insert result với insertedId
 * @throws {Error} Nếu validation thất bại hoặc lỗi database
 */
const createOrder = async (data) => {
  try {
    // Bước 1: Validate dữ liệu đầu vào
    const validData = await validateBeforeCreate(data)

    // Bước 2: Chuẩn bị dữ liệu để insert
    const orderToCreate = {
      ...validData,
      // Convert userId từ string → ObjectId
      userId: new ObjectId(validData.userId),

      // Convert productId trong items từ string → ObjectId
      items: validData.items.map(item => ({
        ...item,
        productId: new ObjectId(item.productId)
      })),

      // Timestamps
      createdAt: Date.now(),
      updatedAt: null,

      // Set pendingAt = hiện tại (đơn hàng vừa được tạo)
      pendingAt: Date.now(),

      // Các timestamps khác khởi tạo = null
      confirmedAt: null,
      shippingAt: null,
      deliveredAt: null,
      cancelledAt: null
    }

    // Bước 3: Insert vào database
    const result = await GET_DB().collection(ORDER_COLLECTION_NAME).insertOne(orderToCreate)
    return result
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * Tìm đơn hàng theo ID
 *
 * Sử dụng khi:
 * - Xem chi tiết đơn hàng
 * - Cập nhật đơn hàng
 * - Hủy đơn hàng
 * - Kiểm tra quyền sở hữu đơn hàng
 *
 * @param {string} orderId - ID đơn hàng (MongoDB ObjectId string)
 * @returns {Promise<Object|null>} Document đơn hàng hoặc null nếu không tìm thấy
 * @throws {Error} Nếu orderId không hợp lệ hoặc lỗi database
 */
const findOneById = async (orderId) => {
  try {
    const result = await GET_DB().collection(ORDER_COLLECTION_NAME).findOne({
      _id: new ObjectId(orderId)
    })
    return result
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * Lấy danh sách đơn hàng của user với pagination
 *
 * Tính năng:
 * - Phân trang (page, limit)
 * - Filter theo status (optional)
 * - Sắp xếp theo createdAt giảm dần (đơn mới nhất lên đầu)
 * - Parallel query (orders + count) để tối ưu performance
 *
 * @param {string} userId - ID user cần lấy đơn hàng
 * @param {Object} [options={}] - Tùy chọn query
 * @param {number} [options.page] - Số trang (mặc định từ ORDER_PAGINATION)
 * @param {number} [options.limit] - Số items per page (mặc định từ ORDER_PAGINATION)
 * @param {string} [options.status] - Filter theo status ('pending' | 'confirmed' | ...)
 *
 * @returns {Promise<Object>} Object chứa orders và pagination info
 * @returns {Array} returns.orders - Danh sách đơn hàng
 * @returns {Object} returns.pagination - Thông tin phân trang { page, limit, total, totalPages }
 *
 * @throws {Error} Nếu userId không hợp lệ hoặc lỗi database
 */
const findByUserId = async (userId, options = {}) => {
  try {
    const {
      page = ORDER_PAGINATION.DEFAULT_PAGE,
      limit = ORDER_PAGINATION.DEFAULT_LIMIT,
      status
    } = options

    // Build query: filter by userId và status (nếu có)
    const query = { userId: new ObjectId(userId) }
    if (status) {
      query.status = status
    }

    // Tính skip cho pagination
    const skip = (page - 1) * limit

    // Parallel query để tối ưu performance
    // Query 1: Lấy danh sách orders với pagination
    // Query 2: Đếm tổng số orders (để tính totalPages)
    const [orders, total] = await Promise.all([
      GET_DB().collection(ORDER_COLLECTION_NAME)
        .find(query)
        .sort({ createdAt: -1 })  // Sắp xếp đơn mới nhất lên đầu
        .skip(skip)
        .limit(limit)
        .toArray(),
      GET_DB().collection(ORDER_COLLECTION_NAME).countDocuments(query)
    ])

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * Lấy tất cả đơn hàng (Admin/Manager)
 *
 * Tương tự findByUserId nhưng KHÔNG filter theo userId
 * Admin/Manager có thể xem tất cả đơn hàng trong hệ thống
 *
 * Tính năng:
 * - Phân trang (page, limit)
 * - Filter theo status (optional)
 * - Sắp xếp theo createdAt giảm dần
 * - Parallel query để tối ưu performance
 *
 * @param {Object} [options={}] - Tùy chọn query
 * @param {number} [options.page] - Số trang
 * @param {number} [options.limit] - Số items per page
 * @param {string} [options.status] - Filter theo status
 *
 * @returns {Promise<Object>} Object chứa orders và pagination info
 * @throws {Error} Nếu lỗi database
 */
const getAllOrders = async (options = {}) => {
  try {
    const {
      page = ORDER_PAGINATION.DEFAULT_PAGE,
      limit = ORDER_PAGINATION.DEFAULT_LIMIT,
      status
    } = options

    const query = {}
    if (status) {
      query.status = status
    }

    const skip = (page - 1) * limit

    const [orders, total] = await Promise.all([
      GET_DB().collection(ORDER_COLLECTION_NAME)
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      GET_DB().collection(ORDER_COLLECTION_NAME).countDocuments(query)
    ])

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * Cập nhật đơn hàng (Admin/Manager)
 *
 * Tự động xử lý timestamp khi cập nhật status:
 * - status=PENDING → set pendingAt
 * - status=CONFIRMED → set confirmedAt
 * - status=SHIPPING → set shippingAt
 * - status=DELIVERED → set deliveredAt
 * - status=CANCELLED → set cancelledAt
 *
 * Có thể cập nhật:
 * - status: Trạng thái đơn hàng
 * - paymentStatus: Trạng thái thanh toán
 * - Bất kỳ field nào khác (flexible)
 *
 * Lưu ý:
 * - Function này KHÔNG validate business rules (ví dụ: không cho hủy đơn đã shipping)
 * - Business validation phải làm ở SERVICE LAYER
 * - Function này chỉ cập nhật data vào DB
 *
 * @param {string} orderId - ID đơn hàng cần cập nhật
 * @param {Object} updateData - Dữ liệu cần cập nhật
 * @param {string} [updateData.status] - Trạng thái mới
 * @param {string} [updateData.paymentStatus] - Trạng thái thanh toán mới
 *
 * @returns {Promise<Object>} Document đơn hàng sau khi cập nhật
 * @throws {Error} Nếu orderId không tồn tại hoặc lỗi database
 */
const updateOrder = async (orderId, updateData) => {
  try {
    const now = Date.now()
    const statusTimestamp = {}

    // Tự động set timestamp tương ứng khi cập nhật status
    if (updateData.status) {
      switch (updateData.status) {
      case ORDER_STATUS.PENDING:
        statusTimestamp.pendingAt = now
        break
      case ORDER_STATUS.CONFIRMED:
        statusTimestamp.confirmedAt = now
        break
      case ORDER_STATUS.SHIPPING:
        statusTimestamp.shippingAt = now
        break
      case ORDER_STATUS.DELIVERED:
        statusTimestamp.deliveredAt = now
        break
      case ORDER_STATUS.CANCELLED:
        statusTimestamp.cancelledAt = now
        break
      default:
        break
      }
    }

    // Cập nhật đơn hàng với findOneAndUpdate
    // returnDocument: 'after' → trả về document SAU KHI cập nhật
    const result = await GET_DB().collection(ORDER_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(orderId) },
      {
        $set: {
          ...updateData,
          ...statusTimestamp,
          updatedAt: now
        }
      },
      { returnDocument: 'after' }
    )

    return result
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * Cập nhật trạng thái đơn hàng (Update Status)
 *
 * Helper function chuyên biệt để cập nhật status
 * Wrapper của updateOrder() với focus vào status
 *
 * Tự động set timestamp:
 * - PENDING → pendingAt
 * - CONFIRMED → confirmedAt
 * - SHIPPING → shippingAt
 * - DELIVERED → deliveredAt
 * - CANCELLED → cancelledAt
 *
 * @param {string} orderId - ID đơn hàng
 * @param {string} status - Trạng thái mới ('pending' | 'confirmed' | 'shipping' | 'delivered' | 'cancelled')
 * @param {Object} [updateData={}] - Dữ liệu bổ sung cần cập nhật (optional)
 *
 * @returns {Promise<Object>} Document đơn hàng sau khi cập nhật
 * @throws {Error} Nếu lỗi database
 */
const updateStatus = async (orderId, status, updateData = {}) => {
  try {
    const now = Date.now()
    const statusTimestamp = {}

    // Đặt timestamp cho trạng thái mới
    switch (status) {
    case ORDER_STATUS.PENDING:
      statusTimestamp.pendingAt = now
      break
    case ORDER_STATUS.CONFIRMED:
      statusTimestamp.confirmedAt = now
      break
    case ORDER_STATUS.SHIPPING:
      statusTimestamp.shippingAt = now
      break
    case ORDER_STATUS.DELIVERED:
      statusTimestamp.deliveredAt = now
      break
    case ORDER_STATUS.CANCELLED:
      statusTimestamp.cancelledAt = now
      break
    default:
      break
    }

    const result = await GET_DB().collection(ORDER_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(orderId) },
      {
        $set: {
          status,
          ...updateData,
          ...statusTimestamp,
          updatedAt: now
        }
      },
      { returnDocument: 'after' }
    )

    return result
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * Cập nhật trạng thái thanh toán (Update Payment Status)
 *
 * Sử dụng khi:
 * - MoMo callback trả về kết quả thanh toán → set PAID
 * - Xác nhận thanh toán COD khi giao hàng → set PAID
 * - Hoàn tiền khi hủy đơn đã thanh toán → set REFUNDED
 *
 * @param {string} orderId - ID đơn hàng
 * @param {string} paymentStatus - Trạng thái thanh toán mới ('unpaid' | 'paid' | 'refunded')
 *
 * @returns {Promise<Object>} Document đơn hàng sau khi cập nhật
 * @throws {Error} Nếu lỗi database
 */
const updatePaymentStatus = async (orderId, paymentStatus) => {
  try {
    const result = await GET_DB().collection(ORDER_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(orderId) },
      {
        $set: {
          paymentStatus,
          updatedAt: Date.now()
        }
      },
      { returnDocument: 'after' }
    )

    return result
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * Hủy đơn hàng (Cancel Order)
 *
 * Quy trình:
 * 1. Set status = CANCELLED
 * 2. Set cancelledAt = timestamp hiện tại
 * 3. Update updatedAt
 *
 * Lưu ý:
 * - Function này CHỈ cập nhật status trong DB
 * - KHÔNG tự động hoàn stock (phải làm ở SERVICE LAYER)
 * - KHÔNG validate business rules (ví dụ: chỉ hủy được PENDING/CONFIRMED)
 * - Business validation phải làm ở service layer
 *
 * @param {string} orderId - ID đơn hàng cần hủy
 *
 * @returns {Promise<Object>} Document đơn hàng sau khi hủy
 * @throws {Error} Nếu orderId không tồn tại hoặc lỗi database
 */
const cancelOrder = async (orderId) => {
  try {
    const now = Date.now()

    const result = await GET_DB().collection(ORDER_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(orderId) },
      {
        $set: {
          status: ORDER_STATUS.CANCELLED,
          cancelledAt: now,
          updatedAt: now
        }
      },
      { returnDocument: 'after' }  // Trả về document SAU KHI update
    )

    return result
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * ===========================================
 * EXPORTS
 * ===========================================
 * Export tất cả constants và functions để sử dụng ở các layer khác
 */
export const orderModel = {
  // Constants
  ORDER_COLLECTION_NAME,
  ORDER_STATUS,
  PAYMENT_METHOD,
  PAYMENT_STATUS,

  // Helper functions
  generateOrderCode,

  // CRUD operations
  createOrder,
  findOneById,
  findByUserId,
  getAllOrders,
  updateOrder,
  updateStatus,
  updatePaymentStatus,
  cancelOrder
}
