import { Hono } from 'hono'
import { customerService } from '../services/customers.service'
import { customerMessages } from '../config/customers.messages'
import { successResponse } from '../../../utils/response'
import { errorHandler } from '../../../utils/error-handler'
import { authWithPermission } from '../../../middleware/auth.middleware'
import { PERMISSIONS } from '../../../config/permissions.constants'
import type { AppEnv } from '../../../types/hono.types'
import type { CustomerListResponse } from '../types/customers.types'

export const customerRoutes = new Hono<AppEnv>()

// GET /api/customers - List all customers
customerRoutes.get('/', authWithPermission(PERMISSIONS.CUSTOMER.READ), async (c) => {
  try {
    const result = await customerService.list()
    return successResponse<CustomerListResponse>(c, customerMessages.LIST_FETCHED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/customers/for-coupon - Get customers for coupon dropdown (create)
// Uses COUPON.CREATE permission so users can create coupons without customer read access
// NOTE: This route must be defined BEFORE /:id to avoid matching 'for-coupon' as an id
customerRoutes.get('/for-coupon', authWithPermission(PERMISSIONS.COUPON.CREATE), async (c) => {
  try {
    const result = await customerService.getForCoupon()
    return successResponse(c, customerMessages.FOR_COUPON_FETCHED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/customers/for-coupon-edit - Get customers for coupon dropdown (edit)
// Uses COUPON.UPDATE permission for editing coupons
customerRoutes.get('/for-coupon-edit', authWithPermission(PERMISSIONS.COUPON.UPDATE), async (c) => {
  try {
    const result = await customerService.getForCoupon()
    return successResponse(c, customerMessages.FOR_COUPON_FETCHED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})
