import express from 'express'
import { cartController } from '~/controllers/cartController'
import { cartValidation } from '~/validations/cartValidation'
import { authMiddleware } from '~/middlewares/authMiddleware'

const Router = express.Router()

/**
 * @swagger
 * /cart:
 *   get:
 *     tags:
 *       - Cart
 *     summary: Get user's shopping cart
 *     description: Retrieve the current user's shopping cart with all items, total amount, and selected amount
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Cart retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                   example: 507f1f77bcf86cd799439011
 *                 userId:
 *                   type: string
 *                   example: 507f1f77bcf86cd799439012
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       productId:
 *                         type: string
 *                         example: 507f1f77bcf86cd799439013
 *                       name:
 *                         type: string
 *                         example: Dell XPS 15
 *                       price:
 *                         type: number
 *                         example: 29999000
 *                       image:
 *                         type: string
 *                         example: https://example.com/image.jpg
 *                       quantity:
 *                         type: integer
 *                         example: 2
 *                       selected:
 *                         type: boolean
 *                         example: true
 *                 totalAmount:
 *                   type: number
 *                   description: Total amount of all selected items
 *                   example: 59998000
 *                 selectedAmount:
 *                   type: number
 *                   description: Total amount of selected items
 *                   example: 59998000
 *                 updatedAt:
 *                   type: number
 *                   description: Unix timestamp in milliseconds
 *                   example: 1699999999999
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
Router.route('/')
  .get(
    authMiddleware.isAuthorized,
    cartController.getCart
  )

/**
 * @swagger
 * /cart/items:
 *   post:
 *     tags:
 *       - Cart
 *     summary: Add product to cart
 *     description: Add a product to the shopping cart. If product already exists, increase quantity. Creates new cart if user doesn't have one.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *             properties:
 *               productId:
 *                 type: string
 *                 description: Product ObjectId
 *                 example: 507f1f77bcf86cd799439011
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *                 default: 1
 *                 description: Quantity to add
 *                 example: 2
 *     responses:
 *       200:
 *         description: Product added to cart successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 userId:
 *                   type: string
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                 totalAmount:
 *                   type: number
 *                 selectedAmount:
 *                   type: number
 *       400:
 *         description: Insufficient stock or invalid request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               outOfStock:
 *                 value:
 *                   statusCode: 400
 *                   message: Only 5 items available in stock
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               statusCode: 404
 *               message: Product not found
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 *
 *   delete:
 *     tags:
 *       - Cart
 *     summary: Delete selected items from cart
 *     description: Remove all items that have been selected (selected=true) from the shopping cart
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Selected items deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 userId:
 *                   type: string
 *                 items:
 *                   type: array
 *                   description: Remaining items in cart
 *                   items:
 *                     type: object
 *                 totalAmount:
 *                   type: number
 *                 selectedAmount:
 *                   type: number
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Cart not found
 */
Router.route('/items')
  .post(
    authMiddleware.isAuthorized,
    cartValidation.addToCart,
    cartController.addToCart
  )
  .delete(
    authMiddleware.isAuthorized,
    cartController.deleteSelectedCartItems
  )

/**
 * @swagger
 * /cart/items/{productId}:
 *   put:
 *     tags:
 *       - Cart
 *     summary: Update cart item
 *     description: Update quantity or selection status of a cart item. At least one field (quantity or selected) is required.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ObjectId in the cart
 *         example: 507f1f77bcf86cd799439011
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *                 description: New quantity for the item
 *                 example: 3
 *               selected:
 *                 type: boolean
 *                 description: Whether item is selected for checkout
 *                 example: true
 *             anyOf:
 *               - required: [quantity]
 *               - required: [selected]
 *           examples:
 *             updateQuantity:
 *               summary: Update quantity only
 *               value:
 *                 quantity: 5
 *             updateSelection:
 *               summary: Update selection only
 *               value:
 *                 selected: true
 *             updateBoth:
 *               summary: Update both fields
 *               value:
 *                 quantity: 3
 *                 selected: true
 *     responses:
 *       200:
 *         description: Cart item updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 userId:
 *                   type: string
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                 totalAmount:
 *                   type: number
 *                 selectedAmount:
 *                   type: number
 *       400:
 *         description: At least one field is required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               statusCode: 400
 *               message: At least one field (quantity or selected) is required
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Cart or product not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               cartNotFound:
 *                 value:
 *                   statusCode: 404
 *                   message: Cart not found
 *               productNotFound:
 *                 value:
 *                   statusCode: 404
 *                   message: Product not found in cart
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 *
 *   delete:
 *     tags:
 *       - Cart
 *     summary: Delete specific item from cart
 *     description: Remove a specific product from the shopping cart by productId
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ObjectId to remove from cart
 *         example: 507f1f77bcf86cd799439011
 *     responses:
 *       200:
 *         description: Item deleted from cart successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 userId:
 *                   type: string
 *                 items:
 *                   type: array
 *                   description: Remaining items in cart
 *                   items:
 *                     type: object
 *                 totalAmount:
 *                   type: number
 *                 selectedAmount:
 *                   type: number
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Cart or product not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               cartNotFound:
 *                 value:
 *                   statusCode: 404
 *                   message: Cart not found
 *               productNotFound:
 *                 value:
 *                   statusCode: 404
 *                   message: Product not found in cart
 */
Router.route('/items/:productId')
  .put(
    authMiddleware.isAuthorized,
    cartValidation.updateCartItem,
    cartController.updateCartItem
  )
  .delete(
    authMiddleware.isAuthorized,
    cartController.deleteCartItem
  )

/**
 * @swagger
 * /cart/validate:
 *   get:
 *     tags:
 *       - Cart
 *     summary: Validate cart stock before checkout
 *     description: Check if all cart items are still available and have sufficient stock. Useful to call before proceeding to checkout page.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Cart validation result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                   description: Whether all cart items are valid (available with sufficient stock)
 *                   example: false
 *                 issues:
 *                   type: array
 *                   description: List of issues found with cart items
 *                   items:
 *                     type: object
 *                     properties:
 *                       productId:
 *                         type: string
 *                         example: 507f1f77bcf86cd799439011
 *                       productName:
 *                         type: string
 *                         example: Laptop Dell XPS 15
 *                       issue:
 *                         type: string
 *                         enum: [UNAVAILABLE, INSUFFICIENT_STOCK, PRICE_CHANGED]
 *                         example: INSUFFICIENT_STOCK
 *                       requestedQty:
 *                         type: number
 *                         example: 5
 *                       availableQty:
 *                         type: number
 *                         example: 2
 *                       oldPrice:
 *                         type: number
 *                         example: 25000000
 *                       newPrice:
 *                         type: number
 *                         example: 27000000
 *                       message:
 *                         type: string
 *                         example: Only 2 items left in stock
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
Router.get('/validate',
  authMiddleware.isAuthorized,
  cartController.validateCartStock
)

export const cartRoute = Router
