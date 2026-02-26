import { Hono } from 'hono'
import { pearlTypeService } from '../services/pearl-type.service'
import { pearlTypeMessages } from '../config/pearl-type.messages'
import { createPearlTypeSchema, updatePearlTypeSchema } from '../config/pearl-type.schema'
import { successResponse } from '../../../utils/response'
import { errorHandler } from '../../../utils/error-handler'
import { authWithPermission } from '../../../middleware/auth.middleware'
import { PERMISSIONS } from '../../../config/permissions.constants'
import type { AppEnv } from '../../../types/hono.types'
import type { PearlType, PearlTypeListResponse } from '../types/pearl-type.types'
import type { DependencyCheckResult } from '../../../types/dependency-check.types'

export const pearlTypeRoutes = new Hono<AppEnv>()

// GET /api/pearl-types - List all pearl types
pearlTypeRoutes.get('/', authWithPermission(PERMISSIONS.PEARL_TYPE.READ), async (c) => {
  try {
    const result = await pearlTypeService.list()
    return successResponse<PearlTypeListResponse>(c, pearlTypeMessages.LIST_FETCHED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/pearl-types/for-product - Get pearl types for product dropdown
// Uses PRODUCT.CREATE permission so users can create products without pearl type read access
pearlTypeRoutes.get('/for-product', authWithPermission(PERMISSIONS.PRODUCT.CREATE), async (c) => {
  try {
    const result = await pearlTypeService.getForProduct()
    return successResponse(c, 'Pearl types fetched successfully', { items: result })
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/pearl-types/for-product-edit - Get pearl types for product edit dropdown
// Uses PRODUCT.UPDATE permission so users can edit products without pearl type read access
pearlTypeRoutes.get('/for-product-edit', authWithPermission(PERMISSIONS.PRODUCT.UPDATE), async (c) => {
  try {
    const result = await pearlTypeService.getForProduct()
    return successResponse(c, 'Pearl types fetched successfully', { items: result })
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/pearl-types/:id/check-dependency - Check dependencies before deletion
pearlTypeRoutes.get('/:id/check-dependency', authWithPermission(PERMISSIONS.PEARL_TYPE.DELETE), async (c) => {
  try {
    const id = c.req.param('id')
    const result = await pearlTypeService.checkDependencies(id)
    const message = result.can_delete
      ? pearlTypeMessages.NO_DEPENDENCIES
      : pearlTypeMessages.HAS_DEPENDENCIES
    return successResponse<DependencyCheckResult>(c, message, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/pearl-types/:id - Get single pearl type
pearlTypeRoutes.get('/:id', authWithPermission(PERMISSIONS.PEARL_TYPE.READ), async (c) => {
  try {
    const id = c.req.param('id')
    const result = await pearlTypeService.getById(id)
    return successResponse<PearlType>(c, pearlTypeMessages.FETCHED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// POST /api/pearl-types - Create pearl type
pearlTypeRoutes.post('/', authWithPermission(PERMISSIONS.PEARL_TYPE.CREATE), async (c) => {
  try {
    const body = await c.req.json()
    const data = createPearlTypeSchema.parse(body)
    const result = await pearlTypeService.create(data)
    return successResponse<PearlType>(c, pearlTypeMessages.CREATED, result, 201)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// PUT /api/pearl-types/:id - Update pearl type
pearlTypeRoutes.put('/:id', authWithPermission(PERMISSIONS.PEARL_TYPE.UPDATE), async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()
    const data = updatePearlTypeSchema.parse(body)
    const result = await pearlTypeService.update(id, data)
    return successResponse<PearlType>(c, pearlTypeMessages.UPDATED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// DELETE /api/pearl-types/:id - Delete pearl type
pearlTypeRoutes.delete('/:id', authWithPermission(PERMISSIONS.PEARL_TYPE.DELETE), async (c) => {
  try {
    const id = c.req.param('id')
    await pearlTypeService.delete(id)
    return successResponse(c, pearlTypeMessages.DELETED, null)
  } catch (error) {
    return errorHandler(error, c)
  }
})
