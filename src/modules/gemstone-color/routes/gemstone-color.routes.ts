import { Hono } from 'hono'
import { gemstoneColorService } from '../services/gemstone-color.service'
import { gemstoneColorMessages } from '../config/gemstone-color.messages'
import { createGemstoneColorSchema, updateGemstoneColorSchema } from '../config/gemstone-color.schema'
import { successResponse } from '../../../utils/response'
import { errorHandler } from '../../../utils/error-handler'
import { authWithPermission } from '../../../middleware/auth.middleware'
import { PERMISSIONS } from '../../../config/permissions.constants'
import type { AppEnv } from '../../../types/hono.types'
import type { GemstoneColor, GemstoneColorListResponse } from '../types/gemstone-color.types'
import type { DependencyCheckResult } from '../../../types/dependency-check.types'

export const gemstoneColorRoutes = new Hono<AppEnv>()

// GET /api/gemstone-colors - List all gemstone colors
gemstoneColorRoutes.get('/', authWithPermission(PERMISSIONS.GEMSTONE_COLOR.READ), async (c) => {
  try {
    const result = await gemstoneColorService.list()
    return successResponse<GemstoneColorListResponse>(c, gemstoneColorMessages.LIST_FETCHED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/gemstone-colors/dropdown - Get dropdown items for gemstone pricing
gemstoneColorRoutes.get('/dropdown', authWithPermission(PERMISSIONS.GEMSTONE_PRICING.READ), async (c) => {
  try {
    const result = await gemstoneColorService.dropdown()
    return successResponse(c, 'Gemstone colors fetched', result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/gemstone-colors/for-product - Get gemstone colors for product dropdown
// Uses PRODUCT.CREATE permission so users can create products without gemstone color read access
gemstoneColorRoutes.get('/for-product', authWithPermission(PERMISSIONS.PRODUCT.CREATE), async (c) => {
  try {
    const result = await gemstoneColorService.getForProduct()
    return successResponse(c, 'Gemstone colors fetched successfully', { items: result })
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/gemstone-colors/for-product-edit - Get gemstone colors for product edit dropdown
// Uses PRODUCT.UPDATE permission so users can edit products without gemstone color read access
gemstoneColorRoutes.get('/for-product-edit', authWithPermission(PERMISSIONS.PRODUCT.UPDATE), async (c) => {
  try {
    const result = await gemstoneColorService.getForProduct()
    return successResponse(c, 'Gemstone colors fetched successfully', { items: result })
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/gemstone-colors/:id/check-dependency - Check dependencies before deletion
gemstoneColorRoutes.get('/:id/check-dependency', authWithPermission(PERMISSIONS.GEMSTONE_COLOR.DELETE), async (c) => {
  try {
    const id = c.req.param('id')
    const result = await gemstoneColorService.checkDependencies(id)
    const message = result.can_delete
      ? gemstoneColorMessages.NO_DEPENDENCIES
      : gemstoneColorMessages.HAS_DEPENDENCIES
    return successResponse<DependencyCheckResult>(c, message, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/gemstone-colors/:id - Get single gemstone color
gemstoneColorRoutes.get('/:id', authWithPermission(PERMISSIONS.GEMSTONE_COLOR.READ), async (c) => {
  try {
    const id = c.req.param('id')
    const result = await gemstoneColorService.getById(id)
    return successResponse<GemstoneColor>(c, gemstoneColorMessages.FETCHED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// POST /api/gemstone-colors - Create gemstone color
gemstoneColorRoutes.post('/', authWithPermission(PERMISSIONS.GEMSTONE_COLOR.CREATE), async (c) => {
  try {
    const body = await c.req.json()
    const data = createGemstoneColorSchema.parse(body)
    const result = await gemstoneColorService.create(data)
    return successResponse<GemstoneColor>(c, gemstoneColorMessages.CREATED, result, 201)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// PUT /api/gemstone-colors/:id - Update gemstone color
gemstoneColorRoutes.put('/:id', authWithPermission(PERMISSIONS.GEMSTONE_COLOR.UPDATE), async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()
    const data = updateGemstoneColorSchema.parse(body)
    const result = await gemstoneColorService.update(id, data)
    return successResponse<GemstoneColor>(c, gemstoneColorMessages.UPDATED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// DELETE /api/gemstone-colors/:id - Delete gemstone color
gemstoneColorRoutes.delete('/:id', authWithPermission(PERMISSIONS.GEMSTONE_COLOR.DELETE), async (c) => {
  try {
    const id = c.req.param('id')
    await gemstoneColorService.delete(id)
    return successResponse(c, gemstoneColorMessages.DELETED, null)
  } catch (error) {
    return errorHandler(error, c)
  }
})
