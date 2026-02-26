import { Hono } from 'hono'
import { pearlQualityService } from '../services/pearl-quality.service'
import { pearlQualityMessages } from '../config/pearl-quality.messages'
import { createPearlQualitySchema, updatePearlQualitySchema } from '../config/pearl-quality.schema'
import { successResponse } from '../../../utils/response'
import { errorHandler } from '../../../utils/error-handler'
import { authWithPermission } from '../../../middleware/auth.middleware'
import { PERMISSIONS } from '../../../config/permissions.constants'
import type { AppEnv } from '../../../types/hono.types'
import type { PearlQuality, PearlQualityListResponse } from '../types/pearl-quality.types'
import type { DependencyCheckResult } from '../../../types/dependency-check.types'

export const pearlQualityRoutes = new Hono<AppEnv>()

// GET /api/pearl-qualities - List all pearl qualities
pearlQualityRoutes.get('/', authWithPermission(PERMISSIONS.PEARL_QUALITY.READ), async (c) => {
  try {
    const result = await pearlQualityService.list()
    return successResponse<PearlQualityListResponse>(c, pearlQualityMessages.LIST_FETCHED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/pearl-qualities/for-product - Get pearl qualities for product dropdown
// Uses PRODUCT.CREATE permission so users can create products without pearl quality read access
pearlQualityRoutes.get('/for-product', authWithPermission(PERMISSIONS.PRODUCT.CREATE), async (c) => {
  try {
    const result = await pearlQualityService.getForProduct()
    return successResponse(c, 'Pearl qualities fetched successfully', { items: result })
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/pearl-qualities/for-product-edit - Get pearl qualities for product edit dropdown
// Uses PRODUCT.UPDATE permission so users can edit products without pearl quality read access
pearlQualityRoutes.get('/for-product-edit', authWithPermission(PERMISSIONS.PRODUCT.UPDATE), async (c) => {
  try {
    const result = await pearlQualityService.getForProduct()
    return successResponse(c, 'Pearl qualities fetched successfully', { items: result })
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/pearl-qualities/:id/check-dependency - Check dependencies before deletion
pearlQualityRoutes.get('/:id/check-dependency', authWithPermission(PERMISSIONS.PEARL_QUALITY.DELETE), async (c) => {
  try {
    const id = c.req.param('id')
    const result = await pearlQualityService.checkDependencies(id)
    const message = result.can_delete
      ? pearlQualityMessages.NO_DEPENDENCIES
      : pearlQualityMessages.HAS_DEPENDENCIES
    return successResponse<DependencyCheckResult>(c, message, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/pearl-qualities/:id - Get single pearl quality
pearlQualityRoutes.get('/:id', authWithPermission(PERMISSIONS.PEARL_QUALITY.READ), async (c) => {
  try {
    const id = c.req.param('id')
    const result = await pearlQualityService.getById(id)
    return successResponse<PearlQuality>(c, pearlQualityMessages.FETCHED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// POST /api/pearl-qualities - Create pearl quality
pearlQualityRoutes.post('/', authWithPermission(PERMISSIONS.PEARL_QUALITY.CREATE), async (c) => {
  try {
    const body = await c.req.json()
    const data = createPearlQualitySchema.parse(body)
    const result = await pearlQualityService.create(data)
    return successResponse<PearlQuality>(c, pearlQualityMessages.CREATED, result, 201)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// PUT /api/pearl-qualities/:id - Update pearl quality
pearlQualityRoutes.put('/:id', authWithPermission(PERMISSIONS.PEARL_QUALITY.UPDATE), async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()
    const data = updatePearlQualitySchema.parse(body)
    const result = await pearlQualityService.update(id, data)
    return successResponse<PearlQuality>(c, pearlQualityMessages.UPDATED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// DELETE /api/pearl-qualities/:id - Delete pearl quality
pearlQualityRoutes.delete('/:id', authWithPermission(PERMISSIONS.PEARL_QUALITY.DELETE), async (c) => {
  try {
    const id = c.req.param('id')
    await pearlQualityService.delete(id)
    return successResponse(c, pearlQualityMessages.DELETED, null)
  } catch (error) {
    return errorHandler(error, c)
  }
})
