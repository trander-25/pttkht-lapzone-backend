import { GoogleGenAI } from '@google/genai'
import { env } from '~/config/environment'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'

// Khởi tạo Gemini AI với RAG support
const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY })

/**
 * Trợ lý AI chuyên tư vấn sản phẩm laptop và thiết bị công nghệ LapZone
 * 
 * @param {string} message - Tin nhắn từ người dùng
 * @param {Array<Object>} conversationHistory - Lịch sử 10 tin nhắn gần nhất
 *   - Mỗi message có: { senderType: 'user'|'ai', content: string }
 *   - Giúp AI hiểu context và trả lời mạch lạc hơn
 * @returns {Promise<string>} - Phản hồi từ AI (văn phong ngắn gọn, súc tích)
 * 
 * Quy trình:
 * 1. Khởi tạo Gemini model (gemini-2.5-flash-lite - tối ưu token & tốc độ)
 * 2. Build system prompt định hướng AI về:
 *    - Vai trò: Trợ lý tư vấn laptop LapZone
 *    - Phong cách: Ngắn gọn, súc tích, thân thiện
 *    - Khả năng: Tư vấn sản phẩm, giải thích specs, so sánh, hỗ trợ đơn hàng
 * 3. Thêm conversation history vào prompt (nếu có)
 * 4. Gọi Gemini API và trả về response
 * 5. Xử lý lỗi nếu API key thiếu hoặc Gemini fail
 * 
 * Lưu ý:
 * - System prompt tối ưu để AI trả lời NGẮN GỌN → tiết kiệm token
 * - Không validate GEMINI_API_KEY (đã validate ở env config)
 * - Throw ApiError để error middleware xử lý thống nhất
 */
const generateProductAssistantResponse = async (message, conversationHistory = []) => {
  try {
    // System instruction tối ưu cho RAG - chỉ trả lời dựa trên tài liệu
    const systemInstruction = `Bạn là nhân viên tư vấn bán hàng chuyên nghiệp của LapZone.
Nguyên tắc:
1. Trả lời thật ngắn gọn, súc tích.
2. Trả lời dựa trên DUY NHẤT thông tin từ tài liệu đính kèm.
3. Nếu không có thông tin, hãy xin lỗi và gợi ý khách liên hệ hotline, không được bịa đặt.
4. Giọng điệu thân thiện, dùng 'Dạ/Vâng', xưng 'Em'.
5. Báo giá rõ ràng kèm đơn vị tiền tệ (VNĐ).
6. Khi liệt kê sản phẩm, KHÔNG dùng dấu * hoặc **, chỉ dùng gạch đầu dòng (-) và viết thường.`

    // Build user prompt với conversation history (nếu có)
    let userPrompt = ''
    if (conversationHistory && conversationHistory.length > 0) {
      userPrompt += 'Lịch sử cuộc hội thoại:\n'
      conversationHistory.forEach(msg => {
        const role = msg.senderType === 'user' ? 'Khách hàng' : 'Trợ lý'
        userPrompt += `${role}: ${msg.content}\n`
      })
      userPrompt += '\n'
    }
    userPrompt += `Câu hỏi mới: ${message}`

    // Gọi Gemini với RAG file search
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userPrompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.1, // Giảm độ sáng tạo để tăng tính chính xác
        tools: [{
          fileSearch: {
            fileSearchStoreNames: [env.GEMINI_FILE_SEARCH_STORE_NAME]
          }
        }]
      }
    })

    return response.text
  } catch (error) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      `Lỗi khi gọi AI tư vấn sản phẩm: ${error.message}`
    )
  }
}

export const GeminiProvider = {
  generateProductAssistantResponse
}

