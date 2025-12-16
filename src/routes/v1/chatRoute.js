import express from 'express'
import { chatValidation } from '~/validations/chatValidation'
import { chatController } from '~/controllers/chatController'
import { authMiddleware } from '~/middlewares/authMiddleware'

const Router = express.Router()

/**
 * @swagger
 * /chat/conversations:
 *   get:
 *     tags:
 *       - Chat
 *     summary: Get user's conversations
 *     description: Retrieve list of AI conversations for authenticated user
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Conversations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   userId:
 *                     type: string
 *                   type:
 *                     type: string
 *                     enum: [user-ai]
 *                   lastMessage:
 *                     type: object
 *                   lastMessageAt:
 *                     type: number
 *                   createdAt:
 *                     type: number
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
Router.route('/conversations')
  .get(
    authMiddleware.isAuthorized,
    chatController.getConversations
  )

/**
 * @swagger
 * /chat/conversations/create:
 *   post:
 *     tags:
 *       - Chat
 *     summary: Create or get AI conversation
 *     description: Create a new AI conversation or get existing one
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Conversation created or retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 userId:
 *                   type: string
 *                 type:
 *                   type: string
 *                 createdAt:
 *                   type: number
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 */
Router.route('/conversations/create')
  .post(
    authMiddleware.isAuthorized,
    chatValidation.createConversation,
    chatController.createConversation
  )

/**
 * @swagger
 * /chat/conversations/{conversationId}/messages:
 *   get:
 *     tags:
 *       - Chat
 *     summary: Get messages in conversation
 *     description: Retrieve paginated messages in a specific conversation
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Conversation ObjectId
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Messages retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 messages:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       conversationId:
 *                         type: string
 *                       senderId:
 *                         type: string
 *                         nullable: true
 *                       senderType:
 *                         type: string
 *                         enum: [user, ai]
 *                       content:
 *                         type: string
 *                       attachments:
 *                         type: array
 *                         items:
 *                           type: object
 *                       isRead:
 *                         type: boolean
 *                       createdAt:
 *                         type: number
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     total:
 *                       type: integer
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: You do not have permission to access this conversation
 *       404:
 *         description: Conversation not found
 *
 *   post:
 *     tags:
 *       - Chat
 *     summary: Send message in conversation
 *     description: Send a message in an existing conversation
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 5000
 *                 example: 'Hello, I need help with my order'
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     url:
 *                       type: string
 *                     type:
 *                       type: string
 *                       enum: [image, file]
 *                     name:
 *                       type: string
 *                     size:
 *                       type: number
 *     responses:
 *       201:
 *         description: Message sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 conversationId:
 *                   type: string
 *                 senderId:
 *                   type: string
 *                 senderType:
 *                   type: string
 *                 content:
 *                   type: string
 *                 createdAt:
 *                   type: number
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: You do not have permission to send messages in this conversation
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 */
// Lấy tin nhắn trong conversation
Router.route('/conversations/:conversationId/messages')
  .get(
    authMiddleware.isAuthorized,
    chatController.getMessages
  )
  .post(
    authMiddleware.isAuthorized,
    chatValidation.sendMessage,
    chatController.sendMessage
  )

/**
 * @swagger
 * /chat/conversations/{conversationId}/read:
 *   put:
 *     tags:
 *       - Chat
 *     summary: Mark messages as read
 *     description: Mark all unread messages in a conversation as read
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Messages marked as read successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 modifiedCount:
 *                   type: integer
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: You do not have permission to access this conversation
 *       404:
 *         description: Conversation not found
 */
// Đánh dấu tin nhắn đã đọc
Router.route('/conversations/:conversationId/read')
  .put(
    authMiddleware.isAuthorized,
    chatController.markAsRead
  )

/**
 * @swagger
 * /chat/ai:
 *   post:
 *     tags:
 *       - Chat
 *     summary: Send message to AI assistant
 *     description: |
 *       Send a message to AI chatbot and receive automated response.
 *       AI provides product recommendations, answers questions, and assists with shopping.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 5000
 *                 example: 'Tôi muốn tìm laptop gaming giá dưới 30 triệu'
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     url:
 *                       type: string
 *                     type:
 *                       type: string
 *                       enum: [image, file]
 *                     name:
 *                       type: string
 *                     size:
 *                       type: number
 *     responses:
 *       201:
 *         description: AI response generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 conversation:
 *                   type: object
 *                   description: The AI conversation
 *                 userMessage:
 *                   type: object
 *                   description: User's message
 *                 aiMessage:
 *                   type: object
 *                   description: AI's response
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 */
// Gửi tin nhắn tới AI
Router.route('/ai')
  .post(
    authMiddleware.isAuthorized,
    chatValidation.sendMessageToAI,
    chatController.sendMessageToAI
  )

export const chatRoute = Router