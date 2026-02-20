import { Hono } from 'hono'
import { metalColorService } from '../services/metal-color.service'
import { metalColorMessages } from '../config/metal-color.messages'
import { createMetalColorSchema, updateMetalColorSchema } from '../config/metal-color.schema'
import { successResponse } from '../../../utils/response'
import { errorHandler } from '../../../utils/error-handler'
import { authWithPermission } from '../../../middleware/auth.middleware'
import { PERMISSIONS } from '../../../config/permissions.constants'
import type { AppEnv } from '../../../types/hono.types'
import type { MetalColorWithMetalType, MetalColorListResponse } from '../types/metal-color.types'
import type { DependencyCheckResult } from '../../../types/dependency-check.types'

export const metalColorRoutes = new Hono<AppEnv>()

// GET /api/metal-colors - List all metal colors
metalColorRoutes.get('/', authWithPermission(PERMISSIONS.METAL_COLOR.READ), async (c) => {
  try {
    const result = await metalColorService.list()
    return successResponse<MetalColorListResponse>(c, metalColorMessages.LIST_FETCHED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/metal-colors/for-product - Get metal colors for product dropdown
// Uses PRODUCT.CREATE permission so users can create products without metal color read access
metalColorRoutes.get('/for-product', authWithPermission(PERMISSIONS.PRODUCT.CREATE), async (c) => {
  try {
    const result = await metalColorService.getForProduct()
    return successResponse(c, 'Metal colors fetched successfully', { items: result })
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/metal-colors/for-product-edit - Get metal colors for product edit dropdown
// Uses PRODUCT.UPDATE permission so users can edit products without metal color read access
metalColorRoutes.get('/for-product-edit', authWithPermission(PERMISSIONS.PRODUCT.UPDATE), async (c) => {
  try {
    const result = await metalColorService.getForProduct()
    return successResponse(c, 'Metal colors fetched successfully', { items: result })
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/metal-colors/for-pricing-rule - Get metal colors for pricing rule dropdown
metalColorRoutes.get('/for-pricing-rule', authWithPermission(PERMISSIONS.PRICING_RULE.CREATE), async (c) => {
  try {
    const result = await metalColorService.getForPricingRule()
    return successResponse(c, 'Metal colors fetched successfully', { items: result })
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/metal-colors/:id - Get single metal color
metalColorRoutes.get('/:id', authWithPermission(PERMISSIONS.METAL_COLOR.READ), async (c) => {
  try {
    const id = c.req.param('id')
    const result = await metalColorService.getById(id)
    return successResponse<MetalColorWithMetalType>(c, metalColorMessages.FETCHED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// POST /api/metal-colors - Create metal color
metalColorRoutes.post('/', authWithPermission(PERMISSIONS.METAL_COLOR.CREATE), async (c) => {
  try {
    const body = await c.req.json()
    const data = createMetalColorSchema.parse(body)
    const result = await metalColorService.create(data)
    return successResponse<MetalColorWithMetalType>(c, metalColorMessages.CREATED, result, 201)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// PUT /api/metal-colors/:id - Update metal color
metalColorRoutes.put('/:id', authWithPermission(PERMISSIONS.METAL_COLOR.UPDATE), async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()
    const data = updateMetalColorSchema.parse(body)
    const result = await metalColorService.update(id, data)
    return successResponse<MetalColorWithMetalType>(c, metalColorMessages.UPDATED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/metal-colors/:id/check-dependency - Check dependencies before deletion
metalColorRoutes.get('/:id/check-dependency', authWithPermission(PERMISSIONS.METAL_COLOR.DELETE), async (c) => {
  try {
    const id = c.req.param('id')
    const result = await metalColorService.checkDependencies(id)
    const message = result.can_delete ? metalColorMessages.NO_DEPENDENCIES : metalColorMessages.HAS_DEPENDENCIES
    return successResponse<DependencyCheckResult>(c, message, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// DELETE /api/metal-colors/:id - Delete metal color
metalColorRoutes.delete('/:id', authWithPermission(PERMISSIONS.METAL_COLOR.DELETE), async (c) => {
  try {
    const id = c.req.param('id')
    await metalColorService.delete(id)
    return successResponse(c, metalColorMessages.DELETED, null)
  } catch (error) {
    return errorHandler(error, c)
  }
})
