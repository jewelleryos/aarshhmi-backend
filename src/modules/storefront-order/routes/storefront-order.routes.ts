import { Hono } from 'hono'
import { customerAuth } from '../../customer-auth/middleware/customer-auth.middleware'
import { storefrontOrderService } from '../services/storefront-order.service'
import { storefrontOrderMessages } from '../config/storefront-order.messages'
import { checkoutSchema, verifyPaymentSchema } from '../config/storefront-order.schema'
import { successResponse } from '../../../utils/response'
import { errorHandler } from '../../../utils/error-handler'
import { HTTP_STATUS } from '../../../config/constants'
import type { AppEnv } from '../../../types/hono.types'
import type { AuthCustomer } from '../../customer-auth/middleware/customer-auth.middleware'

export const storefrontOrderRoutes = new Hono<AppEnv>()

// POST /orders — Checkout (create order + Razorpay order)
storefrontOrderRoutes.post('/', customerAuth(), async (c) => {
  try {
    const customer = c.get('customer') as AuthCustomer
    const body = await c.req.json()
    const data = checkoutSchema.parse(body)
    const result = await storefrontOrderService.checkout(customer, data)
    return successResponse(c, storefrontOrderMessages.ORDER_CREATED, result, HTTP_STATUS.CREATED)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// POST /orders/:id/verify-payment — Verify Razorpay payment
storefrontOrderRoutes.post('/:id/verify-payment', customerAuth(), async (c) => {
  try {
    const customer = c.get('customer') as AuthCustomer
    const orderId = c.req.param('id')
    const body = await c.req.json()
    const data = verifyPaymentSchema.parse(body)
    const result = await storefrontOrderService.verifyPayment(customer, orderId, data)
    return successResponse(c, storefrontOrderMessages.PAYMENT_VERIFIED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// POST /orders/items/:itemId/cancel-request — Customer cancel request
storefrontOrderRoutes.post('/items/:itemId/cancel-request', customerAuth(), async (c) => {
  try {
    const customer = c.get('customer') as AuthCustomer
    const itemId = c.req.param('itemId')
    const body = await c.req.json()
    const reason = body.reason?.trim()
    if (!reason) {
      return c.json({ success: false, message: storefrontOrderMessages.CANCEL_REASON_REQUIRED }, HTTP_STATUS.BAD_REQUEST)
    }
    await storefrontOrderService.requestCancellation(customer.id, itemId, reason)
    return successResponse(c, storefrontOrderMessages.CANCEL_REQUESTED, null)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// POST /orders/items/:itemId/return-request — Customer return request (multipart: reason + up to 5 files)
storefrontOrderRoutes.post('/items/:itemId/return-request', customerAuth(), async (c) => {
  try {
    const customer = c.get('customer') as AuthCustomer
    const itemId = c.req.param('itemId')

    let reason = ''
    let files: File[] = []

    const contentType = c.req.header('content-type') || ''
    if (contentType.includes('multipart/form-data')) {
      const formData = await c.req.formData()
      reason = (formData.get('reason') as string)?.trim() || ''
      files = formData.getAll('files').filter((f): f is File => f instanceof File)
    } else {
      const body = await c.req.json()
      reason = body.reason?.trim() || ''
    }

    if (!reason) {
      return c.json({ success: false, message: storefrontOrderMessages.RETURN_REASON_REQUIRED }, HTTP_STATUS.BAD_REQUEST)
    }

    // Validate file count
    if (files.length > 5) {
      return c.json({ success: false, message: storefrontOrderMessages.RETURN_TOO_MANY_FILES }, HTTP_STATUS.BAD_REQUEST)
    }

    // Validate file types and sizes
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    const allowedVideoTypes = ['video/mp4']
    const maxImageSize = 10 * 1024 * 1024   // 10MB
    const maxVideoSize = 100 * 1024 * 1024  // 100MB

    for (const file of files) {
      if (!allowedImageTypes.includes(file.type) && !allowedVideoTypes.includes(file.type)) {
        return c.json({ success: false, message: storefrontOrderMessages.RETURN_INVALID_FILE_TYPE }, HTTP_STATUS.BAD_REQUEST)
      }
      const maxSize = allowedImageTypes.includes(file.type) ? maxImageSize : maxVideoSize
      if (file.size > maxSize) {
        return c.json({ success: false, message: storefrontOrderMessages.RETURN_FILE_TOO_LARGE }, HTTP_STATUS.BAD_REQUEST)
      }
    }

    await storefrontOrderService.requestReturn(customer.id, itemId, reason, files)
    return successResponse(c, storefrontOrderMessages.RETURN_REQUESTED, null)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /orders — List customer orders
storefrontOrderRoutes.get('/', customerAuth(), async (c) => {
  try {
    const customer = c.get('customer') as AuthCustomer
    const orders = await storefrontOrderService.getOrders(customer.id)
    return successResponse(c, storefrontOrderMessages.ORDERS_FETCHED, orders)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /orders/:id — Order detail with items
storefrontOrderRoutes.get('/:id', customerAuth(), async (c) => {
  try {
    const customer = c.get('customer') as AuthCustomer
    const orderId = c.req.param('id')
    const order = await storefrontOrderService.getOrder(customer.id, orderId)
    return successResponse(c, storefrontOrderMessages.ORDER_FETCHED, order)
  } catch (error) {
    return errorHandler(error, c)
  }
})
