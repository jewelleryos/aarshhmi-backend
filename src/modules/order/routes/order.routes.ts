import { Hono } from 'hono'
import { authWithPermission } from '../../../middleware/auth.middleware'
import { PERMISSIONS } from '../../../config/permissions.constants'
import { orderService } from '../services/order.service'
import { orderMessages } from '../config/order.messages'
import { successResponse } from '../../../utils/response'
import { errorHandler } from '../../../utils/error-handler'
import type { AppEnv } from '../../../types/hono.types'

export const orderRoutes = new Hono<AppEnv>()

// GET / — List all orders
orderRoutes.get('/', authWithPermission(PERMISSIONS.ORDER.READ), async (c) => {
  try {
    const result = await orderService.list()
    return successResponse(c, orderMessages.LIST_FETCHED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /:id — Order detail with items, logs, and payments
orderRoutes.get('/:id', authWithPermission(PERMISSIONS.ORDER.READ), async (c) => {
  try {
    const orderId = c.req.param('id')
    const result = await orderService.getById(orderId)
    return successResponse(c, orderMessages.FETCHED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// PATCH /:id/items/:itemId/stage — Update sub-order stage
orderRoutes.patch('/:id/items/:itemId/stage', authWithPermission(PERMISSIONS.ORDER.UPDATE), async (c) => {
  try {
    const orderId = c.req.param('id')
    const itemId = c.req.param('itemId')
    const adminId = c.get('user').id
    const body = await c.req.json()
    const result = await orderService.updateItemStage(orderId, itemId, adminId, body)
    return successResponse(c, orderMessages.STAGE_UPDATED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})
