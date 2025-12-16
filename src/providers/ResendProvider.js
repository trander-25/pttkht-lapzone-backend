import { Resend } from 'resend'
import { env } from '~/config/environment'

const resend = new Resend(env.RESEND_API_KEY)

/**
 * Gửi email sử dụng Resend API
 * @param {string} to - Địa chỉ email người nhận
 * @param {string} subject - Tiêu đề email
 * @param {string} html - Nội dung HTML của email
 * @returns {Promise}
 * 
 * Quy trình:
 * 1. Gọi Resend API với thông tin từ env:
 *    - from: Tên và email người gửi (RESEND_SENDER_NAME, RESEND_SENDER_EMAIL)
 *    - to: Email người nhận
 *    - subject: Tiêu đề
 *    - html: Nội dung HTML
 * 2. Xử lý lỗi chi tiết:
 *    - Lỗi API key không hợp lệ
 *    - Lỗi domain chưa verify (cần verify trong Resend dashboard)
 *    - Các lỗi khác
 * 3. Trả về data nếu gửi thành công
 */
const sendEmail = async (to, subject, html) => {
  try {
    const { data, error } = await resend.emails.send({
      from: `${env.RESEND_SENDER_NAME} <${env.RESEND_SENDER_EMAIL}>`,
      to: [to],
      subject: subject,
      html: html
    })

    if (error) {
      throw new Error(error.message)
    }

    return data
  } catch (error) {
    // Enhanced error handling for Resend specific errors
    if (error.message.includes('API key')) {
      throw new Error('Resend Authentication Failed: Invalid API key. Please check RESEND_API_KEY in .env file')
    }

    if (error.message.includes('not verified')) {
      throw new Error('Resend Domain Error: Your domain is not verified. Please verify your domain in Resend dashboard or use onboarding email.')
    }

    throw new Error(`Failed to send email: ${error.message || error}`)
  }
}

/**
 * Gửi email xác thực tài khoản
 * @param {string} email - Email người nhận
 * @param {string} verifyToken - Token xác thực tài khoản (được tạo bởi authService)
 * @returns {Promise}
 * 
 * Chức năng:
 * - Gửi email chứa link xác thực sau khi user đăng ký
 * - Tạo verification URL với query params: email & token
 * - Email template bao gồm:
 *   + Thiết kế responsive với CSS inline
 *   + Button CTA "Xác Thực Email" link đến verificationUrl
 *   + Fallback text link cho trường hợp button không hiển thị
 *   + Thông tin về lợi ích sau khi xác thực
 *   + Branding LapZone với màu chủ đạo #4CAF50
 * - Link verify được frontend xử lý để gọi API xác thực
 */
const sendVerificationEmail = async (email, verifyToken) => {
  const verificationUrl = `${env.WEBSITE_DOMAIN_PRODUCTION}/verify-account?email=${email}&token=${verifyToken}`

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f4f4f4;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 20px auto;
          background: #ffffff;
          padding: 30px;
          border-radius: 10px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          padding-bottom: 20px;
          border-bottom: 2px solid #4CAF50;
        }
        .header h1 {
          color: #4CAF50;
          margin: 0;
          font-size: 28px;
        }
        .content {
          padding: 20px 0;
        }
        .content p {
          margin: 15px 0;
          font-size: 16px;
        }
        .button-container {
          text-align: center;
          margin: 30px 0;
        }
        .button {
          display: inline-block;
          padding: 14px 36px;
          background-color: #4CAF50;
          color: #ffffff !important;
          text-decoration: none;
          border-radius: 6px;
          font-weight: bold;
          font-size: 16px;
          transition: background-color 0.3s;
        }
        .button:hover {
          background-color: #45a049;
        }
        .link-box {
          background-color: #f8f9fa;
          padding: 15px;
          border-radius: 6px;
          margin: 20px 0;
          word-break: break-all;
        }
        .link-box a {
          color: #4CAF50;
          text-decoration: none;
        }
        .info-box {
          background-color: #e7f3ff;
          border-left: 4px solid #2196F3;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .info-box strong {
          display: block;
          margin-bottom: 10px;
          color: #0d47a1;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          text-align: center;
          color: #666;
          font-size: 13px;
        }
        .footer p {
          margin: 5px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✉️ Xác Thực Email Của Bạn</h1>
        </div>
        
        <div class="content">
          <p>Xin chào,</p>
          
          <p>Cảm ơn bạn đã đăng ký tài khoản tại <strong>LapZone</strong>! Để hoàn tất việc tạo tài khoản và bắt đầu mua sắm, vui lòng xác thực địa chỉ email của bạn.</p>
          
          <div class="button-container">
            <a href="${verificationUrl}" class="button">Xác Thực Email</a>
          </div>
          
          <p style="text-align: center; color: #666; font-size: 14px;">Hoặc sao chép và dán liên kết này vào trình duyệt của bạn:</p>
          
          <div class="link-box">
            <a href="${verificationUrl}">${verificationUrl}</a>
          </div>
          
          <div class="info-box">
            <strong>📌 Sau khi xác thực:</strong>
            <p style="margin: 5px 0;">• Tài khoản của bạn sẽ được kích hoạt ngay lập tức</p>
            <p style="margin: 5px 0;">• Bạn có thể đăng nhập và bắt đầu mua sắm</p>
            <p style="margin: 5px 0;">• Truy cập đầy đủ các tính năng của LapZone</p>
          </div>
          
          <p style="margin-top: 20px; font-size: 14px; color: #666;">
            <strong>Lưu ý:</strong> Nếu bạn không tạo tài khoản tại LapZone, vui lòng bỏ qua email này.
          </p>
          
          <p style="margin-top: 30px;">Trân trọng,<br><strong>Đội ngũ LapZone</strong></p>
        </div>
        
        <div class="footer">
          <p>Đây là email tự động, vui lòng không trả lời trực tiếp email này.</p>
          <p>&copy; ${new Date().getFullYear()} LapZone. Mọi quyền được bảo lưu.</p>
          <p style="margin-top: 10px; font-size: 12px;">
            Nền tảng Thương mại Điện tử LapZone | Cửa hàng Laptop chuyên nghiệp
          </p>
        </div>
      </div>
    </body>
    </html>
  `

  return await sendEmail(email, 'Xác Thực Email - LapZone', html)
}

/**
 * Gửi email đặt lại mật khẩu
 * @param {string} email - Email người nhận
 * @param {string} resetToken - Token reset password (crypto random, hết hạn 15 phút)
 * @returns {Promise}
 * 
 * Chức năng:
 * - Gửi email khi user quên mật khẩu và yêu cầu reset
 * - Tạo reset URL với token trong query param
 * - Email template bao gồm:
 *   + Thiết kế tương tự verification email
 *   + Button CTA "Đặt Lại Mật Khẩu"
 *   + Warning box: Token hết hạn sau 15 phút, không chia sẻ link
 *   + Security tips: Mật khẩu mạnh, không tái sử dụng
 *   + Thông báo: Mật khẩu không đổi nếu không click link
 * - Token được tạo bởi crypto.randomBytes() trong authService
 * - Frontend nhận token từ URL và gọi API reset password
 */
const sendPasswordResetEmail = async (email, resetToken) => {
  const resetUrl = `${env.WEBSITE_DOMAIN_PRODUCTION}/reset-password?token=${resetToken}`

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f4f4f4;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 20px auto;
          background: #ffffff;
          padding: 30px;
          border-radius: 10px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          padding-bottom: 20px;
          border-bottom: 2px solid #4CAF50;
        }
        .header h1 {
          color: #4CAF50;
          margin: 0;
          font-size: 28px;
        }
        .content {
          padding: 20px 0;
        }
        .content p {
          margin: 15px 0;
          font-size: 16px;
        }
        .button-container {
          text-align: center;
          margin: 30px 0;
        }
        .button {
          display: inline-block;
          padding: 14px 36px;
          background-color: #4CAF50;
          color: #ffffff !important;
          text-decoration: none;
          border-radius: 6px;
          font-weight: bold;
          font-size: 16px;
          transition: background-color 0.3s;
        }
        .button:hover {
          background-color: #45a049;
        }
        .link-box {
          background-color: #f8f9fa;
          padding: 15px;
          border-radius: 6px;
          margin: 20px 0;
          word-break: break-all;
        }
        .link-box a {
          color: #4CAF50;
          text-decoration: none;
        }
        .warning {
          background-color: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .warning strong {
          display: block;
          margin-bottom: 10px;
          color: #856404;
        }
        .warning ul {
          margin: 10px 0;
          padding-left: 20px;
        }
        .warning li {
          margin: 5px 0;
          color: #856404;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          text-align: center;
          color: #666;
          font-size: 13px;
        }
        .footer p {
          margin: 5px 0;
        }
        .security-note {
          background-color: #e7f3ff;
          border-left: 4px solid #2196F3;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Đặt Lại Mật Khẩu</h1>
        </div>
        
        <div class="content">
          <p>Xin chào,</p>
          
          <p>Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản LapZone của bạn. Nhấn vào nút bên dưới để tạo mật khẩu mới:</p>
          
          <div class="button-container">
            <a href="${resetUrl}" class="button">Đặt Lại Mật Khẩu</a>
          </div>
          
          <p style="text-align: center; color: #666; font-size: 14px;">Hoặc sao chép và dán liên kết này vào trình duyệt của bạn:</p>
          
          <div class="link-box">
            <a href="${resetUrl}">${resetUrl}</a>
          </div>
          
          <div class="warning">
            <strong>⚠️ Thông Tin Bảo Mật Quan Trọng:</strong>
            <ul>
              <li>Liên kết này sẽ <strong>hết hạn sau 15 phút</strong> để đảm bảo an toàn</li>
              <li>Nếu bạn không yêu cầu, vui lòng bỏ qua email này - mật khẩu của bạn vẫn an toàn</li>
              <li>Mật khẩu của bạn sẽ không thay đổi cho đến khi bạn tạo mật khẩu mới bằng liên kết này</li>
              <li>Không chia sẻ liên kết này với bất kỳ ai</li>
            </ul>
          </div>
          
          <div class="security-note">
            <strong>💡 Mẹo Bảo Mật:</strong>
            <p style="margin: 5px 0;">• Sử dụng mật khẩu mạnh với ít nhất 8 ký tự</p>
            <p style="margin: 5px 0;">• Bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt</p>
            <p style="margin: 5px 0;">• Không sử dụng lại mật khẩu từ các tài khoản khác</p>
          </div>
          
          <p>Nếu bạn gặp khó khăn khi nhấn nút hoặc cần hỗ trợ, vui lòng liên hệ đội ngũ hỗ trợ của chúng tôi.</p>
          
          <p style="margin-top: 30px;">Trân trọng,<br><strong>Đội ngũ LapZone</strong></p>
        </div>
        
        <div class="footer">
          <p>Đây là email tự động, vui lòng không trả lời trực tiếp email này.</p>
          <p>&copy; ${new Date().getFullYear()} LapZone. Mọi quyền được bảo lưu.</p>
          <p style="margin-top: 10px; font-size: 12px;">
            Nền tảng Thương mại Điện tử LapZone | Cửa hàng Laptop chuyên nghiệp
          </p>
        </div>
      </div>
    </body>
    </html>
  `

  return await sendEmail(email, 'Đặt Lại Mật Khẩu - LapZone', html)
}

export const ResendProvider = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail
}