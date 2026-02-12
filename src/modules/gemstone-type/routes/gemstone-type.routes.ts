import { Hono } from 'hono'
import { gemstoneTypeService } from '../services/gemstone-type.service'
import { gemstoneTypeMessages } from '../config/gemstone-type.messages'
import { createGemstoneTypeSchema, updateGemstoneTypeSchema } from '../config/gemstone-type.schema'
import { successResponse } from '../../../utils/response'
import { errorHandler } from '../../../utils/error-handler'
import { authWithPermission } from '../../../middleware/auth.middleware'
import { PERMISSIONS } from '../../../config/permissions.constants'
import type { AppEnv } from '../../../types/hono.types'
import type { GemstoneType, GemstoneTypeListResponse } from '../types/gemstone-type.types'

export const gemstoneTypeRoutes = new Hono<AppEnv>()

// GET /api/gemstone-types - List all gemstone types
gemstoneTypeRoutes.get('/', authWithPermission(PERMISSIONS.GEMSTONE_TYPE.READ), async (c) => {
  try {
    const result = await gemstoneTypeService.list()
    return successResponse<GemstoneTypeListResponse>(c, gemstoneTypeMessages.LIST_FETCHED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/gemstone-types/dropdown - Get dropdown items for gemstone pricing
gemstoneTypeRoutes.get('/dropdown', authWithPermission(PERMISSIONS.GEMSTONE_PRICING.READ), async (c) => {
  try {
    const result = await gemstoneTypeService.dropdown()
    return successResponse(c, 'Gemstone types fetched', result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/gemstone-types/for-product - Get gemstone types for product dropdown
// Uses PRODUCT.CREATE permission so users can create products without gemstone type read access
gemstoneTypeRoutes.get('/for-product', authWithPermission(PERMISSIONS.PRODUCT.CREATE), async (c) => {
  try {
    const result = await gemstoneTypeService.getForProduct()
    return successResponse(c, 'Gemstone types fetched successfully', { items: result })
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/gemstone-types/for-product-edit - Get gemstone types for product edit dropdown
// Uses PRODUCT.UPDATE permission so users can edit products without gemstone type read access
gemstoneTypeRoutes.get('/for-product-edit', authWithPermission(PERMISSIONS.PRODUCT.UPDATE), async (c) => {
  try {
    const result = await gemstoneTypeService.getForProduct()
    return successResponse(c, 'Gemstone types fetched successfully', { items: result })
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/gemstone-types/:id - Get single gemstone type
gemstoneTypeRoutes.get('/:id', authWithPermission(PERMISSIONS.GEMSTONE_TYPE.READ), async (c) => {
  try {
    const id = c.req.param('id')
    const result = await gemstoneTypeService.getById(id)
    return successResponse<GemstoneType>(c, gemstoneTypeMessages.FETCHED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// POST /api/gemstone-types - Create gemstone type
gemstoneTypeRoutes.post('/', authWithPermission(PERMISSIONS.GEMSTONE_TYPE.CREATE), async (c) => {
  try {
    const body = await c.req.json()
    const data = createGemstoneTypeSchema.parse(body)
    const result = await gemstoneTypeService.create(data)
    return successResponse<GemstoneType>(c, gemstoneTypeMessages.CREATED, result, 201)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// PUT /api/gemstone-types/:id - Update gemstone type
gemstoneTypeRoutes.put('/:id', authWithPermission(PERMISSIONS.GEMSTONE_TYPE.UPDATE), async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()
    const data = updateGemstoneTypeSchema.parse(body)
    const result = await gemstoneTypeService.update(id, data)
    return successResponse<GemstoneType>(c, gemstoneTypeMessages.UPDATED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})
