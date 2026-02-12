import { Hono } from 'hono'
import { gemstoneQualityService } from '../services/gemstone-quality.service'
import { gemstoneQualityMessages } from '../config/gemstone-quality.messages'
import { createGemstoneQualitySchema, updateGemstoneQualitySchema } from '../config/gemstone-quality.schema'
import { successResponse } from '../../../utils/response'
import { errorHandler } from '../../../utils/error-handler'
import { authWithPermission } from '../../../middleware/auth.middleware'
import { PERMISSIONS } from '../../../config/permissions.constants'
import type { AppEnv } from '../../../types/hono.types'
import type { GemstoneQuality, GemstoneQualityListResponse } from '../types/gemstone-quality.types'

export const gemstoneQualityRoutes = new Hono<AppEnv>()

// GET /api/gemstone-qualities - List all gemstone qualities
gemstoneQualityRoutes.get('/', authWithPermission(PERMISSIONS.GEMSTONE_QUALITY.READ), async (c) => {
  try {
    const result = await gemstoneQualityService.list()
    return successResponse<GemstoneQualityListResponse>(c, gemstoneQualityMessages.LIST_FETCHED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/gemstone-qualities/dropdown - Get dropdown items for gemstone pricing
gemstoneQualityRoutes.get('/dropdown', authWithPermission(PERMISSIONS.GEMSTONE_PRICING.READ), async (c) => {
  try {
    const result = await gemstoneQualityService.dropdown()
    return successResponse(c, 'Gemstone qualities fetched', result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/gemstone-qualities/for-product - Get gemstone qualities for product dropdown
// Uses PRODUCT.CREATE permission so users can create products without gemstone quality read access
gemstoneQualityRoutes.get('/for-product', authWithPermission(PERMISSIONS.PRODUCT.CREATE), async (c) => {
  try {
    const result = await gemstoneQualityService.getForProduct()
    return successResponse(c, 'Gemstone qualities fetched successfully', { items: result })
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/gemstone-qualities/for-product-edit - Get gemstone qualities for product edit dropdown
// Uses PRODUCT.UPDATE permission so users can edit products without gemstone quality read access
gemstoneQualityRoutes.get('/for-product-edit', authWithPermission(PERMISSIONS.PRODUCT.UPDATE), async (c) => {
  try {
    const result = await gemstoneQualityService.getForProduct()
    return successResponse(c, 'Gemstone qualities fetched successfully', { items: result })
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/gemstone-qualities/:id - Get single gemstone quality
gemstoneQualityRoutes.get('/:id', authWithPermission(PERMISSIONS.GEMSTONE_QUALITY.READ), async (c) => {
  try {
    const id = c.req.param('id')
    const result = await gemstoneQualityService.getById(id)
    return successResponse<GemstoneQuality>(c, gemstoneQualityMessages.FETCHED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// POST /api/gemstone-qualities - Create gemstone quality
gemstoneQualityRoutes.post('/', authWithPermission(PERMISSIONS.GEMSTONE_QUALITY.CREATE), async (c) => {
  try {
    const body = await c.req.json()
    const data = createGemstoneQualitySchema.parse(body)
    const result = await gemstoneQualityService.create(data)
    return successResponse<GemstoneQuality>(c, gemstoneQualityMessages.CREATED, result, 201)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// PUT /api/gemstone-qualities/:id - Update gemstone quality
gemstoneQualityRoutes.put('/:id', authWithPermission(PERMISSIONS.GEMSTONE_QUALITY.UPDATE), async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()
    const data = updateGemstoneQualitySchema.parse(body)
    const result = await gemstoneQualityService.update(id, data)
    return successResponse<GemstoneQuality>(c, gemstoneQualityMessages.UPDATED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})
