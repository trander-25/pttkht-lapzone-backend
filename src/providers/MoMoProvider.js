import crypto from 'crypto'
import https from 'https'
import { env } from '~/config/environment'

/**
 * Tạo chữ ký HMAC SHA256 cho yêu cầu thanh toán MoMo
 * Chữ ký này đảm bảo tính toàn vẹn và xác thực của request
 * @param {string} rawSignature - Chuỗi chữ ký thô (các tham số đã nối với nhau)
 * @param {string} secretKey - Secret key của MoMo
 * @returns {string} Chữ ký HMAC SHA256 dạng hex
 */
const generateSignature = (rawSignature, secretKey) => {
  return crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex')
}

/**
 * Tạo yêu cầu thanh toán tới MoMo API
 * Quy trình:
 * 1. Chuẩn bị dữ liệu thanh toán
 * 2. Tạo chữ ký HMAC SHA256
 * 3. Gửi HTTPS request tới MoMo API
 * 4. Xử lý response và trả về payment URL
 * @param {Object} paymentData - Dữ liệu thanh toán
 * @param {string} paymentData.orderId - Mã đơn hàng
 * @param {string} paymentData.orderInfo - Thông tin đơn hàng
 * @param {number} paymentData.amount - Số tiền thanh toán
 * @param {string} paymentData.redirectUrl - URL chuyển hướng sau thanh toán
 * @param {string} paymentData.ipnUrl - URL callback nhận thông báo từ MoMo
 * @param {string} paymentData.extraData - Dữ liệu bổ sung (tùy chọn)
 * @returns {Promise<Object>} Phản hồi thanh toán từ MoMo (chứa payUrl, qrCodeUrl)
 */
const createPaymentRequest = async (paymentData) => {
  return new Promise((resolve, reject) => {
    const {
      orderId,
      orderInfo,
      amount,
      redirectUrl,
      ipnUrl,
      extraData = ''
    } = paymentData

    const accessKey = env.MOMO_ACCESS_KEY
    const secretKey = env.MOMO_SECRET_KEY
    const partnerCode = env.MOMO_PARTNER_CODE || 'MOMO'
    const requestType = 'payWithMethod'
    const requestId = orderId
    const orderGroupId = ''
    const autoCapture = true
    const lang = 'vi'

    // Tạo chuỗi chữ ký thô (các tham số được sắp xếp theo thứ tự alphabet)
    const rawSignature =
      'accessKey=' + accessKey +
      '&amount=' + amount +
      '&extraData=' + extraData +
      '&ipnUrl=' + ipnUrl +
      '&orderId=' + orderId +
      '&orderInfo=' + orderInfo +
      '&partnerCode=' + partnerCode +
      '&redirectUrl=' + redirectUrl +
      '&requestId=' + requestId +
      '&requestType=' + requestType

    // Tạo chữ ký HMAC SHA256
    const signature = generateSignature(rawSignature, secretKey)

    // Tạo request body cho MoMo API
    const requestBody = JSON.stringify({
      partnerCode: partnerCode,
      partnerName: env.MOMO_PARTNER_NAME || 'Test',
      storeId: env.MOMO_STORE_ID || 'MomoTestStore',
      requestId: requestId,
      amount: amount,
      orderId: orderId,
      orderInfo: orderInfo,
      redirectUrl: redirectUrl,
      ipnUrl: ipnUrl,
      lang: lang,
      requestType: requestType,
      autoCapture: autoCapture,
      extraData: extraData,
      orderGroupId: orderGroupId,
      signature: signature
    })

    // Cấu hình endpoint MoMo API
    const options = {
      hostname: env.MOMO_API_HOST || 'test-payment.momo.vn',
      port: 443,
      path: '/v2/gateway/api/create',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody)
      }
    }

    // Gửi request tới MoMo API
    const req = https.request(options, (res) => {
      let data = ''

      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        try {
          const response = JSON.parse(data)
          if (response.resultCode === 0) {
            resolve(response)
          } else {
            reject(new Error(`MoMo API Error: ${response.message || 'Unknown error'}`))
          }
        } catch (error) {
          reject(new Error(`Failed to parse MoMo response: ${error.message}`))
        }
      })
    })

    req.on('error', (error) => {
      reject(new Error(`MoMo request failed: ${error.message}`))
    })

    req.write(requestBody)
    req.end()
  })
}

/**
 * Xác thực chữ ký callback từ MoMo
 * Đảm bảo request callback thực sự từ MoMo chứ không phải giả mạo
 * @param {Object} callbackData - Dữ liệu callback từ MoMo
 * @param {string} callbackData.orderId - Mã đơn hàng
 * @param {string} callbackData.amount - Số tiền
 * @param {string} callbackData.orderInfo - Thông tin đơn hàng
 * @param {string} callbackData.orderType - Loại đơn hàng
 * @param {string} callbackData.transId - Mã giao dịch MoMo
 * @param {string} callbackData.resultCode - Mã kết quả (0 = thành công)
 * @param {string} callbackData.message - Thông báo
 * @param {string} callbackData.payType - Hình thức thanh toán
 * @param {string} callbackData.responseTime - Thời gian phản hồi
 * @param {string} callbackData.extraData - Dữ liệu bổ sung
 * @param {string} callbackData.requestId - ID yêu cầu (tùy chọn)
 * @param {string} callbackData.signature - Chữ ký từ MoMo
 * @returns {boolean} True nếu chữ ký hợp lệ
 */
const verifyCallbackSignature = (callbackData) => {
  try {
    const {
      orderId,
      amount,
      orderInfo = '',
      orderType = '',
      transId,
      resultCode,
      message = '',
      payType = '',
      responseTime,
      extraData = '',
      requestId = '',
      signature
    } = callbackData

    if (!signature || !orderId || !transId || resultCode === undefined) {
      return false
    }

    const accessKey = env.MOMO_ACCESS_KEY
    const secretKey = env.MOMO_SECRET_KEY
    const partnerCode = env.MOMO_PARTNER_CODE || 'MOMO'

    // Create raw signature string for verification
    // Order matters: accessKey, amount, extraData, message, orderId, orderInfo, orderType, partnerCode, payType, requestId, responseTime, resultCode, transId
    const rawSignature =
      'accessKey=' + accessKey +
      '&amount=' + amount +
      '&extraData=' + (extraData || '') +
      '&message=' + (message || '') +
      '&orderId=' + orderId +
      '&orderInfo=' + (orderInfo || '') +
      '&orderType=' + (orderType || '') +
      '&partnerCode=' + partnerCode +
      '&payType=' + (payType || '') +
      '&requestId=' + (requestId || '') +
      '&responseTime=' + responseTime +
      '&resultCode=' + resultCode +
      '&transId=' + transId

    // Generate signature
    const expectedSignature = generateSignature(rawSignature, secretKey)

    // Compare signatures
    return signature === expectedSignature
  } catch (error) {
    console.error('Error verifying MoMo signature:', error)
    return false
  }
}

export const MoMoProvider = {
  createPaymentRequest,
  verifyCallbackSignature,
  generateSignature
}

