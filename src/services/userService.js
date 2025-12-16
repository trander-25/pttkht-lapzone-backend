import { userModel } from '~/models/userModel'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import bcryptjs from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import { pickUser } from '~/utils/formatters'
import { ObjectId } from 'mongodb'
import { WEBSITE_DOMAIN } from '~/utils/constants'
import { env } from '~/config/environment'
import { JwtProvider } from '~/providers/JwtProvider'
import { CloudinaryProvider } from '~/providers/CloudinaryProvider'

/**
 * Cập nhật thông tin người dùng
 * Hỗ trợ 3 loại cập nhật:
 * 1. Upload avatar lên Cloudinary
 * 2. Cập nhật danh sách địa chỉ (với logic xử lý địa chỉ mặc định)
 * 3. Cập nhật thông tin cá nhân (username, fullName, phoneNumber, etc.)
 * @param {string} userId - ID người dùng
 * @param {object} reqBody - Dữ liệu cần cập nhật
 * @param {file} userAvatarFile - File avatar (từ Multer)
 * @returns {object} Thông tin người dùng đã cập nhật
 */
const updateUser = async (userId, reqBody, userAvatarFile) => {
  try {
    // Xác minh người dùng tồn tại và tài khoản đang active
    const existUser = await userModel.findOneById(userId)
    if (!existUser) throw new ApiError(StatusCodes.NOT_FOUND, 'Account not found!')
    if (!existUser.isActive) throw new ApiError(StatusCodes.NOT_ACCEPTABLE, 'Your account is not active!')

    // Khởi tạo biến cho kết quả cập nhật
    let updatedUser = {}

    // Xử lý upload avatar
    if (userAvatarFile) {
      // Upload avatar lên Cloudinary cloud storage
      const uploadResult = await CloudinaryProvider.streamUpload(userAvatarFile.buffer, 'user_avatars')

      // Lưu URL an toàn của ảnh đã upload vào database
      updatedUser = await userModel.updateOneById(existUser._id, {
        avatar: uploadResult.secure_url
      })
    } else if (reqBody.addresses) {
      // Xử lý cập nhật địa chỉ với logic xử lý địa chỉ mặc định
      let processedAddresses = [...reqBody.addresses]

      // Tìm xem có địa chỉ nào được đánh dấu là mặc định không
      const newDefaultIndex = processedAddresses.findIndex(addr => addr.isDefault === true)

      if (newDefaultIndex !== -1) {
        // Nếu có địa chỉ mặc định mới, set tất cả các địa chỉ khác thành false
        processedAddresses = processedAddresses.map((addr, index) => ({
          ...addr,
          isDefault: index === newDefaultIndex
        }))
      } else {
        // Nếu không có địa chỉ nào được đánh dấu mặc định, giữ nguyên hoặc set địa chỉ đầu tiên làm mặc định
        const hasAnyDefault = processedAddresses.some(addr => addr.isDefault)
        if (!hasAnyDefault && processedAddresses.length > 0) {
          processedAddresses[0].isDefault = true
        }
      }

      updatedUser = await userModel.updateOneById(existUser._id, {
        addresses: processedAddresses
      })
    } else {
      // Xử lý cập nhật thông tin cá nhân chung
      updatedUser = await userModel.updateOneById(existUser._id, reqBody)
    }

    return pickUser(updatedUser)
  } catch (error) { throw error }
}

/**
 * Thêm địa chỉ giao hàng mới
 * Logic:
 * - Tự động tạo addressId duy nhất
 * - Nếu địa chỉ mới được đánh dấu isDefault=true: Set tất cả địa chỉ khác thành non-default
 * - Nếu là địa chỉ đầu tiên: Tự động set làm default
 * @param {string} userId - ID người dùng
 * @param {object} newAddress - Thông tin địa chỉ mới
 * @returns {object} Thông tin người dùng với địa chỉ mới
 */
const addAddress = async (userId, newAddress) => {
  try {
    const existUser = await userModel.findOneById(userId)
    if (!existUser) throw new ApiError(StatusCodes.NOT_FOUND, 'Account not found!')
    if (!existUser.isActive) throw new ApiError(StatusCodes.NOT_ACCEPTABLE, 'Your account is not active!')

    const currentAddresses = existUser.addresses || []

    // Tạo addressId cho địa chỉ mới
    newAddress.addressId = new ObjectId().toString()

    // Nếu địa chỉ mới được đánh dấu là default
    if (newAddress.isDefault) {
      // Set tất cả địa chỉ hiện tại thành non-default
      currentAddresses.forEach(addr => {
        addr.isDefault = false
      })
    } else if (currentAddresses.length === 0) {
      // Nếu đây là địa chỉ đầu tiên, tự động set làm default
      newAddress.isDefault = true
    }

    // Thêm địa chỉ mới vào cuối mảng
    const updatedAddresses = [...currentAddresses, newAddress]

    const updatedUser = await userModel.updateOneById(userId, {
      addresses: updatedAddresses
    })

    return pickUser(updatedUser)
  } catch (error) { throw error }
}

/**
 * Cập nhật địa chỉ giao hàng hiện có
 * Logic phức tạp:
 * - Nếu cập nhật isDefault=true: Phải set tất cả địa chỉ khác thành non-default
 * - Nếu cập nhật thông tin bình thường: Merge dữ liệu cũ với dữ liệu mới
 * @param {string} userId - ID người dùng
 * @param {object} param - { addressId, ...updateData }
 * @returns {object} Thông tin người dùng đã cập nhật
 */
const updateAddress = async (userId, { addressId, ...updateData }) => {
  try {
    const existUser = await userModel.findOneById(userId)
    if (!existUser) throw new ApiError(StatusCodes.NOT_FOUND, 'Account not found!')
    if (!existUser.isActive) throw new ApiError(StatusCodes.NOT_ACCEPTABLE, 'Your account is not active!')

    // Kiểm tra xem địa chỉ có tồn tại không
    const addressExists = existUser.addresses?.find(addr => addr.addressId === addressId)
    if (!addressExists) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Address not found!')
    }

    // Nếu cập nhật isDefault = true, cần xử lý logic default cho toàn bộ mảng
    if (updateData.isDefault === true) {
      // Set tất cả địa chỉ khác thành non-default, chỉ địa chỉ được cập nhật là default
      const updatedAddresses = existUser.addresses.map(addr => ({
        ...addr,
        // Nếu là địa chỉ đang được cập nhật, merge với updateData và set isDefault = true
        ...(addr.addressId === addressId ? updateData : {}),
        isDefault: addr.addressId === addressId
      }))

      const updatedUser = await userModel.updateOneById(userId, {
        addresses: updatedAddresses
      })
      return pickUser(updatedUser)
    } else {
      // Trường hợp cập nhật thông tin bình thường (không thay đổi default)
      // Merge dữ liệu cũ với dữ liệu mới
      const mergedAddressData = {
        ...addressExists,
        ...updateData,
        addressId // Đảm bảo addressId không bị thay đổi
      }

      const updatedUser = await userModel.updateAddressById(userId, addressId, mergedAddressData)
      return pickUser(updatedUser)
    }
  } catch (error) { throw error }
}

/**
 * Xóa địa chỉ giao hàng
 * Kiểm tra địa chỉ tồn tại trước khi xóa
 * @param {string} userId - ID người dùng
 * @param {string} addressId - ID địa chỉ cần xóa
 * @returns {object} Thông tin người dùng sau khi xóa địa chỉ
 */
const deleteAddress = async (userId, addressId) => {
  try {
    const existUser = await userModel.findOneById(userId)
    if (!existUser) throw new ApiError(StatusCodes.NOT_FOUND, 'Account not found!')
    if (!existUser.isActive) throw new ApiError(StatusCodes.NOT_ACCEPTABLE, 'Your account is not active!')

    // Kiểm tra xem địa chỉ có tồn tại không
    const addressToDelete = existUser.addresses?.find(addr => addr.addressId === addressId)
    if (!addressToDelete) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Address not found!')
    }

    const updatedUser = await userModel.deleteAddressById(userId, addressId)

    // Nếu xóa địa chỉ mặc định và còn địa chỉ khác, set địa chỉ đầu tiên làm mặc định
    if (addressToDelete.isDefault && updatedUser.addresses?.length > 0) {
      const updatedAddresses = updatedUser.addresses.map((addr, index) => ({
        ...addr,
        isDefault: index === 0
      }))

      const finalUser = await userModel.updateOneById(userId, {
        addresses: updatedAddresses
      })
      return pickUser(finalUser)
    }

    return pickUser(updatedUser)
  } catch (error) { throw error }
}

/**
 * ADMIN SERVICES - User Management
 */

// Get all users with pagination and filters
const getAllUsers = async ({ page = 1, limit = 20, search = '', role = '' }) => {
  try {
    const result = await userModel.findAllWithPagination({ page, limit, search, role })

    // Remove sensitive fields from users
    const sanitizedUsers = result.users.map(user => pickUser(user))

    return {
      users: sanitizedUsers,
      pagination: result.pagination
    }
  } catch (error) { throw error }
}

// Get user detail by ID (for admin)
const getUserDetailByAdmin = async (userId) => {
  try {
    const user = await userModel.findOneById(userId)

    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'User not found!')
    }

    return pickUser(user)
  } catch (error) { throw error }
}

// Update user by admin (can update more fields than regular user, including role)
const updateUserByAdmin = async (userId, updateData) => {
  try {
    const existUser = await userModel.findOneById(userId)

    if (!existUser) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'User not found!')
    }

    // Admin can update most fields except password (use separate endpoint)
    const allowedFields = ['username', 'phone', 'sex', 'isActive', 'addresses', 'role']
    const filteredData = {}

    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredData[key] = updateData[key]
      }
    })

    // Validate role if provided
    if (filteredData.role && !Object.values(userModel.USER_ROLES).includes(filteredData.role)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid role!')
    }

    const updatedUser = await userModel.updateOneById(userId, filteredData)

    return pickUser(updatedUser)
  } catch (error) { throw error }
}

export const userService = {
  updateUser,
  addAddress,
  updateAddress,
  deleteAddress,
  // Admin services
  getAllUsers,
  getUserDetailByAdmin,
  updateUserByAdmin
}