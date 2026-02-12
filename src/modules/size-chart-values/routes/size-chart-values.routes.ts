import { Hono } from 'hono'
import { sizeChartValueService } from '../services/size-chart-values.service'
import { sizeChartValueMessages } from '../config/size-chart-values.messages'
import { createSizeChartValueSchema, updateSizeChartValueSchema } from '../config/size-chart-values.schema'
import { successResponse } from '../../../utils/response'
import { errorHandler } from '../../../utils/error-handler'
import { authWithPermission } from '../../../middleware/auth.middleware'
import { PERMISSIONS } from '../../../config/permissions.constants'
import type { AppEnv } from '../../../types/hono.types'
import type { SizeChartValue, SizeChartValueListResponse } from '../types/size-chart-values.types'

export const sizeChartValueRoutes = new Hono<AppEnv>()

// GET /api/size-chart-values - List all size chart values (with optional group filter)
sizeChartValueRoutes.get('/', authWithPermission(PERMISSIONS.SIZE_CHART_VALUE.READ), async (c) => {
  try {
    const size_chart_group_id = c.req.query('size_chart_group_id')
    const result = await sizeChartValueService.list(
      size_chart_group_id ? { size_chart_group_id } : undefined
    )
    return successResponse<SizeChartValueListResponse>(c, sizeChartValueMessages.LIST_FETCHED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/size-chart-values/:id - Get single size chart value
sizeChartValueRoutes.get('/:id', authWithPermission(PERMISSIONS.SIZE_CHART_VALUE.READ), async (c) => {
  try {
    const id = c.req.param('id')
    const result = await sizeChartValueService.getById(id)
    return successResponse<SizeChartValue>(c, sizeChartValueMessages.FETCHED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// POST /api/size-chart-values - Create size chart value
sizeChartValueRoutes.post('/', authWithPermission(PERMISSIONS.SIZE_CHART_VALUE.CREATE), async (c) => {
  try {
    const body = await c.req.json()
    const data = createSizeChartValueSchema.parse(body)
    const result = await sizeChartValueService.create(data)
    return successResponse<SizeChartValue>(c, sizeChartValueMessages.CREATED, result, 201)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// PUT /api/size-chart-values/:id - Update size chart value
sizeChartValueRoutes.put('/:id', authWithPermission(PERMISSIONS.SIZE_CHART_VALUE.UPDATE), async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()
    const data = updateSizeChartValueSchema.parse(body)
    const result = await sizeChartValueService.update(id, data)
    return successResponse<SizeChartValue>(c, sizeChartValueMessages.UPDATED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// PUT /api/size-chart-values/:id/make-default - Set as default
sizeChartValueRoutes.put('/:id/make-default', authWithPermission(PERMISSIONS.SIZE_CHART_VALUE.UPDATE), async (c) => {
  try {
    const id = c.req.param('id')
    const result = await sizeChartValueService.makeDefault(id)
    return successResponse<SizeChartValue>(c, sizeChartValueMessages.DEFAULT_UPDATED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// DELETE /api/size-chart-values/:id - Delete size chart value
sizeChartValueRoutes.delete('/:id', authWithPermission(PERMISSIONS.SIZE_CHART_VALUE.DELETE), async (c) => {
  try {
    const id = c.req.param('id')
    await sizeChartValueService.delete(id)
    return successResponse(c, sizeChartValueMessages.DELETED, null)
  } catch (error) {
    return errorHandler(error, c)
  }
})
