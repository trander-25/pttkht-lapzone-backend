import express from 'express'
import { locationController } from '~/controllers/locationController'
import { locationValidation } from '~/validations/locationValidation'

const Router = express.Router()

/**
 * @swagger
 * /locations/provinces:
 *   get:
 *     tags:
 *       - Locations
 *     summary: Get all provinces
 *     description: Retrieve list of all provinces/cities in Vietnam. Public endpoint.
 *     responses:
 *       200:
 *         description: Provinces retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   code:
 *                     type: integer
 *                     example: 1
 *                   name:
 *                     type: string
 *                     example: 'Thành phố Hà Nội'
 *                   name_en:
 *                     type: string
 *                     example: 'Ha Noi'
 *                   full_name:
 *                     type: string
 *                     example: 'Thành phố Hà Nội'
 *                   full_name_en:
 *                     type: string
 *                     example: 'Ha Noi City'
 *                   code_name:
 *                     type: string
 *                     example: 'ha_noi'
 */
// Get all provinces
Router.route('/provinces')
  .get(locationController.getProvinces)

/**
 * @swagger
 * /locations/districts/{provinceId}:
 *   get:
 *     tags:
 *       - Locations
 *     summary: Get districts by province
 *     description: Retrieve list of districts/counties in a specific province. Public endpoint.
 *     parameters:
 *       - in: path
 *         name: provinceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Province code
 *         example: 1
 *     responses:
 *       200:
 *         description: Districts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   code:
 *                     type: integer
 *                     example: 1
 *                   name:
 *                     type: string
 *                     example: 'Quận Ba Đình'
 *                   name_en:
 *                     type: string
 *                     example: 'Ba Dinh'
 *                   full_name:
 *                     type: string
 *                     example: 'Quận Ba Đình'
 *                   full_name_en:
 *                     type: string
 *                     example: 'Ba Dinh District'
 *                   code_name:
 *                     type: string
 *                     example: 'ba_dinh'
 *       400:
 *         description: Province code is required
 *       404:
 *         description: Province not found
 */
// Get districts by province code
Router.route('/districts/:provinceId')
  .get(
    locationValidation.getDistricts,
    locationController.getDistricts
  )

/**
 * @swagger
 * /locations/wards/{districtId}:
 *   get:
 *     tags:
 *       - Locations
 *     summary: Get wards by district
 *     description: Retrieve list of wards/communes in a specific district. Public endpoint.
 *     parameters:
 *       - in: path
 *         name: districtId
 *         required: true
 *         schema:
 *           type: integer
 *         description: District code
 *         example: 1
 *     responses:
 *       200:
 *         description: Wards retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   code:
 *                     type: integer
 *                     example: 1
 *                   name:
 *                     type: string
 *                     example: 'Phường Phúc Xá'
 *                   name_en:
 *                     type: string
 *                     example: 'Phuc Xa'
 *                   full_name:
 *                     type: string
 *                     example: 'Phường Phúc Xá'
 *                   full_name_en:
 *                     type: string
 *                     example: 'Phuc Xa Ward'
 *                   code_name:
 *                     type: string
 *                     example: 'phuc_xa'
 *       400:
 *         description: District code is required
 *       404:
 *         description: District not found
 */
// Get wards by district code
Router.route('/wards/:districtId')
  .get(
    locationValidation.getWards,
    locationController.getWards
  )

export const locationRoute = Router
