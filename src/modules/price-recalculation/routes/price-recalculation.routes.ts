import { Hono } from 'hono'
import { db } from '../../../lib/db'
import { successResponse } from '../../../utils/response'
import { errorHandler } from '../../../utils/error-handler'
import { authWithPermission } from '../../../middleware/auth.middleware'
import { PERMISSIONS } from '../../../config/permissions.constants'
import { priceRecalculationService } from '../services/price-recalculation.service'
import type { AppEnv } from '../../../types/hono.types'

export const priceRecalculationRoutes = new Hono<AppEnv>()

// GET /api/price-recalculation/jobs
priceRecalculationRoutes.get('/jobs', authWithPermission(PERMISSIONS.PRICE_RECALCULATION.READ), async (c) => {
  try {
    const result = await db.query(
      `SELECT id, status, trigger_source, triggered_by, total_products,
              processed_products, failed_products, error_details,
              started_at, completed_at, created_at
       FROM price_recalculation_jobs
       ORDER BY created_at DESC
       LIMIT 100`
    )
    return successResponse(c, 'Jobs fetched', { items: result.rows })
  } catch (error) {
    return errorHandler(error, c)
  }
})

// POST /api/price-recalculation/trigger
priceRecalculationRoutes.post('/trigger', authWithPermission(PERMISSIONS.PRICE_RECALCULATION.READ), async (c) => {
  try {
    const user = c.get('user')
    priceRecalculationService.trigger('manual', user.id)
    return successResponse(c, 'Recalculation triggered', null)
  } catch (error) {
    return errorHandler(error, c)
  }
})
