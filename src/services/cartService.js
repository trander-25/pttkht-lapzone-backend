import { cartModel } from '~/models/cartModel'
import { productModel } from '~/models/productModel'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'

/**
 * Thêm sản phẩm vào giỏ hàng
 * Quy trình:
 * 1. Kiểm tra sản phẩm có tồn tại không
 * 2. Kiểm tra số lượng tồn kho
 * 3. Lấy giỏ hiện tại để kiểm tra số lượng đã có trong giỏ
 * 4. Kiểm tra tổng số lượng (hiện có + thêm mới) không vượt quá stock
 * 5. Chuẩn bị dữ liệu item và thêm vào giỏ
 * @param {string} userId - ID người dùng
 * @param {object} reqBody - Chứa productId và quantity
 * @returns {object} Giỏ hàng đã cập nhật
 */
const addToCart = async (userId, reqBody) => {
  try {
    const { productId, quantity = 1 } = reqBody

    // Kiểm tra sản phẩm có tồn tại không
    const product = await productModel.findOneById(productId)
    if (!product) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Product not found')
    }

    // Lấy giỏ hiện tại để kiểm tra số lượng đã có
    const currentCart = await cartModel.findByUserId(userId)
    let currentQuantityInCart = 0
    
    if (currentCart && currentCart.items) {
      const existingItem = currentCart.items.find(
        item => item.productId.toString() === productId.toString()
      )
      if (existingItem) {
        currentQuantityInCart = existingItem.quantity
      }
    }

    // Kiểm tra tổng số lượng (hiện có + thêm mới) không vượt quá stock
    const totalQuantity = currentQuantityInCart + quantity
    if (totalQuantity > product.stock) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST, 
        `Cannot add ${quantity} more item(s). Only ${product.stock - currentQuantityInCart} item(s) available (you already have ${currentQuantityInCart} in cart)`
      )
    }

    // Chuẩn bị dữ liệu sản phẩm để thêm vào giỏ
    const itemData = {
      productId: product._id.toString(),
      name: product.name,
      price: product.price,
      image: product.images && product.images.length > 0 ? product.images[0] : '',
      quantity
    }

    // Thêm hoặc cập nhật số lượng item trong giỏ hàng
    const updatedCart = await cartModel.addOrUpdateItem(userId, itemData)

    return updatedCart
  } catch (error) {
    throw error
  }
}

/**
 * Lấy thông tin giỏ hàng của người dùng
 * Nếu người dùng chưa có giỏ hàng, trả về giỏ rỗng
 * Response bao gồm:
 * - items: Array sản phẩm
 * - selectedAmount: Tổng tiền items đã chọn (selected=true)
 * @param {string} userId - ID người dùng
 * @returns {object} Giỏ hàng với items, selectedAmount
 */
const getCart = async (userId) => {
  try {
    const cart = await cartModel.getCart(userId)

    // Trả về giỏ hàng rỗng nếu người dùng chưa có giỏ
    if (!cart) {
      return {
        items: [],
        selectedAmount: 0
      }
    }

    return cart
  } catch (error) {
    throw error
  }
}

/**
 * Cập nhật thông tin sản phẩm trong giỏ hàng
 * Có thể cập nhật:
 * - quantity: Số lượng sản phẩm (kiểm tra stock trước khi cập nhật)
 * - selected: Trạng thái chọn để checkout
 * Tự động tính lại selectedAmount sau khi cập nhật
 * Lưu ý: Phải có ít nhất 1 field để cập nhật
 * @param {string} userId - ID người dùng
 * @param {string} productId - ID sản phẩm cần cập nhật
 * @param {object} reqBody - Chứa quantity hoặc selected
 * @returns {object} Giỏ hàng đã cập nhật
 */
const updateCartItem = async (userId, productId, reqBody) => {
  try {
    const { quantity, selected } = reqBody

    // Xác thực rằng ít nhất một trường được cung cấp
    if (quantity === undefined && selected === undefined) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'At least one field (quantity or selected) is required')
    }

    // Nếu cập nhật quantity, kiểm tra stock
    if (quantity !== undefined) {
      const product = await productModel.findOneById(productId)
      if (!product) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Product not found')
      }

      // Kiểm tra số lượng mới không vượt quá stock
      if (quantity > product.stock) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          `Cannot update quantity to ${quantity}. Only ${product.stock} item(s) available in stock`
        )
      }
    }

    // Chuẩn bị dữ liệu cập nhật
    const updateData = {}
    if (quantity !== undefined) updateData.quantity = quantity
    if (selected !== undefined) updateData.selected = selected

    // Cập nhật item trong giỏ hàng
    const updatedCart = await cartModel.updateItem(userId, productId, updateData)

    return updatedCart
  } catch (error) {
    throw error
  }
}

/**
 * Xóa một sản phẩm khỏi giỏ hàng
 * Tự động tính lại selectedAmount
 * @param {string} userId - ID người dùng
 * @param {string} productId - ID sản phẩm cần xóa
 * @returns {object} Giỏ hàng sau khi xóa
 */
const deleteCartItem = async (userId, productId) => {
  try {
    // Xóa item khỏi giỏ hàng
    const updatedCart = await cartModel.deleteItem(userId, productId)

    return updatedCart
  } catch (error) {
    throw error
  }
}

/**
 * Xóa tất cả các sản phẩm đã chọn khỏi giỏ hàng
 * Sử dụng khi người dùng muốn xóa nhiều item cùng lúc (selected=true)
 * Tự động tính lại selectedAmount
 * @param {string} userId - ID người dùng
 * @returns {object} Giỏ hàng sau khi xóa các item đã chọn
 */
const deleteSelectedCartItems = async (userId) => {
  try {
    // Xóa tất cả các item đã chọn khỏi giỏ hàng
    const updatedCart = await cartModel.deleteSelectedItems(userId)

    return updatedCart
  } catch (error) {
    throw error
  }
}

/**
 * Kiểm tra tình trạng tồn kho của các sản phẩm trong giỏ hàng
 * Gúp ngăn ngừa trải nghiệm không tốt khi người dùng đến checkout mà sản phẩm hết hàng
 * Kiểm tra 3 vấn đề:
 * 1. UNAVAILABLE: Sản phẩm không còn tồn tại (bị xóa)
 * 2. INSUFFICIENT_STOCK: Số lượng tồn kho không đủ
 * 3. PRICE_CHANGED: Giá sản phẩm đã thay đổi
 * @param {string} userId - ID người dùng
 * @returns {object} Kết quả kiểm tra (valid: boolean, issues: array)
 */
const validateCartStock = async (userId) => {
  try {
    const cart = await cartModel.getCart(userId)

    // Giỏ hàng rỗng là hợp lệ
    if (!cart || !cart.items || cart.items.length === 0) {
      return {
        valid: true,
        issues: []
      }
    }

    const issues = []

    // Kiểm tra từng item trong giỏ hàng
    for (const item of cart.items) {
      const product = await productModel.findOneById(item.productId)

      // Sản phẩm không còn tồn tại
      if (!product) {
        issues.push({
          productId: item.productId,
          productName: item.name,
          issue: 'UNAVAILABLE',
          message: 'Product is no longer available'
        })
        continue
      }

      // Số lượng tồn kho không đủ
      if (product.stock < item.quantity) {
        issues.push({
          productId: item.productId,
          productName: item.name,
          issue: 'INSUFFICIENT_STOCK',
          requestedQty: item.quantity,
          availableQty: product.stock,
          message: `Only ${product.stock} item${product.stock !== 1 ? 's' : ''} left in stock`
        })
      }

      // Giá đã thay đổi
      if (product.price !== item.price) {
        issues.push({
          productId: item.productId,
          productName: item.name,
          issue: 'PRICE_CHANGED',
          oldPrice: item.price,
          newPrice: product.price,
          message: `Price changed from ${item.price.toLocaleString('vi-VN')}₫ to ${product.price.toLocaleString('vi-VN')}₫`
        })
      }
    }

    return {
      valid: issues.length === 0,
      issues
    }
  } catch (error) {
    throw error
  }
}

export const cartService = {
  addToCart,
  getCart,
  updateCartItem,
  deleteCartItem,
  deleteSelectedCartItems,
  validateCartStock
}
