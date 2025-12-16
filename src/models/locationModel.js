/**
 * LOCATIONMODEL.JS - MODEL LẤY DỮ LIỆU ĐỊA CHỈ VIỆT NAM
 *
 * Sử dụng API: https://provinces.open-api.vn/api
 * Có cơ chế retry và cache để đối phó với API timeout
 *
 * Chức năng:
 * - getProvinces(): Lấy danh sách tỉnh/thành phố
 * - getDistrictsByProvinceCode(): Lấy danh sách quận/huyện theo mã tỉnh
 * - getWardsByDistrictCode(): Lấy danh sách phường/xã theo mã quận
 *
 * Dùng cho chức năng: User nhập địa chỉ giao hàng (addresses)
 */

import axios from 'axios'
import https from 'https'
import { env } from '~/config/environment'
import fs from 'fs'
import path from 'path'

const PROVINCES_API_URL = 'https://provinces.open-api.vn/api/v1'

// Simple in-memory cache (TTL: 24 hours)
const cache = {
  provinces: { data: null, timestamp: null },
  districts: new Map(),
  wards: new Map()
}
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

// Tạo axios instance với timeout hợp lý - 15s cho mỗi request
const axiosInstance = axios.create({
  timeout: 15000, // 15 seconds cho mỗi lần gọi API
  httpsAgent: new https.Agent({
    rejectUnauthorized: env.BUILD_MODE !== 'dev',
    keepAlive: true
  })
})

// Load dữ liệu địa chỉ Việt Nam từ file local (DATA CHÍNH)
let vietnamLocationData = null
try {
  const dataPath = path.join(process.cwd(), 'src', 'data', 'vietnamLocation.json')
  vietnamLocationData = JSON.parse(fs.readFileSync(dataPath, 'utf8'))
  console.log('✅ Loaded Vietnam location data from local file')
} catch (error) {
  console.error('Could not load vietnamLocation.json:', error.message)
  console.warn('Will use external API as fallback')
}

/**
 * Retry wrapper for API calls với chiến lược fail-fast
 * @param {Function} fn - Async function to retry
 * @param {number} retries - Number of retry attempts (tối đa 2 lần retry)
 * @param {number} delay - Delay between retries (ms)
 * @returns {Promise} Result from function
 */
const retryRequest = async (fn, retries = 2, delay = 1000) => {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn()
    } catch (error) {
      const isLastAttempt = i === retries
      const isTimeout = error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED'
      
      if (isLastAttempt || !isTimeout) {
        throw error
      }
      
      // Wait trước khi retry (tăng dần delay)
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)))
    }
  }
}

/**
 * Check if cached data is still valid
 * @param {number} timestamp - Cache timestamp
 * @returns {boolean} Is cache valid
 */
const isCacheValid = (timestamp) => {
  if (!timestamp) return false
  return Date.now() - timestamp < CACHE_TTL
}

/**
 * Lấy danh sách tất cả tỉnh/thành phố Việt Nam
 * ƯU TIÊN sử dụng dữ liệu từ file local, chỉ fallback sang API khi cần
 * @returns {Promise<Array>} Array các tỉnh/thành phố
 */
const getProvinces = async () => {
  try {
    // Check cache first
    if (cache.provinces.data && isCacheValid(cache.provinces.timestamp)) {
      return cache.provinces.data
    }

    // ƯU TIÊN: Dùng dữ liệu từ file local
    if (vietnamLocationData) {
      // Transform data để trả về format giống API
      const provinces = vietnamLocationData.map(province => ({
        name: province.name,
        code: province.code,
        codename: province.codename,
        division_type: province.division_type,
        phone_code: province.phone_code
      }))

      // Cache data
      cache.provinces = {
        data: provinces,
        timestamp: Date.now()
      }

      return provinces
    }

    // FALLBACK: Nếu không có file local, mới gọi API
    console.warn('Local data not available, falling back to external API')
    const response = await retryRequest(async () => {
      return await axiosInstance.get(`${PROVINCES_API_URL}/p/`)
    })

    cache.provinces = {
      data: response.data,
      timestamp: Date.now()
    }

    return response.data
  } catch (error) {
    // Nếu có cache cũ, dùng nó
    if (cache.provinces.data) {
      console.warn('Error fetching provinces, using old cache')
      return cache.provinces.data
    }

    const errorDetails = {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      endpoint: 'provinces (local file or API)'
    }
    throw new Error(`Failed to fetch provinces: ${JSON.stringify(errorDetails)}`)
  }
}

/**
 * Lấy danh sách quận/huyện theo mã tỉnh
 * ƯU TIÊN sử dụng dữ liệu từ file local, chỉ fallback sang API khi cần
 * @param {string} provinceCode - Mã tỉnh (VD: "1" cho Hà Nội, "79" cho TP.HCM)
 * @returns {Promise<Array|null>} Array các quận/huyện
 */
const getDistrictsByProvinceCode = async (provinceCode) => {
  try {
    const cacheKey = provinceCode
    const cachedData = cache.districts.get(cacheKey)
    
    // Check cache first
    if (cachedData && isCacheValid(cachedData.timestamp)) {
      return cachedData.data
    }

    // ƯU TIÊN: Dùng dữ liệu từ file local
    if (vietnamLocationData) {
      const province = vietnamLocationData.find(p => p.code === parseInt(provinceCode))
      
      if (!province) {
        return null
      }

      const districts = province.districts.map(district => ({
        name: district.name,
        code: district.code,
        codename: district.codename,
        division_type: district.division_type,
        short_codename: district.short_codename,
        province_code: province.code
      }))

      // Cache data
      cache.districts.set(cacheKey, {
        data: districts,
        timestamp: Date.now()
      })

      return districts
    }

    // FALLBACK: Nếu không có file local, mới gọi API
    console.warn(`⚠️ Local data not available for province ${provinceCode}, falling back to external API`)
    const response = await retryRequest(async () => {
      return await axiosInstance.get(`${PROVINCES_API_URL}/p/${provinceCode}?depth=2`)
    })

    if (!response.data) {
      return null
    }

    const districts = response.data.districts

    cache.districts.set(cacheKey, {
      data: districts,
      timestamp: Date.now()
    })

    return districts
  } catch (error) {
    // Nếu có cache cũ, dùng nó
    const cachedData = cache.districts.get(provinceCode)
    if (cachedData) {
      console.warn(`⚠️ Error fetching districts for province ${provinceCode}, using old cache`)
      return cachedData.data
    }

    const errorDetails = {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      provinceCode,
      endpoint: `districts for province ${provinceCode} (local file or API)`
    }
    throw new Error(`Failed to fetch districts: ${JSON.stringify(errorDetails)}`)
  }
}

/**
 * Lấy danh sách phường/xã theo mã quận/huyện
 * ƯU TIÊN sử dụng dữ liệu từ file local, chỉ fallback sang API khi cần
 * @param {string} districtCode - Mã quận/huyện
 * @returns {Promise<Array|null>} Array các phường/xã
 */
const getWardsByDistrictCode = async (districtCode) => {
  try {
    const cacheKey = districtCode
    const cachedData = cache.wards.get(cacheKey)
    
    // Check cache first
    if (cachedData && isCacheValid(cachedData.timestamp)) {
      return cachedData.data
    }

    // ƯU TIÊN: Dùng dữ liệu từ file local
    if (vietnamLocationData) {
      // Tìm district trong tất cả các tỉnh
      let foundDistrict = null
      for (const province of vietnamLocationData) {
        const district = province.districts.find(d => d.code === parseInt(districtCode))
        if (district) {
          foundDistrict = district
          break
        }
      }

      if (!foundDistrict) {
        return null
      }

      const wards = foundDistrict.wards.map(ward => ({
        name: ward.name,
        code: ward.code,
        codename: ward.codename,
        division_type: ward.division_type,
        short_codename: ward.short_codename,
        district_code: foundDistrict.code
      }))

      // Cache data
      cache.wards.set(cacheKey, {
        data: wards,
        timestamp: Date.now()
      })

      return wards
    }

    // FALLBACK: Nếu không có file local, mới gọi API
    console.warn(`Local data not available for district ${districtCode}, falling back to external API`)
    const response = await retryRequest(async () => {
      return await axiosInstance.get(`${PROVINCES_API_URL}/d/${districtCode}?depth=2`)
    })

    if (!response.data) {
      return null
    }

    const wards = response.data.wards

    cache.wards.set(cacheKey, {
      data: wards,
      timestamp: Date.now()
    })

    return wards
  } catch (error) {
    // Nếu có cache cũ, dùng nó
    const cachedData = cache.wards.get(districtCode)
    if (cachedData) {
      console.warn(`Error fetching wards for district ${districtCode}, using old cache`)
      return cachedData.data
    }

    const errorDetails = {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      districtCode,
      endpoint: `wards for district ${districtCode} (local file or API)`
    }
    throw new Error(`Failed to fetch wards: ${JSON.stringify(errorDetails)}`)
  }
}

/**
 * Preload provinces vào cache khi server khởi động
 * Sử dụng dữ liệu local, không cần gọi API
 */
const warmupCache = async () => {
  try {
    console.log('Warming up location cache from local data...')
    await getProvinces()
    console.log('Location cache warmed up successfully')
  } catch (error) {
    console.warn('Failed to warmup location cache:', error.message)
  }
}

// Tự động warmup cache khi module được load
warmupCache()

export const locationModel = {
  getProvinces,
  getDistrictsByProvinceCode,
  getWardsByDistrictCode,
  warmupCache
}
