import { locationModel } from '~/models/locationModel'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'

/**
 * Lấy danh sách tất cả các tỉnh/thành phố Việt Nam
 * Sử dụng cho dropdown chọn địa chỉ giao hàng
 * @returns {array} Danh sách các tỉnh/thành phố
 */
const getProvinces = async () => {
  try {
    const provinces = await locationModel.getProvinces()
    return provinces
  } catch (error) {
    throw error
  }
}

/**
 * Lấy danh sách quận/huyện theo mã tỉnh
 * @param {string} provinceCode - Mã tỉnh/thành phố
 * @returns {array} Danh sách các quận/huyện thuộc tỉnh đó
 */
const getDistricts = async (provinceCode) => {
  try {
    if (!provinceCode) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Province code is required')
    }

    const districts = await locationModel.getDistrictsByProvinceCode(provinceCode)

    if (!districts) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Province not found')
    }

    return districts
  } catch (error) {
    throw error
  }
}

/**
 * Lấy danh sách phường/xã theo mã quận/huyện
 * @param {string} districtCode - Mã quận/huyện
 * @returns {array} Danh sách các phường/xã thuộc quận/huyện đó
 */
const getWards = async (districtCode) => {
  try {
    if (!districtCode) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'District code is required')
    }

    const wards = await locationModel.getWardsByDistrictCode(districtCode)

    if (!wards) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'District not found')
    }

    return wards
  } catch (error) {
    throw error
  }
}

export const locationService = {
  getProvinces,
  getDistricts,
  getWards
}
