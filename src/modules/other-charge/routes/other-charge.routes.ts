import { Hono } from 'hono'
import { otherChargeService } from '../services/other-charge.service'
import { otherChargeMessages } from '../config/other-charge.messages'
import { createOtherChargeSchema, updateOtherChargeSchema } from '../config/other-charge.schema'
import { successResponse } from '../../../utils/response'
import { errorHandler } from '../../../utils/error-handler'
import { authWithPermission } from '../../../middleware/auth.middleware'
import { PERMISSIONS } from '../../../config/permissions.constants'
import { priceRecalculationService } from '../../price-recalculation/services/price-recalculation.service'
import type { AppEnv } from '../../../types/hono.types'
import type { OtherCharge, OtherChargeListResponse } from '../types/other-charge.types'

export const otherChargeRoutes = new Hono<AppEnv>()

// GET /api/other-charges - List all other charges
otherChargeRoutes.get('/', authWithPermission(PERMISSIONS.OTHER_CHARGE.READ), async (c) => {
  try {
    const result = await otherChargeService.list()
    return successResponse<OtherChargeListResponse>(c, otherChargeMessages.LIST_FETCHED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/other-charges/:id - Get single other charge
otherChargeRoutes.get('/:id', authWithPermission(PERMISSIONS.OTHER_CHARGE.READ), async (c) => {
  try {
    const id = c.req.param('id')
    const result = await otherChargeService.getById(id)
    return successResponse<OtherCharge>(c, otherChargeMessages.FETCHED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// POST /api/other-charges - Create other charge
otherChargeRoutes.post('/', authWithPermission(PERMISSIONS.OTHER_CHARGE.CREATE), async (c) => {
  try {
    const body = await c.req.json()
    const data = createOtherChargeSchema.parse(body)
    const result = await otherChargeService.create(data)
    const user = c.get('user')
    priceRecalculationService.trigger('other_charge', user.id)
    return successResponse<OtherCharge>(c, otherChargeMessages.CREATED, result, 201)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// PUT /api/other-charges/:id - Update other charge
otherChargeRoutes.put('/:id', authWithPermission(PERMISSIONS.OTHER_CHARGE.UPDATE), async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()
    const data = updateOtherChargeSchema.parse(body)
    const result = await otherChargeService.update(id, data)
    const user = c.get('user')
    priceRecalculationService.trigger('other_charge', user.id)
    return successResponse<OtherCharge>(c, otherChargeMessages.UPDATED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// DELETE /api/other-charges/:id - Delete other charge
otherChargeRoutes.delete('/:id', authWithPermission(PERMISSIONS.OTHER_CHARGE.DELETE), async (c) => {
  try {
    const id = c.req.param('id')
    await otherChargeService.delete(id)
    const user = c.get('user')
    priceRecalculationService.trigger('other_charge', user.id)
    return successResponse(c, otherChargeMessages.DELETED, null)
  } catch (error) {
    return errorHandler(error, c)
  }
})
