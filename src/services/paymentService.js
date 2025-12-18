/**
 * PAYMENT SERVICE - Business Logic Layer
 * Implements exact functions from Payment entity specification
 */

import crypto from 'crypto'
import https from 'https'
import { Payment } from '../models/index'
import ApiError from '../utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import { env } from '../config/environment'

/**
 * Records a new payment transaction
 * @param {Object} payment - Payment data { order_id, method, amount, payment_status, payment_url }
 * @returns {Promise<Boolean>} - True if successful
 */
const insertPayment = async (payment) => {
  try {
    await Payment.create({
      order_id: payment.order_id,
      method: payment.method,
      amount: payment.amount,
      payment_status: payment.payment_status || 'PENDING',
      payment_url: payment.payment_url || null
    })
    
    return true
  } catch (error) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error inserting payment')
  }
}

/**
 * Gets payment info for an order
 * @param {number} order_id - Order ID
 * @returns {Promise<Object>} - Payment object
 */
const getPayment = async (order_id) => {
  try {
    const payment = await Payment.findOne({
      where: { order_id }
    })
    
    if (!payment) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Payment not found')
    }
    
    return payment
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error getting payment')
  }
}

/**
 * Updates payment info for an order
 * @param {number} order_id - Order ID
 * @param {Object} updates - Payment updates { payment_status, method, etc }
 * @returns {Promise<Boolean>} - True if successful
 */
const updatePayment = async (order_id, updates) => {
  try {
    const [updated] = await Payment.update(
      updates,
      { where: { order_id } }
    )
    
    if (updated === 0) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Payment not found')
    }
    
    return true
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error updating payment')
  }
}

/**
 * Generates HMAC SHA256 signature for MoMo request
 * @param {string} rawSignature - Raw signature string
 * @param {string} secretKey - MoMo secret key
 * @returns {string} - HMAC SHA256 signature in hex
 */
const generateMoMoSignature = (rawSignature, secretKey) => {
  return crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex')
}

/**
 * Creates MoMo payment request and returns payment URL
 * @param {Object} paymentData - { orderId, orderInfo, amount, redirectUrl, ipnUrl }
 * @returns {Promise<Object>} - MoMo response with payUrl
 */
const createMoMoPayment = async (paymentData) => {
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

    // Create raw signature string
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

    // Generate HMAC SHA256 signature
    const signature = generateMoMoSignature(rawSignature, secretKey)

    // Create request body
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

    // Configure MoMo API endpoint
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

    // Send request to MoMo API
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
 * Verifies MoMo callback signature
 * @param {Object} callbackData - Callback data from MoMo
 * @returns {boolean} - True if signature is valid
 */
const verifyMoMoCallback = (callbackData) => {
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

    // Generate expected signature
    const expectedSignature = generateMoMoSignature(rawSignature, secretKey)

    // Compare signatures
    return signature === expectedSignature
  } catch (error) {
    console.error('Error verifying MoMo signature:', error)
    return false
  }
}

export const paymentService = {
  insertPayment,
  getPayment,
  updatePayment,
  createMoMoPayment,
  verifyMoMoCallback
}
