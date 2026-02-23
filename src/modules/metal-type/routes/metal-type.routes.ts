import { Hono } from 'hono'
import { metalTypeService } from '../services/metal-type.service'
import { metalTypeMessages } from '../config/metal-type.messages'
import { createMetalTypeSchema, updateMetalTypeSchema } from '../config/metal-type.schema'
import { successResponse } from '../../../utils/response'
import { errorHandler } from '../../../utils/error-handler'
import { authWithPermission } from '../../../middleware/auth.middleware'
import { PERMISSIONS } from '../../../config/permissions.constants'
import type { AppEnv } from '../../../types/hono.types'
import type { MetalType, MetalTypeListResponse } from '../types/metal-type.types'
import type { DependencyCheckResult } from '../../../types/dependency-check.types'

export const metalTypeRoutes = new Hono<AppEnv>()

// GET /api/metal-types - List all metal types
metalTypeRoutes.get('/', authWithPermission(PERMISSIONS.METAL_TYPE.READ), async (c) => {
  try {
    const result = await metalTypeService.list()
    return successResponse<MetalTypeListResponse>(c, metalTypeMessages.LIST_FETCHED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/metal-types/for-metal-color - Get metal types for metal color dropdown
// Uses METAL_COLOR.CREATE permission so users can create metal colors without metal type read access
// NOTE: This route must be defined BEFORE /:id to avoid matching 'for-metal-color' as an id
metalTypeRoutes.get('/for-metal-color', authWithPermission(PERMISSIONS.METAL_COLOR.CREATE), async (c) => {
  try {
    const result = await metalTypeService.getForMetalColor()
    return successResponse(c, 'Metal types fetched successfully', result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/metal-types/for-metal-purity - Get metal types for metal purity dropdown
// Uses METAL_PURITY.CREATE permission so users can create metal purities without metal type read access
// NOTE: This route must be defined BEFORE /:id to avoid matching 'for-metal-purity' as an id
metalTypeRoutes.get('/for-metal-purity', authWithPermission(PERMISSIONS.METAL_PURITY.CREATE), async (c) => {
  try {
    const result = await metalTypeService.getForMetalPurity()
    return successResponse(c, 'Metal types fetched successfully', result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/metal-types/for-making-charge - Get metal types for making charge dropdown
// Uses MAKING_CHARGE.CREATE permission so users can create making charges without metal type read access
// NOTE: This route must be defined BEFORE /:id to avoid matching 'for-making-charge' as an id
metalTypeRoutes.get('/for-making-charge', authWithPermission(PERMISSIONS.MAKING_CHARGE.CREATE), async (c) => {
  try {
    const result = await metalTypeService.getForMakingCharge()
    return successResponse(c, 'Metal types fetched successfully', result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/metal-types/for-product - Get metal types for product dropdown
// Uses PRODUCT.CREATE permission so users can create products without metal type read access
metalTypeRoutes.get('/for-product', authWithPermission(PERMISSIONS.PRODUCT.CREATE), async (c) => {
  try {
    const result = await metalTypeService.getForProduct()
    return successResponse(c, 'Metal types fetched successfully', { items: result })
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/metal-types/for-product-edit - Get metal types for product edit dropdown
// Uses PRODUCT.UPDATE permission so users can edit products without metal type read access
metalTypeRoutes.get('/for-product-edit', authWithPermission(PERMISSIONS.PRODUCT.UPDATE), async (c) => {
  try {
    const result = await metalTypeService.getForProduct()
    return successResponse(c, 'Metal types fetched successfully', { items: result })
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/metal-types/for-pricing-rule - Get metal types for pricing rule dropdown
metalTypeRoutes.get('/for-pricing-rule', authWithPermission(PERMISSIONS.PRICING_RULE.CREATE), async (c) => {
  try {
    const result = await metalTypeService.getForProduct()
    return successResponse(c, 'Metal types fetched successfully', { items: result })
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/metal-types/:id - Get single metal type
metalTypeRoutes.get('/:id', authWithPermission(PERMISSIONS.METAL_TYPE.READ), async (c) => {
  try {
    const id = c.req.param('id')
    const result = await metalTypeService.getById(id)
    return successResponse<MetalType>(c, metalTypeMessages.FETCHED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// POST /api/metal-types - Create metal type
metalTypeRoutes.post('/', authWithPermission(PERMISSIONS.METAL_TYPE.CREATE), async (c) => {
  try {
    const body = await c.req.json()
    const data = createMetalTypeSchema.parse(body)
    const result = await metalTypeService.create(data)
    return successResponse<MetalType>(c, metalTypeMessages.CREATED, result, 201)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// PUT /api/metal-types/:id - Update metal type
metalTypeRoutes.put('/:id', authWithPermission(PERMISSIONS.METAL_TYPE.UPDATE), async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()
    const data = updateMetalTypeSchema.parse(body)
    const result = await metalTypeService.update(id, data)
    return successResponse<MetalType>(c, metalTypeMessages.UPDATED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/metal-types/:id/check-dependency - Check if metal type can be deleted
metalTypeRoutes.get('/:id/check-dependency', authWithPermission(PERMISSIONS.METAL_TYPE.DELETE), async (c) => {
  try {
    const id = c.req.param('id')
    const result = await metalTypeService.checkDependencies(id)
    const message = result.can_delete
      ? metalTypeMessages.NO_DEPENDENCIES
      : metalTypeMessages.HAS_DEPENDENCIES
    return successResponse<DependencyCheckResult>(c, message, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// DELETE /api/metal-types/:id - Delete metal type
metalTypeRoutes.delete('/:id', authWithPermission(PERMISSIONS.METAL_TYPE.DELETE), async (c) => {
  try {
    const id = c.req.param('id')
    await metalTypeService.delete(id)
    return successResponse(c, metalTypeMessages.DELETED, null)
  } catch (error) {
    return errorHandler(error, c)
  }
})
