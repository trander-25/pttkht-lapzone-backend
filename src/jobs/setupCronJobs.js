/**
 * Cài đặt Cron Jobs cho ứng dụng
 *
 * File này khởi tạo tất cả scheduled jobs chạy nền tảng (background)
 * để thực hiện các tác vụ bảo trì định kỳ.
 *
 * Cách sử dụng:
 * 1. Cài đặt node-cron: npm install node-cron
 * 2. Import file này trong server.js: import { setupCronJobs } from '~/jobs/setupCronJobs'
 * 3. Gọi setupCronJobs() sau khi server khởi động thành công
 *
 * Danh sách jobs hiện tại:
 * - cancelUnpaidOrders: Hủy đơn hàng MoMo chưa thanh toán quá 1 giờ 40 phút (chạy mỗi giờ)
 *
 * Mở rộng:
 * - Có thể thêm jobs khác: cleanup logs, send reports, backup database...
 */

import cron from 'node-cron'
import { cancelUnpaidOrders } from './cancelUnpaidOrders.js'

/**
 * Lịch trình: Hủy đơn hàng chưa thanh toán
 * Chạy mỗi giờ để kiểm tra đơn hàng MoMo pending > 1 giờ 40 phút và tự động hủy
 * Cron pattern: '0 * * * *' = Vào phút 0 của mỗi giờ
 * 
 * Giải thích pattern:
 * - Phút: 0 (phút thứ 0)
 * - Giờ: * (mọi giờ)
 * - Ngày trong tháng: * (mọi ngày)
 * - Tháng: * (mọi tháng)
 * - Ngày trong tuần: * (mọi ngày)
 */
export const setupCronJobs = () => {
  // Job hủy đơn hàng chưa thanh toán - chạy mỗi giờ
  cron.schedule('0 * * * *', async () => {
    try {
      // eslint-disable-next-line no-console
      console.log('[Cron] Đang chạy job hủy đơn hàng chưa thanh toán...')
      const result = await cancelUnpaidOrders()
      // eslint-disable-next-line no-console
      console.log('[Cron] Job hoàn thành:', result)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[Cron] Lỗi khi chạy job:', error)
    }
  })

  // eslint-disable-next-line no-console
  console.log('[Cron] Tất cả cron jobs đã được lên lịch thành công')
  // eslint-disable-next-line no-console
  console.log('[Cron] - Hủy đơn hàng chưa thanh toán: Mỗi giờ vào phút 0')
}
