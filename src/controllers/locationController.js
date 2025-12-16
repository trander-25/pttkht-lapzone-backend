import { StatusCodes } from 'http-status-codes'
import { locationService } from '~/services/locationService'

/**
 * Lấy danh sách tất cả các tỉnh/thành phố Việt Nam
 * Sử dụng cho form nhập địa chỉ giao hàng
 * @returns {array} Danh sách tỉnh/thành phố
 */
const getProvinces = async (req, res, next) => {
  try {
    const provinces = await locationService.getProvinces()

    res.status(StatusCodes.OK).json(provinces)
  } catch (error) {
    next(error)
  }
}

/**
 * Lấy danh sách quận/huyện theo tỉnh
 * @param {string} req.params.provinceId - ID của tỉnh/thành phố
 * @returns {array} Danh sách quận/huyện thuộc tỉnh đó
 */
const getDistricts = async (req, res, next) => {
  try {
    const { provinceId } = req.params

    const districts = await locationService.getDistricts(provinceId)

    res.status(StatusCodes.OK).json(districts)
  } catch (error) {
    next(error)
  }
}

/**
 * Lấy danh sách phường/xã theo quận/huyện
 * @param {string} req.params.districtId - ID của quận/huyện
 * @returns {array} Danh sách phường/xã thuộc quận/huyện đó
 */
const getWards = async (req, res, next) => {
  try {
    const { districtId } = req.params

    const wards = await locationService.getWards(districtId)

    res.status(StatusCodes.OK).json(wards)
  } catch (error) {
    next(error)
  }
}

export const locationController = {
  getProvinces,
  getDistricts,
  getWards
}
