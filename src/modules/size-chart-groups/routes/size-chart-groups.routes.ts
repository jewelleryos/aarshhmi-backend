import { Hono } from 'hono'
import { sizeChartGroupService } from '../services/size-chart-groups.service'
import { sizeChartGroupMessages } from '../config/size-chart-groups.messages'
import { createSizeChartGroupSchema, updateSizeChartGroupSchema } from '../config/size-chart-groups.schema'
import { successResponse } from '../../../utils/response'
import { errorHandler } from '../../../utils/error-handler'
import { authWithPermission } from '../../../middleware/auth.middleware'
import { PERMISSIONS } from '../../../config/permissions.constants'
import type { AppEnv } from '../../../types/hono.types'
import type { SizeChartGroup, SizeChartGroupListResponse } from '../types/size-chart-groups.types'
import type { DependencyCheckResult } from '../../../types/dependency-check.types'

export const sizeChartGroupRoutes = new Hono<AppEnv>()

// GET /api/size-chart-groups/dropdown - Get groups for dropdown (used when creating values)
sizeChartGroupRoutes.get('/dropdown', authWithPermission(PERMISSIONS.SIZE_CHART_VALUE.CREATE), async (c) => {
  try {
    const result = await sizeChartGroupService.list()
    return successResponse(c, 'Size chart groups dropdown fetched successfully', {
      items: result.items.map((g) => ({ id: g.id, name: g.name })),
    })
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/size-chart-groups/for-product - Get groups for product dropdown
// Uses PRODUCT.CREATE permission so users can create products without size chart group read access
sizeChartGroupRoutes.get('/for-product', authWithPermission(PERMISSIONS.PRODUCT.CREATE), async (c) => {
  try {
    const result = await sizeChartGroupService.list()
    return successResponse(c, 'Size chart groups fetched successfully', {
      items: result.items.map((g) => ({ id: g.id, name: g.name })),
    })
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/size-chart-groups/for-product-edit - Get groups for product edit dropdown
// Uses PRODUCT.UPDATE permission so users can edit products without size chart group read access
sizeChartGroupRoutes.get('/for-product-edit', authWithPermission(PERMISSIONS.PRODUCT.UPDATE), async (c) => {
  try {
    const result = await sizeChartGroupService.list()
    return successResponse(c, 'Size chart groups fetched successfully', {
      items: result.items.map((g) => ({ id: g.id, name: g.name })),
    })
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/size-chart-groups - List all size chart groups
sizeChartGroupRoutes.get('/', authWithPermission(PERMISSIONS.SIZE_CHART_GROUP.READ), async (c) => {
  try {
    const result = await sizeChartGroupService.list()
    return successResponse<SizeChartGroupListResponse>(c, sizeChartGroupMessages.LIST_FETCHED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/size-chart-groups/:id/check-dependency - Check dependencies before deletion
sizeChartGroupRoutes.get('/:id/check-dependency', authWithPermission(PERMISSIONS.SIZE_CHART_GROUP.DELETE), async (c) => {
  try {
    const id = c.req.param('id')
    const result = await sizeChartGroupService.checkDependencies(id)
    const message = result.can_delete
      ? sizeChartGroupMessages.NO_DEPENDENCIES
      : sizeChartGroupMessages.HAS_DEPENDENCIES
    return successResponse<DependencyCheckResult>(c, message, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/size-chart-groups/:id - Get single size chart group
sizeChartGroupRoutes.get('/:id', authWithPermission(PERMISSIONS.SIZE_CHART_GROUP.READ), async (c) => {
  try {
    const id = c.req.param('id')
    const result = await sizeChartGroupService.getById(id)
    return successResponse<SizeChartGroup>(c, sizeChartGroupMessages.FETCHED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// POST /api/size-chart-groups - Create size chart group with first value
sizeChartGroupRoutes.post('/', authWithPermission(PERMISSIONS.SIZE_CHART_GROUP.CREATE), async (c) => {
  try {
    const body = await c.req.json()
    const data = createSizeChartGroupSchema.parse(body)
    const result = await sizeChartGroupService.create(data)
    return successResponse<SizeChartGroup>(c, sizeChartGroupMessages.CREATED, result, 201)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// PUT /api/size-chart-groups/:id - Update size chart group (name only)
sizeChartGroupRoutes.put('/:id', authWithPermission(PERMISSIONS.SIZE_CHART_GROUP.UPDATE), async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()
    const data = updateSizeChartGroupSchema.parse(body)
    const result = await sizeChartGroupService.update(id, data)
    return successResponse<SizeChartGroup>(c, sizeChartGroupMessages.UPDATED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// DELETE /api/size-chart-groups/:id - Delete size chart group
sizeChartGroupRoutes.delete('/:id', authWithPermission(PERMISSIONS.SIZE_CHART_GROUP.DELETE), async (c) => {
  try {
    const id = c.req.param('id')
    await sizeChartGroupService.delete(id)
    return successResponse(c, sizeChartGroupMessages.DELETED, null)
  } catch (error) {
    return errorHandler(error, c)
  }
})
