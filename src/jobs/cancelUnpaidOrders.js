/**
 * Cron Job: Tự động hủy đơn hàng chưa thanh toán
 *
 * Chức năng:
 * - Chạy định kỳ để hủy các đơn hàng MoMo còn PENDING sau 1 giờ 40 phút
 * - Khi hủy đơn hàng:
 *   1. Đổi trạng thái đơn hàng thành CANCELLED
 *   2. Hoàn trả số lượng sản phẩm vào kho
 *
 * Cài đặt:
 * - Chạy mỗi giờ bằng cron scheduler
 * - Pattern: cron.schedule('0 * * * *', cancelUnpaidOrders)
 * - Được gọi từ setupCronJobs.js khi server khởi động
 *
 * Lý do:
 * - Tránh giữ sản phẩm quá lâu cho đơn không thanh toán
 * - Giảm tải cho database (dọc dọn đơn cũ)
 * - Tự động hoá quy trình quản lý đơn hàng
 */

import { orderModel } from '~/models/orderModel'
import { productModel } from '~/models/productModel'
import { GET_DB } from '~/config/mongodb'

const UNPAID_ORDER_TIMEOUT_MS = 1 * 40 * 60 * 1000 // 1 giờ 40 phút tính bằng milliseconds

/**
 * Hàm xử lý hủy đơn hàng chưa thanh toán quá 1 giờ 40 phút
 * @returns {Promise<Object>} - Kết quả job: { cancelled, failed, total }
 * 
 * Quy trình:
 * 1. Tính thời điểm cutoff (1 giờ 40 phút trước thời điểm hiện tại)
 * 2. Tìm các đơn hàng thỏa mãn điều kiện:
 *    - Status: PENDING (chờ xử lý)
 *    - PaymentStatus: UNPAID (chưa thanh toán)
 *    - PaymentMethod: MOMO (chỉ hủy thanh toán online, KHÔNG hủy COD)
 *    - CreatedAt: < cutoffTime (quá 1 giờ 40 phút)
 * 3. Với mỗi đơn hàng:
 *    a. Cập nhật status thành CANCELLED
 *    b. Hoàn trả số lượng sản phẩm (productModel.updateStock)
 * 4. Trả về thống kê: số đơn hủy thành công, thất bại, tổng số
 * 
 * Lưu ý:
 * - Không hủy đơn COD vì chờ ship
 * - Sử dụng Promise.all để tăng tốc độ khôi phục stock
 * - Bắt lỗi từng đơn riêng biệt để job không dừng giữa chừng
 */
export const cancelUnpaidOrders = async () => {
  try {
    const { ORDER_COLLECTION_NAME } = orderModel
    
    // Tính thời điểm cắt (1 giờ 40 phút trước)
    const cutoffTime = Date.now() - UNPAID_ORDER_TIMEOUT_MS
    
    // Tìm các đơn hàng thỏa mãn điều kiện hủy:
    // - Trạng thái: PENDING (đang chờ xử lý)
    // - Thanh toán: UNPAID (chưa thanh toán)
    // - Phương thức: MOMO (chỉ hủy online payment, không hủy COD)
    // - Thời gian: tạo quá 1 giờ 40 phút
    const unpaidOrders = await GET_DB().collection(ORDER_COLLECTION_NAME).find({
      status: orderModel.ORDER_STATUS.PENDING,
      paymentStatus: orderModel.PAYMENT_STATUS.UNPAID,
      paymentMethod: orderModel.PAYMENT_METHOD.MOMO,
      createdAt: { $lt: cutoffTime }
    }).toArray()

    if (unpaidOrders.length === 0) {
      // eslint-disable-next-line no-console
      console.log('[Cron] Không có đơn hàng nào cần hủy')
      return { cancelled: 0 }
    }

    // eslint-disable-next-line no-console
    console.log(`[Cron] Tìm thấy ${unpaidOrders.length} đơn hàng chưa thanh toán cần hủy`)

    let successCount = 0
    let failCount = 0

    // Xử lý từng đơn một (không dùng Promise.all để tránh overload database)
    for (const order of unpaidOrders) {
      try {
        // Bước 1: Hủy đơn hàng (update status thành CANCELLED)
        await orderModel.updateOrder(order._id.toString(), {
          status: orderModel.ORDER_STATUS.CANCELLED,
          paymentStatus: orderModel.PAYMENT_STATUS.UNPAID
        })

        // Bước 2: Hoàn trả số lượng sản phẩm vào kho
        // Sử dụng Promise.all để update song song nhiều sản phẩm
        await Promise.all(
          order.items.map(item =>
            productModel.updateStock(item.productId.toString(), item.quantity)
          )
        )

        successCount++
        // eslint-disable-next-line no-console
        console.log(`[Cron] Auto-cancelled order: ${order.orderCode}`)

      } catch (error) {
        failCount++
        // eslint-disable-next-line no-console
        console.error(`[Cron] Failed to cancel order ${order.orderCode}:`, error.message)
      }
    }

    // eslint-disable-next-line no-console
    console.log(`[Cron] Cancelled ${successCount} orders, ${failCount} failed`)

    return {
      cancelled: successCount,
      failed: failCount,
      total: unpaidOrders.length
    }

  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[Cron] Cancel unpaid orders job failed:', error)
    throw error
  }
}
