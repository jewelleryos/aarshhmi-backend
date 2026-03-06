import { Hono } from 'hono'
import { successResponse } from '../../../utils/response'
import { errorHandler } from '../../../utils/error-handler'
import { authWithPermission } from '../../../middleware/auth.middleware'
import { PERMISSIONS } from '../../../config/permissions.constants'
import { similarProductsScoringService } from '../services/similar-products-scoring.service'
import { similarProductsSyncService } from '../services/similar-products-sync.service'
import { similarProductsMessages } from '../config/similar-products.messages'
import { updateScoringConfigSchema } from '../config/similar-products.schema'
import type { AppEnv } from '../../../types/hono.types'

export const similarProductsDeveloperRoutes = new Hono<AppEnv>()

// GET /api/similar-products/config - List scoring conditions
similarProductsDeveloperRoutes.get('/config', authWithPermission(PERMISSIONS.SIMILAR_PRODUCTS_INTERNAL.READ), async (c) => {
  try {
    const result = await similarProductsScoringService.listConfig()
    return successResponse(c, similarProductsMessages.CONFIG_FETCHED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// PUT /api/similar-products/config/:id - Update scoring condition
similarProductsDeveloperRoutes.put('/config/:id', authWithPermission(PERMISSIONS.SIMILAR_PRODUCTS_INTERNAL.MANAGE), async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()
    const validated = updateScoringConfigSchema.parse(body)
    const result = await similarProductsScoringService.updateConfig(id, validated)
    if (!result) {
      return errorHandler(
        new Error(similarProductsMessages.CONFIG_NOT_FOUND),
        c
      )
    }
    return successResponse(c, similarProductsMessages.CONFIG_UPDATED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/similar-products/sync/jobs - List sync jobs
similarProductsDeveloperRoutes.get('/sync/jobs', authWithPermission(PERMISSIONS.SIMILAR_PRODUCTS_INTERNAL.READ), async (c) => {
  try {
    const result = await similarProductsSyncService.listJobs()
    return successResponse(c, similarProductsMessages.SYNC_JOBS_FETCHED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})
