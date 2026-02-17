import { Hono } from 'hono'
import { makingChargeService } from '../services/making-charge.service'
import { makingChargeMessages } from '../config/making-charge.messages'
import { createMakingChargeSchema, updateMakingChargeSchema } from '../config/making-charge.schema'
import { successResponse } from '../../../utils/response'
import { errorHandler } from '../../../utils/error-handler'
import { authWithPermission } from '../../../middleware/auth.middleware'
import { PERMISSIONS } from '../../../config/permissions.constants'
import { priceRecalculationService } from '../../price-recalculation/services/price-recalculation.service'
import type { AppEnv } from '../../../types/hono.types'
import type { MakingChargeWithMetalType, MakingChargeListResponse } from '../types/making-charge.types'

export const makingChargeRoutes = new Hono<AppEnv>()

// GET /api/making-charges - List all making charges
makingChargeRoutes.get('/', authWithPermission(PERMISSIONS.MAKING_CHARGE.READ), async (c) => {
  try {
    const result = await makingChargeService.list()
    return successResponse<MakingChargeListResponse>(c, makingChargeMessages.LIST_FETCHED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/making-charges/:id - Get single making charge
makingChargeRoutes.get('/:id', authWithPermission(PERMISSIONS.MAKING_CHARGE.READ), async (c) => {
  try {
    const id = c.req.param('id')
    const result = await makingChargeService.getById(id)
    return successResponse<MakingChargeWithMetalType>(c, makingChargeMessages.FETCHED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// POST /api/making-charges - Create making charge
makingChargeRoutes.post('/', authWithPermission(PERMISSIONS.MAKING_CHARGE.CREATE), async (c) => {
  try {
    const body = await c.req.json()
    const data = createMakingChargeSchema.parse(body)
    const result = await makingChargeService.create(data)
    return successResponse<MakingChargeWithMetalType>(c, makingChargeMessages.CREATED, result, 201)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// PUT /api/making-charges/:id - Update making charge
makingChargeRoutes.put('/:id', authWithPermission(PERMISSIONS.MAKING_CHARGE.UPDATE), async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()
    const data = updateMakingChargeSchema.parse(body)
    const result = await makingChargeService.update(id, data)
    const user = c.get('user')
    priceRecalculationService.trigger('making_charge', user.id)
    return successResponse<MakingChargeWithMetalType>(c, makingChargeMessages.UPDATED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// Note: DELETE endpoint intentionally not exposed (pending task)
