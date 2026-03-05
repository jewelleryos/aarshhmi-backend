import { Hono } from 'hono'
import { authWithPermission } from '../../../middleware/auth.middleware'
import { PERMISSIONS } from '../../../config/permissions.constants'
import { ENABLED_COUPON_TYPES, COUPON_TYPES } from '../../../config/coupon.config'
import { couponsService } from '../services/coupons.service'
import { couponMessages } from '../config/coupons.messages'
import { createCouponSchema, updateCouponSchema } from '../config/coupons.schema'
import { successResponse } from '../../../utils/response'
import { errorHandler } from '../../../utils/error-handler'
import type { AppEnv } from '../../../types/hono.types'

export const couponRoutes = new Hono<AppEnv>()

// GET / — list all coupons
couponRoutes.get('/', authWithPermission(PERMISSIONS.COUPON.READ), async (c) => {
  try {
    const filters = {
      type: c.req.query('type'),
      is_active: c.req.query('is_active'),
      search: c.req.query('search'),
    }
    const result = await couponsService.list(filters)
    return successResponse(c, couponMessages.LIST_FETCHED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /types — enabled coupon types for the type selector
couponRoutes.get('/types', authWithPermission(PERMISSIONS.COUPON.READ), async (c) => {
  try {
    const types = ENABLED_COUPON_TYPES.map((code) => COUPON_TYPES[code])
    return successResponse(c, couponMessages.TYPES_FETCHED, { types })
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /:id/check-dependency — check before delete
couponRoutes.get('/:id/check-dependency', authWithPermission(PERMISSIONS.COUPON.DELETE), async (c) => {
  try {
    const id = c.req.param('id')
    const result = await couponsService.checkDependency(id)
    const message = result.activeCartCount === 0
      ? couponMessages.NO_DEPENDENCIES
      : couponMessages.HAS_DEPENDENCIES
    return successResponse(c, message, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /:id — get single coupon
couponRoutes.get('/:id', authWithPermission(PERMISSIONS.COUPON.READ), async (c) => {
  try {
    const id = c.req.param('id')
    const result = await couponsService.getById(id)
    return successResponse(c, couponMessages.FETCHED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// POST / — create coupon
couponRoutes.post('/', authWithPermission(PERMISSIONS.COUPON.CREATE), async (c) => {
  try {
    const body = await c.req.json()
    const data = createCouponSchema.parse(body)
    const result = await couponsService.create(data)
    return successResponse(c, couponMessages.CREATED, result, 201)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// PUT /:id — update coupon
couponRoutes.put('/:id', authWithPermission(PERMISSIONS.COUPON.UPDATE), async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()
    const data = updateCouponSchema.parse(body)
    const result = await couponsService.update(id, data)
    return successResponse(c, couponMessages.UPDATED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// DELETE /:id — delete coupon
couponRoutes.delete('/:id', authWithPermission(PERMISSIONS.COUPON.DELETE), async (c) => {
  try {
    const id = c.req.param('id')
    await couponsService.delete(id)
    return successResponse(c, couponMessages.DELETED, null)
  } catch (error) {
    return errorHandler(error, c)
  }
})
