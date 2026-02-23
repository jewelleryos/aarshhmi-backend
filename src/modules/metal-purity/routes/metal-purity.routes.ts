import { Hono } from 'hono'
import { metalPurityService } from '../services/metal-purity.service'
import { metalPurityMessages } from '../config/metal-purity.messages'
import { createMetalPuritySchema, updateMetalPuritySchema } from '../config/metal-purity.schema'
import { successResponse } from '../../../utils/response'
import { errorHandler } from '../../../utils/error-handler'
import { authWithPermission } from '../../../middleware/auth.middleware'
import { PERMISSIONS } from '../../../config/permissions.constants'
import { priceRecalculationService } from '../../price-recalculation/services/price-recalculation.service'
import type { AppEnv } from '../../../types/hono.types'
import type { MetalPurityWithMetalType, MetalPurityListResponse } from '../types/metal-purity.types'
import type { DependencyCheckResult } from '../../../types/dependency-check.types'

export const metalPurityRoutes = new Hono<AppEnv>()

// GET /api/metal-purities - List all metal purities
metalPurityRoutes.get('/', authWithPermission(PERMISSIONS.METAL_PURITY.READ), async (c) => {
  try {
    const result = await metalPurityService.list()
    return successResponse<MetalPurityListResponse>(c, metalPurityMessages.LIST_FETCHED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/metal-purities/for-product - Get metal purities for product dropdown
// Uses PRODUCT.CREATE permission so users can create products without metal purity read access
metalPurityRoutes.get('/for-product', authWithPermission(PERMISSIONS.PRODUCT.CREATE), async (c) => {
  try {
    const result = await metalPurityService.getForProduct()
    return successResponse(c, 'Metal purities fetched successfully', { items: result })
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/metal-purities/for-product-edit - Get metal purities for product edit dropdown
// Uses PRODUCT.UPDATE permission so users can edit products without metal purity read access
metalPurityRoutes.get('/for-product-edit', authWithPermission(PERMISSIONS.PRODUCT.UPDATE), async (c) => {
  try {
    const result = await metalPurityService.getForProduct()
    return successResponse(c, 'Metal purities fetched successfully', { items: result })
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/metal-purities/for-pricing-rule - Get metal purities for pricing rule dropdown
metalPurityRoutes.get('/for-pricing-rule', authWithPermission(PERMISSIONS.PRICING_RULE.CREATE), async (c) => {
  try {
    const result = await metalPurityService.getForPricingRule()
    return successResponse(c, 'Metal purities fetched successfully', { items: result })
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/metal-purities/:id - Get single metal purity
metalPurityRoutes.get('/:id', authWithPermission(PERMISSIONS.METAL_PURITY.READ), async (c) => {
  try {
    const id = c.req.param('id')
    const result = await metalPurityService.getById(id)
    return successResponse<MetalPurityWithMetalType>(c, metalPurityMessages.FETCHED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// POST /api/metal-purities - Create metal purity
metalPurityRoutes.post('/', authWithPermission(PERMISSIONS.METAL_PURITY.CREATE), async (c) => {
  try {
    const body = await c.req.json()
    const data = createMetalPuritySchema.parse(body)
    const result = await metalPurityService.create(data)
    return successResponse<MetalPurityWithMetalType>(c, metalPurityMessages.CREATED, result, 201)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// PUT /api/metal-purities/:id - Update metal purity
metalPurityRoutes.put('/:id', authWithPermission(PERMISSIONS.METAL_PURITY.UPDATE), async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()
    const data = updateMetalPuritySchema.parse(body)
    const result = await metalPurityService.update(id, data)
    if (data.price !== undefined) {
      const user = c.get('user')
      priceRecalculationService.trigger('metal_purity', user.id)
    }
    return successResponse<MetalPurityWithMetalType>(c, metalPurityMessages.UPDATED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/metal-purities/:id/check-dependency - Check dependencies before deletion
metalPurityRoutes.get('/:id/check-dependency', authWithPermission(PERMISSIONS.METAL_PURITY.DELETE), async (c) => {
  try {
    const id = c.req.param('id')
    const result = await metalPurityService.checkDependencies(id)
    const message = result.can_delete ? metalPurityMessages.NO_DEPENDENCIES : metalPurityMessages.HAS_DEPENDENCIES
    return successResponse<DependencyCheckResult>(c, message, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// DELETE /api/metal-purities/:id - Delete metal purity
metalPurityRoutes.delete('/:id', authWithPermission(PERMISSIONS.METAL_PURITY.DELETE), async (c) => {
  try {
    const id = c.req.param('id')
    await metalPurityService.delete(id)
    return successResponse(c, metalPurityMessages.DELETED, null)
  } catch (error) {
    return errorHandler(error, c)
  }
})
