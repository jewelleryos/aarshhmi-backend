import { Hono } from 'hono'
import { mrpMarkupService } from '../services/mrp-markup.service'
import { mrpMarkupMessages } from '../config/mrp-markup.messages'
import { updateMrpMarkupSchema } from '../config/mrp-markup.schema'
import { successResponse } from '../../../utils/response'
import { errorHandler } from '../../../utils/error-handler'
import { authWithPermission } from '../../../middleware/auth.middleware'
import { PERMISSIONS } from '../../../config/permissions.constants'
import { priceRecalculationService } from '../../price-recalculation/services/price-recalculation.service'
import type { AppEnv } from '../../../types/hono.types'
import type { MrpMarkup } from '../types/mrp-markup.types'

export const mrpMarkupRoutes = new Hono<AppEnv>()

// GET /api/mrp-markup - Get MRP markup values
mrpMarkupRoutes.get('/', authWithPermission(PERMISSIONS.MRP_MARKUP.READ), async (c) => {
  try {
    const result = await mrpMarkupService.get()
    return successResponse<MrpMarkup>(c, mrpMarkupMessages.FETCHED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// PUT /api/mrp-markup - Update MRP markup values
mrpMarkupRoutes.put('/', authWithPermission(PERMISSIONS.MRP_MARKUP.UPDATE), async (c) => {
  try {
    const body = await c.req.json()
    const data = updateMrpMarkupSchema.parse(body)
    const result = await mrpMarkupService.update(data)
    const user = c.get('user')
    priceRecalculationService.trigger('mrp_markup', user.id)
    return successResponse<MrpMarkup>(c, mrpMarkupMessages.UPDATED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})
