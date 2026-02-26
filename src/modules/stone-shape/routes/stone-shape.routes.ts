import { Hono } from 'hono'
import { stoneShapeService } from '../services/stone-shape.service'
import { stoneShapeMessages } from '../config/stone-shape.messages'
import { createStoneShapeSchema, updateStoneShapeSchema } from '../config/stone-shape.schema'
import { successResponse } from '../../../utils/response'
import { errorHandler } from '../../../utils/error-handler'
import { authWithPermission } from '../../../middleware/auth.middleware'
import { PERMISSIONS } from '../../../config/permissions.constants'
import { db } from '../../../lib/db'
import type { AppEnv } from '../../../types/hono.types'
import type { StoneShape, StoneShapeListResponse } from '../types/stone-shape.types'
import type { DependencyCheckResult } from '../../../types/dependency-check.types'

export const stoneShapeRoutes = new Hono<AppEnv>()

// GET /api/stone-shapes/dropdown - Get shapes for dropdown (Diamond Pricing)
stoneShapeRoutes.get('/dropdown', authWithPermission(PERMISSIONS.DIAMOND_PRICING.CREATE), async (c) => {
  try {
    const result = await db.query(
      `SELECT id, name, slug FROM stone_shapes WHERE status = true ORDER BY name`
    )
    return successResponse(c, 'Shapes fetched successfully', { items: result.rows })
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/stone-shapes/for-product - Get stone shapes for product dropdown
// Uses PRODUCT.CREATE permission so users can create products without stone shape read access
stoneShapeRoutes.get('/for-product', authWithPermission(PERMISSIONS.PRODUCT.CREATE), async (c) => {
  try {
    const result = await stoneShapeService.getForProduct()
    return successResponse(c, 'Stone shapes fetched successfully', { items: result })
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/stone-shapes/for-product-edit - Get stone shapes for product edit dropdown
// Uses PRODUCT.UPDATE permission so users can edit products without stone shape read access
stoneShapeRoutes.get('/for-product-edit', authWithPermission(PERMISSIONS.PRODUCT.UPDATE), async (c) => {
  try {
    const result = await stoneShapeService.getForProduct()
    return successResponse(c, 'Stone shapes fetched successfully', { items: result })
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/stone-shapes - List all stone shapes
stoneShapeRoutes.get('/', authWithPermission(PERMISSIONS.STONE_SHAPE.READ), async (c) => {
  try {
    const result = await stoneShapeService.list()
    return successResponse<StoneShapeListResponse>(c, stoneShapeMessages.LIST_FETCHED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/stone-shapes/:id/check-dependency - Check dependencies before deletion
stoneShapeRoutes.get('/:id/check-dependency', authWithPermission(PERMISSIONS.STONE_SHAPE.DELETE), async (c) => {
  try {
    const id = c.req.param('id')
    const result = await stoneShapeService.checkDependencies(id)
    const message = result.can_delete
      ? stoneShapeMessages.NO_DEPENDENCIES
      : stoneShapeMessages.HAS_DEPENDENCIES
    return successResponse<DependencyCheckResult>(c, message, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/stone-shapes/:id - Get single stone shape
stoneShapeRoutes.get('/:id', authWithPermission(PERMISSIONS.STONE_SHAPE.READ), async (c) => {
  try {
    const id = c.req.param('id')
    const result = await stoneShapeService.getById(id)
    return successResponse<StoneShape>(c, stoneShapeMessages.FETCHED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// POST /api/stone-shapes - Create stone shape
stoneShapeRoutes.post('/', authWithPermission(PERMISSIONS.STONE_SHAPE.CREATE), async (c) => {
  try {
    const body = await c.req.json()
    const data = createStoneShapeSchema.parse(body)
    const result = await stoneShapeService.create(data)
    return successResponse<StoneShape>(c, stoneShapeMessages.CREATED, result, 201)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// PUT /api/stone-shapes/:id - Update stone shape
stoneShapeRoutes.put('/:id', authWithPermission(PERMISSIONS.STONE_SHAPE.UPDATE), async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()
    const data = updateStoneShapeSchema.parse(body)
    const result = await stoneShapeService.update(id, data)
    return successResponse<StoneShape>(c, stoneShapeMessages.UPDATED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// DELETE /api/stone-shapes/:id - Delete stone shape
stoneShapeRoutes.delete('/:id', authWithPermission(PERMISSIONS.STONE_SHAPE.DELETE), async (c) => {
  try {
    const id = c.req.param('id')
    await stoneShapeService.delete(id)
    return successResponse(c, stoneShapeMessages.DELETED, null)
  } catch (error) {
    return errorHandler(error, c)
  }
})
