import express from 'express'
import { orderController } from '~/controllers/orderController'
import { orderValidation } from '~/validations/orderValidation'
import { authMiddleware } from '~/middlewares/authMiddleware'
import { rbacMiddleware } from '~/middlewares/rbacMiddleware'
import { userModel } from '~/models/userModel'

const Router = express.Router()

/**
 * @swagger
 * /orders/preview:
 *   post:
 *     tags:
 *       - Orders
 *     summary: Preview order before checkout
 *     description: |
 *       Calculate order totals before placing order.
 *       Supports both "buy from cart" and "buy now" scenarios.
 *
 *       **Business Logic:**
 *       - Validates product availability and stock
 *       - Calculates total (sum of all items: price × quantity)
 *       - Does NOT create order or modify stock
 *       - No shipping fee or voucher discount in current version
 *
 *       **Use Cases:**
 *       1. **Buy from Cart**: Use selected items from user's cart
 *       2. **Buy Now**: Direct purchase from product page
 *
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               source:
 *                 type: string
 *                 enum: [cart, buy_now]
 *                 default: cart
 *                 description: Order source - from cart or direct buy
 *               items:
 *                 type: array
 *                 description: Required when source is 'buy_now'. Ignored when source is 'cart'.
 *                 items:
 *                   type: object
 *                   required:
 *                     - productId
 *                     - quantity
 *                   properties:
 *                     productId:
 *                       type: string
 *                       pattern: '^[0-9a-fA-F]{24}$'
 *                       example: '507f1f77bcf86cd799439011'
 *                     quantity:
 *                       type: integer
 *                       minimum: 1
 *                       example: 2
 *               cartItemIds:
 *                 type: array
 *                 description: |
 *                   Optional - specific cart item IDs to preview.
 *                   If not provided, uses all selected items in cart.
 *                   Only applicable when source='cart'.
 *                 items:
 *                   type: string
 *           examples:
 *             buyFromCart:
 *               summary: Buy from cart (all selected items)
 *               value:
 *                 source: 'cart'
 *             buyNow:
 *               summary: Buy now (direct purchase)
 *               value:
 *                 source: 'buy_now'
 *                 items:
 *                   - productId: '507f1f77bcf86cd799439011'
 *                     quantity: 2
 *                   - productId: '507f1f77bcf86cd799439012'
 *                     quantity: 1
 *     responses:
 *       200:
 *         description: Order preview calculated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   description: List of items to be ordered with current prices
 *                   items:
 *                     type: object
 *                     properties:
 *                       productId:
 *                         type: string
 *                         example: '507f1f77bcf86cd799439011'
 *                       name:
 *                         type: string
 *                         example: 'Dell XPS 13'
 *                       price:
 *                         type: number
 *                         example: 25000000
 *                         description: Current price in VND
 *                       quantity:
 *                         type: integer
 *                         example: 2
 *                       image:
 *                         type: string
 *                         example: 'https://res.cloudinary.com/...'
 *                 total:
 *                   type: number
 *                   example: 50000000
 *                   description: Total order amount (sum of price × quantity for all items)
 *             example:
 *               items:
 *                 - productId: '507f1f77bcf86cd799439011'
 *                   name: 'Dell XPS 13'
 *                   price: 25000000
 *                   quantity: 2
 *                   image: 'https://res.cloudinary.com/...'
 *               total: 50000000
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *             examples:
 *               noItems:
 *                 summary: No items provided
 *                 value:
 *                   message: 'No items provided for buy now'
 *               emptyCart:
 *                 summary: Cart is empty
 *                 value:
 *                   message: 'Cart is empty'
 *               noSelection:
 *                 summary: No items selected
 *                 value:
 *                   message: 'No items selected for order'
 *               insufficientStock:
 *                 summary: Not enough stock
 *                 value:
 *                   message: 'Product Dell XPS 13 only has 5 items in stock'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'Product with ID 507f1f77bcf86cd799439011 not found'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 */
Router.route('/preview')
  .post(
    authMiddleware.isAuthorized,
    orderValidation.previewOrder,
    orderController.previewOrder
  )

/**
 * @swagger
 * /orders/me:
 *   get:
 *     tags:
 *       - Orders
 *     summary: Get my orders
 *     description: |
 *       Retrieve authenticated user's orders with pagination and status filter.
 *
 *       **Note:** shippingAddress is excluded from list view for performance.
 *       Use GET /orders/{orderId} to view full order details including shipping address.
 *
 *       **Order Status:**
 *       - **pending**: Waiting for confirmation
 *       - **confirmed**: Confirmed, preparing for shipping
 *       - **shipping**: Out for delivery
 *       - **delivered**: Successfully delivered
 *       - **cancelled**: Cancelled (stock restored)
 *
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 50
 *         description: Items per page (max 50)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, shipping, delivered, cancelled]
 *         description: Filter by order status
 *         example: 'pending'
 *     responses:
 *       200:
 *         description: Orders retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       userId:
 *                         type: string
 *                       orderCode:
 *                         type: string
 *                       items:
 *                         type: array
 *                       paymentMethod:
 *                         type: string
 *                       paymentStatus:
 *                         type: string
 *                       status:
 *                         type: string
 *                       total:
 *                         type: number
 *                       createdAt:
 *                         type: number
 *                       pendingAt:
 *                         type: number
 *                       confirmedAt:
 *                         type: number
 *                       deliveredAt:
 *                         type: number
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                       example: 1
 *                     totalPages:
 *                       type: integer
 *                       example: 3
 *                     totalItems:
 *                       type: integer
 *                       example: 25
 *                     hasNextPage:
 *                       type: boolean
 *                       example: true
 *                     hasPrevPage:
 *                       type: boolean
 *                       example: false
 *             example:
 *               data:
 *                 - _id: '507f1f77bcf86cd799439013'
 *                   userId: '507f1f77bcf86cd799439010'
 *                   orderCode: 'ORD123456789012'
 *                   items:
 *                     - productId: '507f1f77bcf86cd799439011'
 *                       name: 'Dell XPS 13'
 *                       price: 25000000
 *                       quantity: 2
 *                       image: 'https://...'
 *                   paymentMethod: 'cod'
 *                   paymentStatus: 'unpaid'
 *                   status: 'pending'
 *                   total: 50000000
 *                   createdAt: 1638360000000
 *                   pendingAt: 1638360000000
 *               pagination:
 *                 currentPage: 1
 *                 totalPages: 3
 *                 totalItems: 25
 *                 hasNextPage: true
 *                 hasPrevPage: false
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
Router.route('/me')
  .get(
    authMiddleware.isAuthorized,
    orderValidation.getMyOrders,
    orderController.getMyOrders
  )

/**
 * @swagger
 * /orders:
 *   post:
 *     tags:
 *       - Orders
 *     summary: Create order (Checkout)
 *     description: |
 *       Place a new order from cart or direct buy.
 *
 *       **Workflow:**
 *       1. Preview order to validate items and calculate totals
 *       2. **Decrease product stock** (atomic operation to prevent overselling)
 *       3. Create order with status=PENDING, paymentStatus=UNPAID
 *       4. Remove ordered items from cart (if source='cart')
 *       5. Generate MoMo payment URL (if paymentMethod='momo')
 *
 *       **Payment Methods:**
 *       - **COD**: Cash on Delivery - pay when receiving goods
 *       - **MoMo**: Online payment via MoMo e-wallet
 *
 *       **Important Notes:**
 *       - Stock is decreased immediately upon order creation
 *       - If payment fails (MoMo), order is auto-cancelled and stock is restored
 *       - Cart items are removed only after successful order creation
 *
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - shippingAddress
 *               - paymentMethod
 *             properties:
 *               source:
 *                 type: string
 *                 enum: [cart, buy_now]
 *                 default: cart
 *                 description: Order source
 *               items:
 *                 type: array
 *                 description: Required when source='buy_now'. Array of products to order.
 *                 items:
 *                   type: object
 *                   required:
 *                     - productId
 *                     - quantity
 *                   properties:
 *                     productId:
 *                       type: string
 *                       pattern: '^[0-9a-fA-F]{24}$'
 *                     quantity:
 *                       type: integer
 *                       minimum: 1
 *               cartItemIds:
 *                 type: array
 *                 description: Optional - specific cart items to order (defaults to all selected)
 *                 items:
 *                   type: string
 *               shippingAddress:
 *                 type: object
 *                 required:
 *                   - fullName
 *                   - phone
 *                   - province
 *                   - district
 *                   - ward
 *                   - street
 *                 properties:
 *                   fullName:
 *                     type: string
 *                     minLength: 2
 *                     example: 'Nguyen Van A'
 *                   phone:
 *                     type: string
 *                     pattern: '^[0-9]{10,11}$'
 *                     example: '0987654321'
 *                     description: Vietnamese phone number (10-11 digits)
 *                   province:
 *                     type: string
 *                     example: 'Thành phố Hồ Chí Minh'
 *                   district:
 *                     type: string
 *                     example: 'Quận 1'
 *                   ward:
 *                     type: string
 *                     example: 'Phường Bến Nghé'
 *                   street:
 *                     type: string
 *                     example: '123 Lê Lợi'
 *                   note:
 *                     type: string
 *                     example: 'Gọi trước khi giao'
 *                     description: Additional delivery notes (optional)
 *               paymentMethod:
 *                 type: string
 *                 enum: [cod, momo]
 *                 example: 'cod'
 *                 description: Payment method - COD or MoMo
 *               note:
 *                 type: string
 *                 maxLength: 500
 *                 example: 'Vui lòng giao trước 5h chiều'
 *                 description: Order notes from customer (optional)
 *           examples:
 *             buyFromCartCOD:
 *               summary: Buy from cart with COD
 *               value:
 *                 source: 'cart'
 *                 shippingAddress:
 *                   fullName: 'Nguyen Van A'
 *                   phone: '0987654321'
 *                   province: 'Thành phố Hồ Chí Minh'
 *                   district: 'Quận 1'
 *                   ward: 'Phường Bến Nghé'
 *                   street: '123 Lê Lợi'
 *                 paymentMethod: 'cod'
 *             buyNowMoMo:
 *               summary: Buy now with MoMo payment
 *               value:
 *                 source: 'buy_now'
 *                 items:
 *                   - productId: '507f1f77bcf86cd799439011'
 *                     quantity: 1
 *                 shippingAddress:
 *                   fullName: 'Tran Thi B'
 *                   phone: '0912345678'
 *                   province: 'Hà Nội'
 *                   district: 'Quận Ba Đình'
 *                   ward: 'Phường Cống Vị'
 *                   street: '456 Hoàng Hoa Thám'
 *                 paymentMethod: 'momo'
 *                 note: 'Giao hàng giờ hành chính'
 *     responses:
 *       201:
 *         description: Order created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *             examples:
 *               codOrder:
 *                 summary: COD Order
 *                 value:
 *                   _id: '507f1f77bcf86cd799439013'
 *                   userId: '507f1f77bcf86cd799439010'
 *                   orderCode: 'ORD123456789012'
 *                   items:
 *                     - productId: '507f1f77bcf86cd799439011'
 *                       name: 'Dell XPS 13'
 *                       price: 25000000
 *                       quantity: 2
 *                       image: 'https://...'
 *                   shippingAddress:
 *                     fullName: 'Nguyen Van A'
 *                     phone: '0987654321'
 *                     province: 'Thành phố Hồ Chí Minh'
 *                     district: 'Quận 1'
 *                     ward: 'Phường Bến Nghé'
 *                     street: '123 Lê Lợi'
 *                   paymentMethod: 'cod'
 *                   paymentStatus: 'unpaid'
 *                   status: 'pending'
 *                   total: 50000000
 *                   note: ''
 *                   createdAt: 1638360000000
 *                   pendingAt: 1638360000000
 *               momoOrder:
 *                 summary: MoMo Order (with payment URL)
 *                 value:
 *                   _id: '507f1f77bcf86cd799439014'
 *                   userId: '507f1f77bcf86cd799439010'
 *                   orderCode: 'ORD123456789013'
 *                   items:
 *                     - productId: '507f1f77bcf86cd799439011'
 *                       name: 'Dell XPS 13'
 *                       price: 25000000
 *                       quantity: 1
 *                       image: 'https://...'
 *                   paymentMethod: 'momo'
 *                   paymentStatus: 'unpaid'
 *                   paymentUrl: 'https://test-payment.momo.vn/...'
 *                   paymentTransactionId: 'MOMO1638360000000'
 *                   status: 'pending'
 *                   total: 25000000
 *                   createdAt: 1638360000000
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *             examples:
 *               insufficientStock:
 *                 summary: Insufficient stock
 *                 value:
 *                   message: 'Unable to complete order: Product "Dell XPS 13" is out of stock. Please try again.'
 *               emptyCart:
 *                 summary: Empty cart
 *                 value:
 *                   message: 'Cart is empty'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Product not found
 *       409:
 *         description: Conflict - Insufficient stock
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         description: Failed to create MoMo payment
 *
 *   get:
 *     tags:
 *       - Orders
 *     summary: Get all orders (Manager/Admin only)
 *     description: |
 *       Retrieve all orders in the system with pagination and filtering.
 *       Only accessible by Manager and Admin roles.
 *
 *       **Note:** shippingAddress is excluded from list view for privacy.
 *       Use GET /orders/{orderId} to view full details including shipping address.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 50
 *         description: Items per page (max 50)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, shipping, delivered, cancelled]
 *         description: Filter by order status
 *     responses:
 *       200:
 *         description: All orders retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Order'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                       example: 1
 *                     totalPages:
 *                       type: integer
 *                       example: 5
 *                     totalItems:
 *                       type: integer
 *                       example: 48
 *                     hasNextPage:
 *                       type: boolean
 *                       example: true
 *                     hasPrevPage:
 *                       type: boolean
 *                       example: false
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
Router.route('/')
  .post(
    authMiddleware.isAuthorized,
    orderValidation.createOrder,
    orderController.createOrder
  )
  .get(
    authMiddleware.isAuthorized,
    rbacMiddleware.isValidPermission([userModel.USER_ROLES.MANAGER, userModel.USER_ROLES.ADMIN]),
    orderValidation.getAllOrders,
    orderController.getAllOrders
  )

/**
 * @swagger
 * /orders/{orderId}:
 *   get:
 *     tags:
 *       - Orders
 *     summary: Get order details
 *     description: |
 *       Retrieve detailed information of a specific order.
 *
 *       **Authorization:**
 *       - Users can only view their own orders
 *       - Admin/Manager can view any order
 *
 *       **Includes:**
 *       - Full shipping address details
 *       - Complete item list with prices
 *       - Payment information
 *       - Status history timestamps
 *
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Order ObjectId (24-character hex string)
 *         example: '507f1f77bcf86cd799439013'
 *     responses:
 *       200:
 *         description: Order details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *             example:
 *               _id: '507f1f77bcf86cd799439013'
 *               userId: '507f1f77bcf86cd799439010'
 *               orderCode: 'ORD123456789012'
 *               items:
 *                 - productId: '507f1f77bcf86cd799439011'
 *                   name: 'Dell XPS 13'
 *                   price: 25000000
 *                   quantity: 2
 *                   image: 'https://res.cloudinary.com/...'
 *               shippingAddress:
 *                 fullName: 'Nguyen Van A'
 *                 phone: '0987654321'
 *                 province: 'Thành phố Hồ Chí Minh'
 *                 district: 'Quận 1'
 *                 ward: 'Phường Bến Nghé'
 *                 street: '123 Lê Lợi'
 *               paymentMethod: 'cod'
 *               paymentStatus: 'unpaid'
 *               status: 'pending'
 *               total: 50000000
 *               note: ''
 *               createdAt: 1638360000000
 *               updatedAt: null
 *               pendingAt: 1638360000000
 *               confirmedAt: null
 *               shippingAt: null
 *               deliveredAt: null
 *               cancelledAt: null
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Forbidden - You do not have permission to view this order
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'You do not have permission to view this order'
 *       404:
 *         description: Order not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'Order not found'
 *
 *   put:
 *     tags:
 *       - Orders
 *     summary: Update order (Manager/Admin only)
 *     description: |
 *       Update order status and payment status. Only accessible by Manager and Admin.
 *
 *       **Status Transition Rules:**
 *       - pending → confirmed → shipping → delivered
 *       - pending/confirmed → cancelled (allowed)
 *       - shipping/delivered → cancelled (NOT allowed)
 *
 *       **Special Behaviors:**
 *       - When status changes to **delivered**: Auto-increment product purchases count
 *       - When payment changes to **paid**: Transaction is recorded
 *
 *       **Validation:**
 *       - Cannot cancel order that is already shipping or delivered
 *       - At least one field (status or paymentStatus) must be provided
 *
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Order ObjectId
 *         example: '507f1f77bcf86cd799439013'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, confirmed, shipping, delivered, cancelled]
 *                 description: New order status
 *               paymentStatus:
 *                 type: string
 *                 enum: [unpaid, paid, refunded]
 *                 description: New payment status
 *             minProperties: 1
 *           examples:
 *             confirmOrder:
 *               summary: Confirm order
 *               value:
 *                 status: 'confirmed'
 *             markPaid:
 *               summary: Mark COD as paid (when delivered)
 *               value:
 *                 paymentStatus: 'paid'
 *             startShipping:
 *               summary: Start shipping
 *               value:
 *                 status: 'shipping'
 *             delivered:
 *               summary: Mark as delivered and paid
 *               value:
 *                 status: 'delivered'
 *                 paymentStatus: 'paid'
 *             cancelOrder:
 *               summary: Cancel order (Admin)
 *               value:
 *                 status: 'cancelled'
 *     responses:
 *       200:
 *         description: Order updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'Order updated successfully'
 *                 order:
 *                   $ref: '#/components/schemas/Order'
 *       400:
 *         description: Bad request - Invalid status or payment status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *             examples:
 *               invalidStatus:
 *                 summary: Invalid order status
 *                 value:
 *                   message: 'Invalid order status'
 *               invalidPaymentStatus:
 *                 summary: Invalid payment status
 *                 value:
 *                   message: 'Invalid payment status'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         description: Order not found
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 *
 *   delete:
 *     tags:
 *       - Orders
 *     summary: Cancel order
 *     description: |
 *       Cancel an order. Users can only cancel their own orders.
 *
 *       **Cancellation Rules:**
 *       - Only **pending** or **confirmed** orders can be cancelled
 *       - Cannot cancel orders that are **shipping** or **delivered**
 *       - Product stock will be **automatically restored** upon cancellation
 *
 *       **Process:**
 *       1. Validate order ownership (user can only cancel own orders)
 *       2. Check order status (must be pending/confirmed)
 *       3. Update order status to 'cancelled'
 *       4. Restore product stock for all items
 *
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Order ObjectId
 *         example: '507f1f77bcf86cd799439013'
 *     responses:
 *       200:
 *         description: Order cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'Order cancelled successfully'
 *                 order:
 *                   $ref: '#/components/schemas/Order'
 *       400:
 *         description: Order cannot be cancelled
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *             examples:
 *               alreadyShipping:
 *                 summary: Order is already shipping
 *                 value:
 *                   message: 'Order cannot be cancelled. Only pending or confirmed orders can be cancelled.'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Forbidden - You do not have permission to cancel this order
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'You do not have permission to cancel this order'
 *       404:
 *         description: Order not found
 */
/**
 * @swagger
 * /orders/momo/callback:
 *   post:
 *     tags:
 *       - Orders
 *     summary: MoMo payment callback (IPN)
 *     description: |
 *       **Instant Payment Notification (IPN)** endpoint called by MoMo servers.
 *
 *       This is a webhook that MoMo calls to notify payment status.
 *       **DO NOT call this endpoint manually.**
 *
 *       **Process:**
 *       1. Verify signature from MoMo
 *       2. Find order by orderId/orderCode
 *       3. If payment successful (resultCode=0):
 *          - Update paymentStatus to 'paid'
 *          - Record transaction ID
 *       4. If payment failed (resultCode≠0):
 *          - Cancel order (status='cancelled')
 *          - Restore product stock
 *
 *       **Authentication:** None (public webhook, verified by signature)
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *               - resultCode
 *               - transId
 *               - signature
 *             properties:
 *               orderId:
 *                 type: string
 *                 description: Order code (not MongoDB _id)
 *                 example: 'ORD123456789012'
 *               resultCode:
 *                 type: integer
 *                 description: '0 = success, other = failed'
 *                 example: 0
 *               message:
 *                 type: string
 *                 example: 'Successful.'
 *               transId:
 *                 type: string
 *                 description: MoMo transaction ID
 *                 example: '2589632147'
 *               signature:
 *                 type: string
 *                 description: HMAC SHA256 signature for verification
 *               extraData:
 *                 type: string
 *                 description: Order ObjectId stored during payment creation
 *                 example: '507f1f77bcf86cd799439013'
 *     responses:
 *       200:
 *         description: Callback processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 resultCode:
 *                   type: integer
 *                   description: '0 = success, -1 = failed'
 *                 message:
 *                   type: string
 *             examples:
 *               success:
 *                 summary: Callback processed successfully
 *                 value:
 *                   resultCode: 0
 *                   message: 'Success'
 *               failed:
 *                 summary: Callback processing failed
 *                 value:
 *                   resultCode: -1
 *                   message: 'Invalid signature'
 */
Router.route('/momo/callback')
  .post(
    orderController.handleMoMoCallback
  )

/**
 * @swagger
 * /orders/momo/return:
 *   get:
 *     tags:
 *       - Orders
 *     summary: MoMo payment return URL
 *     description: |
 *       **Return URL** where MoMo redirects user after payment.
 *
 *       This endpoint handles user redirect from MoMo payment page.
 *       After processing, redirects user to frontend order details page.
 *
 *       **Flow:**
 *       1. MoMo redirects user to this URL with query params
 *       2. Verify signature (optional, main logic handled by IPN)
 *       3. Find order by orderId/extraData
 *       4. Redirect to frontend: `/orders/{orderId}?payment=success` or `?payment=failed`
 *
 *       **Note:** This is a safety check. Main payment logic is in IPN callback.
 *
 *       **Authentication:** None (public redirect URL)
 *
 *     parameters:
 *       - in: query
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Order code
 *         example: 'ORD123456789012'
 *       - in: query
 *         name: resultCode
 *         required: true
 *         schema:
 *           type: string
 *         description: '0 = success, other = failed'
 *         example: '0'
 *       - in: query
 *         name: transId
 *         schema:
 *           type: string
 *         description: MoMo transaction ID
 *       - in: query
 *         name: signature
 *         required: true
 *         schema:
 *           type: string
 *         description: Signature for verification
 *       - in: query
 *         name: extraData
 *         schema:
 *           type: string
 *         description: Order ObjectId
 *     responses:
 *       302:
 *         description: Redirect to frontend order page
 *         headers:
 *           Location:
 *             schema:
 *               type: string
 *             description: Frontend order details URL
 *             examples:
 *               success:
 *                 value: 'http://localhost:5173/orders/507f1f77bcf86cd799439013?payment=success'
 *               failed:
 *                 value: 'http://localhost:5173/orders/507f1f77bcf86cd799439013?payment=failed'
 */
Router.route('/momo/return')
  .get(
    orderController.handleMoMoReturn
  )

Router.route('/:orderId')
  .get(
    authMiddleware.isAuthorized,
    orderValidation.validateOrderId,
    orderController.getOrderById
  )
  .put(
    authMiddleware.isAuthorized,
    rbacMiddleware.isValidPermission([userModel.USER_ROLES.MANAGER, userModel.USER_ROLES.ADMIN]),
    orderValidation.validateOrderId,
    orderValidation.updateOrder,
    orderController.updateOrder
  )
  .delete(
    authMiddleware.isAuthorized,
    orderValidation.validateOrderId,
    orderValidation.cancelOrder,
    orderController.cancelOrder
  )

export const orderRoute = Router
