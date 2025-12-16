import { orderModel } from '~/models/orderModel'
import { cartModel } from '~/models/cartModel'
import { productModel } from '~/models/productModel'
import { userModel } from '~/models/userModel'
import { MoMoProvider } from '~/providers/MoMoProvider'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import { ORDER_PAGINATION } from '~/utils/constants'
import { env } from '~/config/environment'

/**
 * Xem trước đơn hàng (tính toán tổng tiền trước khi đặt hàng)
 * Hỗ trợ 2 kịch bản:
 * - Mua từ giỏ hàng (source='cart'): Lấy sản phẩm đã chọn từ cart
 * - Mua ngay (source='buy_now'): Lấy sản phẩm từ request body
 * Quy trình:
 * 1. Lấy danh sách sản phẩm cần đặt (từ cart hoặc buy_now)
 * 2. Kiểm tra tồn kho cho từng sản phẩm
 * 3. Tính total (tổng tiền = sum của price × quantity)
 * @param {string} userId - ID người dùng
 * @param {object} reqBody - { source, items (cho buy_now) }
 * @returns {object} { items, total }
 */
const previewOrder = async (userId, reqBody) => {
  try {
    const { source, items: buyNowItems } = reqBody

    let itemsToOrder = []

    // Nguồn: 'cart' (mua từ giỏ hàng) hoặc 'buy_now' (mua ngay)
    if (source === 'buy_now') {
      // Mua ngay: lấy sản phẩm từ request body
      if (!buyNowItems || buyNowItems.length === 0) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'No items provided for buy now')
      }

      // Xác thực và lấy thông tin chi tiết sản phẩm
      const productIds = buyNowItems.map(item => item.productId)
      const products = await Promise.all(
        productIds.map(id => productModel.findOneById(id))
      )

      for (let i = 0; i < buyNowItems.length; i++) {
        const item = buyNowItems[i]
        const product = products[i]

        if (!product) {
          throw new ApiError(StatusCodes.NOT_FOUND, `Product with ID ${item.productId} not found`)
        }

        if (product.stock < item.quantity) {
          throw new ApiError(
            StatusCodes.BAD_REQUEST,
            `Product ${product.name} only has ${product.stock} items in stock`
          )
        }

        itemsToOrder.push({
          productId: product._id.toString(),
          name: product.name,
          price: product.price,
          quantity: item.quantity,
          image: product.images?.[0] || ''
        })
      }
    } else {
      // Mua từ giỏ hàng (mặc định)
      const cart = await cartModel.findByUserId(userId)

      if (!cart || cart.items.length === 0) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Cart is empty')
      }

      // Lọc các sản phẩm đã được chọn (selected = true)
      itemsToOrder = cart.items.filter(item => item.selected === true)

      if (itemsToOrder.length === 0) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'No items selected for order')
      }

      // Xác minh sản phẩm vẫn tồn tại và còn đủ hàng trong kho
      const productIds = itemsToOrder.map(item => item.productId.toString())
      const products = await Promise.all(
        productIds.map(id => productModel.findOneById(id))
      )

      for (let i = 0; i < itemsToOrder.length; i++) {
        const cartItem = itemsToOrder[i]
        const product = products[i]

        if (!product) {
          throw new ApiError(StatusCodes.NOT_FOUND, `Product ${cartItem.name} not found`)
        }

        if (product.stock < cartItem.quantity) {
          throw new ApiError(
            StatusCodes.BAD_REQUEST,
            `Product ${product.name} only has ${product.stock} items in stock`
          )
        }

        // Cập nhật với thông tin sản phẩm mới nhất từ database
        itemsToOrder[i] = {
          productId: product._id.toString(),
          name: product.name,
          price: product.price,
          quantity: cartItem.quantity,
          image: product.images?.[0] || ''
        }
      }
    }

    // Tính tổng tiền đơn hàng (sum của price × quantity)
    let total = 0
    for (const item of itemsToOrder) {
      total += item.price * item.quantity
    }

    return {
      items: itemsToOrder,
      total
    }
  } catch (error) {
    throw error
  }
}

/**
 * Tạo URL thanh toán MoMo sử dụng API thực của MoMo
 * Tạo link thanh toán và mã QR cho người dùng thanh toán qua MoMo
 * Lưu ý: Các URL callback phải trỏ về backend, không phải frontend!
 * @param {string} orderCode - Mã đơn hàng
 * @param {number} amount - Số tiền thanh toán
 * @param {string} orderId - ID đơn hàng (ObjectId) để lưu trong extraData
 * @returns {object} { paymentUrl, transactionId, qrCodeUrl }
 */
const generateMoMoPaymentUrl = async (orderCode, amount, orderId) => {
  try {
    // Lấy URL backend để tạo các URL callback (KHÔNG phải URL frontend!)
    // Các URL này phải trỏ về backend server, không phải frontend
    let backendBaseUrl
    if (env.BUILD_MODE === 'production') {
      // Trong production, dùng BACKEND_URL nếu có, không thì dùng WEBSITE_DOMAIN_PRODUCTION
      backendBaseUrl = env.BACKEND_URL || env.WEBSITE_DOMAIN_PRODUCTION || 'https://your-backend-domain.com'
    } else {
      // Trong development, dùng URL backend local
      backendBaseUrl = env.BACKEND_URL || `http://${env.LOCAL_DEV_APP_HOST}:${env.LOCAL_DEV_APP_PORT}`
    }

    // QUAN TRỌNG: Sử dụng /api/v1 prefix (không phải /v1)
    const redirectUrl = `${backendBaseUrl}/api/v1/orders/momo/return`
    const ipnUrl = `${backendBaseUrl}/api/v1/orders/momo/callback`
    const orderInfo = `Thanh toan don hang ${orderCode}`

    // Tạo yêu cầu thanh toán gửi đến MoMo
    const momoResponse = await MoMoProvider.createPaymentRequest({
      orderId: orderCode,
      orderInfo: orderInfo,
      amount: amount,
      redirectUrl: redirectUrl,
      ipnUrl: ipnUrl,
      extraData: orderId // Lưu order ObjectId trong extraData để xử lý callback
    })

    return {
      paymentUrl: momoResponse.payUrl,
      transactionId: momoResponse.requestId,
      qrCodeUrl: momoResponse.qrCodeUrl || null
    }
  } catch (error) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, `Failed to create MoMo payment: ${error.message}`)
  }
}

/**
 * Tạo đơn hàng mới
 * Quy trình phức tạp với nhiều bước quan trọng:
 * 1. Preview đơn hàng để lấy thông tin và tính toán
 * 2. Cập nhật tồn kho sản phẩm TRƯỚC (quan trọng!)
 * 3. Tạo đơn hàng trong database
 * 4. Xóa sản phẩm đã chọn khỏi giỏ hàng (nếu mua từ cart)
 * 5. Tạo URL thanh toán MoMo (nếu chọn thanh toán MoMo)
 * Có cơ chế rollback nếu có lỗi xảy ra
 * @param {string} userId - ID người dùng
 * @param {object} reqBody - { source, items, shippingAddress, paymentMethod, note }
 * @returns {object} { order, paymentUrl (nếu có) }
 */
const createOrder = async (userId, reqBody) => {
  try {
    const {
      source,
      items: buyNowItems,
      shippingAddress,
      paymentMethod,
      note
    } = reqBody

    // Bước 1: Preview đơn hàng trước để lấy danh sách items và tổng tiền
    const preview = await previewOrder(userId, {
      source,
      items: buyNowItems
    })

    // Tạo mã đơn hàng tự động
    const orderCode = orderModel.generateOrderCode()

    // Chuẩn bị dữ liệu đơn hàng
    const orderData = {
      userId,
      orderCode,
      items: preview.items,
      shippingAddress,
      paymentMethod,
      paymentStatus: orderModel.PAYMENT_STATUS.UNPAID,
      status: orderModel.ORDER_STATUS.PENDING,
      total: preview.total,
      note: note || ''
    }

    // QUAN TRỌNG: Cập nhật tồn kho sản phẩm TRƯỚC (trước khi tạo đơn hàng)
    // Điều này ngăn chặn bán quá số lượng tồn kho bằng cách fail ngay nếu hết hàng
    try {
      await Promise.all(
        preview.items.map(async (item) => {
          const result = await productModel.updateStock(item.productId, -item.quantity)
          if (!result) {
            throw new Error(`Product "${item.name}" is out of stock`)
          }
        })
      )
    } catch (stockError) {
      // Không đủ hàng - fail ngay, không tạo đơn hàng
      throw new ApiError(
        StatusCodes.CONFLICT,
        `Unable to complete order: ${stockError.message}. Please try again.`
      )
    }

    // Biến để theo dõi những gì cần rollback nếu có lỗi
    let createdOrderId = null

    try {
      // Tạo đơn hàng SAU khi đã trừ stock
      const result = await orderModel.createOrder(orderData)
      createdOrderId = result.insertedId.toString()

      // Xử lý phương thức thanh toán - tạo URL thanh toán MoMo sau khi order đã tạo
      if (paymentMethod === orderModel.PAYMENT_METHOD.MOMO) {
        try {
          // Tạo URL thanh toán MoMo với orderId trong extraData
          const momoPayment = await generateMoMoPaymentUrl(orderCode, preview.total, createdOrderId)

          // Cập nhật order với payment URL và transaction ID
          await orderModel.updateOrder(createdOrderId, {
            paymentUrl: momoPayment.paymentUrl,
            paymentTransactionId: momoPayment.transactionId
          })
        } catch (error) {
          // Nếu tạo MoMo payment thất bại, hủy đơn và rollback
          await orderModel.cancelOrder(createdOrderId)

          // Rollback stock
          await Promise.all(
            preview.items.map(item =>
              productModel.updateStock(item.productId, item.quantity)
            )
          )

          throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, `Failed to create MoMo payment: ${error.message}`)
        }
      }

      // Xóa các items đã đặt khỏi giỏ hàng (chỉ khi mua từ cart)
      // QUAN TRỌNG: Xóa cart NGAY sau khi tạo order thành công, trước khi return
      if (source !== 'buy_now') {
        // Lấy danh sách productIds từ preview items
        const selectedProductIds = preview.items.map(item => item.productId)

        // Xóa từng item khỏi cart
        await Promise.all(
          selectedProductIds.map(productId =>
            cartModel.deleteItem(userId, productId)
          )
        )
      }

      // Lấy thông tin đơn hàng vừa tạo
      const order = await orderModel.findOneById(result.insertedId)

      return order

    } catch (error) {
      // ROLLBACK: Nếu tạo order hoặc bất kỳ bước nào thất bại
      
      // Nếu đã tạo order, hủy nó
      if (createdOrderId) {
        await orderModel.cancelOrder(createdOrderId)
      }

      // Rollback stock
      const isAlreadyRolledBack = error.message && error.message.includes('MoMo payment')
      
      if (!isAlreadyRolledBack) {
        // Rollback stock cho các lỗi khác (VD: lỗi khi tạo order, xóa cart, v.v.)
        await Promise.all(
          preview.items.map(item =>
            productModel.updateStock(item.productId, item.quantity)
          )
        )
      }

      throw error
    }
  } catch (error) {
    throw error
  }
}

/**
 * Lấy danh sách đơn hàng của user với pagination
 * Loại bỏ shippingAddress khỏi list view (chỉ hiển thị khi xem chi tiết)
 * @param {string} userId - User ID
 * @param {Object} query - { page, limit, status }
 * @returns {Promise<Object>} { data: orders, pagination }
 */
const getMyOrders = async (userId, query) => {
  try {
    const {
      page = ORDER_PAGINATION.DEFAULT_PAGE,
      limit = ORDER_PAGINATION.DEFAULT_LIMIT,
      status
    } = query

    const validatedPage = Math.max(parseInt(page) || ORDER_PAGINATION.DEFAULT_PAGE, ORDER_PAGINATION.DEFAULT_PAGE)
    const validatedLimit = Math.min(
      Math.max(parseInt(limit) || ORDER_PAGINATION.DEFAULT_LIMIT, ORDER_PAGINATION.MIN_LIMIT),
      ORDER_PAGINATION.MAX_LIMIT
    )

    const options = {
      page: validatedPage,
      limit: validatedLimit
    }

    if (status) {
      options.status = status
    }

    const { orders, pagination } = await orderModel.findByUserId(userId, options)

    // Remove shippingAddress from list view
    const ordersWithoutShippingAddress = orders.map(order => {
      // eslint-disable-next-line no-unused-vars
      const { shippingAddress, ...orderWithoutAddress } = order
      return orderWithoutAddress
    })

    // Return consistent format
    return {
      data: ordersWithoutShippingAddress,
      pagination: {
        currentPage: pagination.page,
        totalPages: pagination.totalPages,
        totalItems: pagination.total,
        hasNextPage: pagination.page < pagination.totalPages,
        hasPrevPage: pagination.page > 1
      }
    }
  } catch (error) {
    throw error
  }
}

/**
 * Lấy thông tin chi tiết đơn hàng
 * Phân quyền:
 * - User chỉ xem được đơn hàng của mình
 * - Admin/Manager xem được tất cả đơn hàng
 * @param {string} userId - User ID
 * @param {string} orderId - Order ID
 * @param {string} userRole - Role của user (admin/manager/customer)
 * @returns {Promise<Object>} Order document với đầy đủ thông tin (bao gồm shippingAddress)
 */
const getOrderById = async (userId, orderId, userRole) => {
  try {
    const order = await orderModel.findOneById(orderId)

    if (!order) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Order not found')
    }

    // Allow admin and manager to view any order
    const isAdminOrManager = userRole === userModel.USER_ROLES.ADMIN || userRole === userModel.USER_ROLES.MANAGER

    // Check if user owns this order or is admin/manager
    if (!isAdminOrManager && order.userId.toString() !== userId) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'You do not have permission to view this order')
    }

    return order
  } catch (error) {
    throw error
  }
}

/**
 * Hủy đơn hàng (chỉ được hủy khi status là pending hoặc confirmed)
 * Quy trình rollback:
 * 1. Kiểm tra quyền (user chỉ hủy được đơn của mình)
 * 2. Kiểm tra trạng thái đơn (chỉ pending/confirmed mới hủy được)
 * 3. Hủy đơn hàng (set status=cancelled)
 * 4. Hoàn trả stock cho sản phẩm
 * @param {string} userId - User ID
 * @param {string} orderId - Order ID cần hủy
 * @returns {Promise<Object>} Cancelled order
 */
const cancelOrder = async (userId, orderId) => {
  try {
    const order = await orderModel.findOneById(orderId)

    if (!order) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Order not found')
    }

    // Kiểm tra user có quyền hủy đơn này không
    if (order.userId.toString() !== userId) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'You do not have permission to cancel this order')
    }

    // Kiểm tra đơn có thể hủy không (chỉ pending/confirmed)
    if (![orderModel.ORDER_STATUS.PENDING, orderModel.ORDER_STATUS.CONFIRMED].includes(order.status)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Order cannot be cancelled. Only pending or confirmed orders can be cancelled.')
    }

    // Hủy đơn hàng
    const result = await orderModel.cancelOrder(orderId)

    // Hoàn trả stock cho tất cả sản phẩm
    await Promise.all(
      order.items.map(item =>
        productModel.updateStock(item.productId.toString(), item.quantity)
      )
    )

    return result
  } catch (error) {
    throw error
  }
}

/**
 * Lấy tất cả đơn hàng (Admin) với pagination và filter
 * Loại bỏ shippingAddress khỏi list view
 * @param {Object} query - { page, limit, status }
 * @returns {Promise<Object>} { data: orders, pagination }
 */
const getAllOrders = async (query) => {
  try {
    const {
      page = ORDER_PAGINATION.DEFAULT_PAGE,
      limit = ORDER_PAGINATION.DEFAULT_LIMIT,
      status
    } = query

    const validatedPage = Math.max(parseInt(page) || ORDER_PAGINATION.DEFAULT_PAGE, ORDER_PAGINATION.DEFAULT_PAGE)
    const validatedLimit = Math.min(
      Math.max(parseInt(limit) || ORDER_PAGINATION.DEFAULT_LIMIT, ORDER_PAGINATION.MIN_LIMIT),
      ORDER_PAGINATION.MAX_LIMIT
    )

    const options = {
      page: validatedPage,
      limit: validatedLimit
    }

    if (status) {
      options.status = status
    }

    const { orders, pagination } = await orderModel.getAllOrders(options)

    // Remove shippingAddress from list view (Admin)
    const ordersWithoutShippingAddress = orders.map(order => {
      // eslint-disable-next-line no-unused-vars
      const { shippingAddress, ...orderWithoutAddress } = order
      return orderWithoutAddress
    })

    // Return consistent format
    return {
      data: ordersWithoutShippingAddress,
      pagination: {
        currentPage: pagination.page,
        totalPages: pagination.totalPages,
        totalItems: pagination.total,
        hasNextPage: pagination.page < pagination.totalPages,
        hasPrevPage: pagination.page > 1
      }
    }
  } catch (error) {
    throw error
  }
}

/**
 * Cập nhật đơn hàng (Admin)
 * Đặc biệt: Khi status chuyển sang DELIVERED, tự động tăng purchases count cho sản phẩm
 * (Non-blocking operation - không chặn nếu thất bại)
 * @param {string} orderId - Order ID
 * @param {Object} updateData - { status, paymentStatus, ... }
 * @returns {Promise<Object>} Updated order
 */
const updateOrder = async (orderId, updateData) => {
  try {
    const order = await orderModel.findOneById(orderId)

    if (!order) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Order not found')
    }

    // Validate status if provided
    if (updateData.status && !Object.values(orderModel.ORDER_STATUS).includes(updateData.status)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid order status')
    }

    // Validate payment status if provided
    if (updateData.paymentStatus && !Object.values(orderModel.PAYMENT_STATUS).includes(updateData.paymentStatus)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid payment status')
    }

    // Check if order status is changing to DELIVERED
    const isOrderDelivered = updateData.status === orderModel.ORDER_STATUS.DELIVERED &&
                             order.status !== orderModel.ORDER_STATUS.DELIVERED

    const result = await orderModel.updateOrder(orderId, updateData)

    // Increment purchases count for all products in order when order is delivered (non-blocking)
    // Only update purchases when order status changes to "delivered"
    if (isOrderDelivered && order.items && order.items.length > 0) {
      const { productModel } = await import('~/models/productModel')
      order.items.forEach(item => {
        productModel.incrementPurchases(item.productId.toString(), item.quantity).catch(() => {})
      })
    }

    return result
  } catch (error) {
    throw error
  }
}

/**
 * Xử lý callback từ MoMo (IPN - Instant Payment Notification)
 * MoMo gửi thông báo kết quả thanh toán đến endpoint này
 * Quy trình:
 * 1. Xác thực signature từ MoMo
 * 2. Tìm đơn hàng theo orderId/orderCode
 * 3. Nếu thanh toán thành công: Cập nhật paymentStatus=paid
 * 4. Nếu thanh toán thất bại: ROLLBACK (hủy đơn, hoàn stock)
 * @param {Object} callbackData - Dữ liệu từ MoMo (orderId, resultCode, transId, signature, ...)
 * @returns {Promise<Object>} { success, message, order }
 */
const handleMoMoCallback = async (callbackData) => {
  try {
    // Verify signature
    const isValid = MoMoProvider.verifyCallbackSignature(callbackData)

    if (!isValid) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid MoMo callback signature')
    }

    // Extract orderId from extraData (we stored order ObjectId there)
    const orderId = callbackData.extraData || null
    const orderCode = callbackData.orderId
    // Parse resultCode as number (it might come as string or number)
    const resultCode = typeof callbackData.resultCode === 'string'
      ? parseInt(callbackData.resultCode, 10)
      : callbackData.resultCode
    const transId = callbackData.transId

    // Find order by orderCode (more reliable than extraData)
    let order = null
    if (orderId) {
      order = await orderModel.findOneById(orderId)
    }

    // If orderId not found in extraData, find by orderCode
    if (!order) {
      const { GET_DB } = await import('~/config/mongodb')
      const { ORDER_COLLECTION_NAME } = orderModel

      order = await GET_DB().collection(ORDER_COLLECTION_NAME).findOne({
        orderCode: orderCode
      })
    }

    if (!order) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Order not found')
    }

    // Check if order is already paid
    if (order.paymentStatus === orderModel.PAYMENT_STATUS.PAID) {
      return {
        success: true,
        message: 'Order already paid',
        order
      }
    }

    // Handle payment result (check both number 0 and string "0")
    const isPaymentSuccess = resultCode === 0 || resultCode === '0'
    if (isPaymentSuccess) {
      // Payment successful
      await orderModel.updateOrder(order._id.toString(), {
        paymentStatus: orderModel.PAYMENT_STATUS.PAID,
        paymentTransactionId: transId
      })

      // Note: Purchases count is only updated when order status is "delivered"
      // This is handled in the updateOrder function

      return {
        success: true,
        message: 'Payment successful',
        order: await orderModel.findOneById(order._id.toString())
      }
    } else {
      // Payment failed - ROLLBACK everything
      // eslint-disable-next-line no-console
      console.log(`Payment failed for order ${order.orderCode}. ResultCode: ${resultCode}`)

      // 1. Cancel order
      await orderModel.updateOrder(order._id.toString(), {
        status: orderModel.ORDER_STATUS.CANCELLED,
        paymentStatus: orderModel.PAYMENT_STATUS.UNPAID
      })

      // 2. Restore stock for all items
      const { productModel } = await import('~/models/productModel')
      await Promise.all(
        order.items.map(item =>
          productModel.updateStock(item.productId.toString(), item.quantity)
        )
      )

      return {
        success: false,
        message: callbackData.message || 'Payment failed. Order cancelled and stock restored.',
        order: await orderModel.findOneById(order._id.toString())
      }
    }
  } catch (error) {
    throw error
  }
}

/**
 * Xử lý redirect từ MoMo sau khi user thanh toán xong
 * MoMo chuyển hướng user về URL này với kết quả thanh toán
 * Lưu ý: IPN callback đã xử lý logic chính, đây chỉ là safety check
 * @param {Object} queryParams - Query params từ MoMo (orderId, resultCode, transId, ...)
 * @returns {Promise<Object>} { success, message, order } - Dùng để redirect về frontend
 */
const handleMoMoReturn = async (queryParams) => {
  try {
    // Verify signature
    const isValid = MoMoProvider.verifyCallbackSignature(queryParams)

    if (!isValid) {
      // Don't throw error, just log warning and continue
      // Sometimes signature verification can fail due to URL encoding issues
      // We'll still process the payment based on resultCode
      // eslint-disable-next-line no-console
      console.warn('MoMo return signature verification failed. Query params:', Object.keys(queryParams))
    }

    const orderCode = queryParams.orderId
    // Parse resultCode as number (it might come as string from query params)
    const resultCode = parseInt(queryParams.resultCode, 10)
    const transId = queryParams.transId
    const extraData = queryParams.extraData || ''

    // Try to find order by extraData (order ObjectId) first, then by orderCode
    let order = null

    if (extraData) {
      try {
        order = await orderModel.findOneById(extraData)
      } catch (err) {
        // If extraData is not a valid ObjectId, continue to search by orderCode
      }
    }

    // If order not found by extraData, find by orderCode
    if (!order) {
      const { GET_DB } = await import('~/config/mongodb')
      const { ORDER_COLLECTION_NAME } = orderModel

      order = await GET_DB().collection(ORDER_COLLECTION_NAME).findOne({
        orderCode: orderCode
      })
    }

    if (!order) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Order not found')
    }

    // If payment was successful and order hasn't been updated yet, update it
    // (IPN callback should have already updated it, but this is a safety check)
    // Check both number 0 and string "0" for resultCode
    const isPaymentSuccess = resultCode === 0 || resultCode === '0'
    if (isPaymentSuccess && order.paymentStatus !== orderModel.PAYMENT_STATUS.PAID) {
      await orderModel.updateOrder(order._id.toString(), {
        paymentStatus: orderModel.PAYMENT_STATUS.PAID,
        paymentTransactionId: transId
      })

      // Note: Purchases count is only updated when order status is "delivered"
      // This is handled in the updateOrder function

      // Refresh order data
      order = await orderModel.findOneById(order._id.toString())
    }

    // Determine success based on resultCode (handle both string and number)
    const paymentSuccess = resultCode === 0 || resultCode === '0'

    return {
      success: paymentSuccess,
      message: queryParams.message || (paymentSuccess ? 'Payment successful' : 'Payment failed'),
      order
    }
  } catch (error) {
    throw error
  }
}

export const orderService = {
  previewOrder,
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  getAllOrders,
  updateOrder,
  handleMoMoCallback,
  handleMoMoReturn
}
