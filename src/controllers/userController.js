import { StatusCodes } from 'http-status-codes'
import { userService } from '~/services/userService'
import ApiError from '~/utils/ApiError'

/**
 * Cập nhật thông tin người dùng
 * Có thể cập nhật username, fullName, phoneNumber, avatar
 * @param {object} req.body - Thông tin cần cập nhật
 * @param {file} req.file - File ảnh avatar (từ Multer)
 * @returns {object} Thông tin người dùng đã cập nhật
 */
const updateUser = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded._id
    const userAvatarFile = req.file
    const updatedUser = await userService.updateUser(userId, req.body, userAvatarFile)

    res.status(StatusCodes.OK).json(updatedUser)
  } catch (error) { next(error) }
}

/**
 * Thêm địa chỉ giao hàng mới
 * @param {object} req.body - Thông tin địa chỉ (fullName, phoneNumber, province, district, ward, detailAddress, isDefault)
 * @returns {object} Thông tin người dùng với địa chỉ mới
 */
const addAddress = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded._id
    const updatedUser = await userService.addAddress(userId, req.body)

    res.status(StatusCodes.CREATED).json(updatedUser)
  } catch (error) { next(error) }
}

/**
 * Cập nhật địa chỉ giao hàng hiện có
 * @param {object} req.body - Thông tin địa chỉ cần cập nhật (bao gồm addressId)
 * @returns {object} Thông tin người dùng với địa chỉ đã cập nhật
 */
const updateAddress = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded._id
    const updatedUser = await userService.updateAddress(userId, req.body)
    res.status(StatusCodes.OK).json(updatedUser)
  } catch (error) { next(error) }
}

/**
 * Xóa địa chỉ giao hàng
 * @param {object} req.body - Chứa addressId cần xóa
 * @returns {object} Thông tin người dùng sau khi xóa địa chỉ
 */
const deleteAddress = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded._id
    const { addressId } = req.body

    if (!addressId) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'addressId is required')
    }

    const updatedUser = await userService.deleteAddress(userId, addressId)
    res.status(StatusCodes.OK).json(updatedUser)
  } catch (error) { next(error) }
}

/**
 * ====================
 * ADMIN CONTROLLERS - Quản lý người dùng
 * ====================
 */

/**
 * Lấy danh sách tất cả người dùng với phân trang và tìm kiếm (Admin)
 * GET /api/v1/users/admin/all
 * @param {object} req.query - Tham số (page, limit, search, role)
 * @returns {object} Danh sách người dùng và thông tin phân trang
 */
// GET /api/v1/users/admin/all - Get all users with pagination
const getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search = '', role = '' } = req.query

    const result = await userService.getAllUsers({
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      role
    })

    res.status(StatusCodes.OK).json({
      success: true,
      data: result
    })
  } catch (error) { next(error) }
}

/**
 * Lấy thông tin chi tiết người dùng (Admin)
 * GET /api/v1/users/admin/:userId
 * @param {string} req.params.userId - ID của người dùng
 * @returns {object} Thông tin chi tiết người dùng
 */
// GET /api/v1/users/admin/:userId - Get user detail
const getUserDetail = async (req, res, next) => {
  try {
    const { userId } = req.params

    const user = await userService.getUserDetailByAdmin(userId)

    res.status(StatusCodes.OK).json({
      success: true,
      data: user
    })
  } catch (error) { next(error) }
}

/**
 * Cập nhật thông tin người dùng bởi Admin
 * PUT /api/v1/users/admin/:userId
 * Admin có thể cập nhật role, isActive, và các thông tin khác
 * @param {string} req.params.userId - ID của người dùng
 * @param {object} req.body - Dữ liệu cần cập nhật
 * @returns {object} Thông tin người dùng đã cập nhật
 */
// PUT /api/v1/users/admin/:userId - Update user info by admin
const updateUserByAdmin = async (req, res, next) => {
  try {
    const { userId } = req.params

    const updatedUser = await userService.updateUserByAdmin(userId, req.body)

    res.status(StatusCodes.OK).json({
      success: true,
      data: updatedUser
    })
  } catch (error) { next(error) }
}

export const userController = {
  updateUser,
  addAddress,
  updateAddress,
  deleteAddress,
  // Admin controllers
  getAllUsers,
  getUserDetail,
  updateUserByAdmin
}