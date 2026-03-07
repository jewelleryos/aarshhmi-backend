import { Hono } from 'hono'
import { successResponse } from '../../../utils/response'
import { errorHandler } from '../../../utils/error-handler'
import { authWithPermission } from '../../../middleware/auth.middleware'
import { PERMISSIONS } from '../../../config/permissions.constants'
import { productReviewService } from '../services/product-review.service'
import { productReviewMessages } from '../config/product-review.messages'
import {
  createProductReviewSchema,
  updateProductReviewSchema,
  updateApprovalSchema,
  updateStatusSchema,
} from '../config/product-review.schema'
import type { AppEnv } from '../../../types/hono.types'
import type {
  ProductReview,
  ProductReviewListResponse,
} from '../types/product-review.types'

export const productReviewRoutes = new Hono<AppEnv>()

// GET /api/product-reviews - List all reviews
productReviewRoutes.get('/', authWithPermission(PERMISSIONS.PRODUCT_REVIEW.READ), async (c) => {
  try {
    const result = await productReviewService.list()
    return successResponse<ProductReviewListResponse>(c, productReviewMessages.LIST_FETCHED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/product-reviews/products-dropdown - Products for dropdown
productReviewRoutes.get('/products-dropdown', authWithPermission(PERMISSIONS.PRODUCT_REVIEW.CREATE), async (c) => {
  try {
    const result = await productReviewService.getProductsForDropdown()
    return successResponse(c, 'Products fetched', { items: result })
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/product-reviews/:id - Get single review
productReviewRoutes.get('/:id', authWithPermission(PERMISSIONS.PRODUCT_REVIEW.READ), async (c) => {
  try {
    const id = c.req.param('id')
    const result = await productReviewService.getById(id)
    return successResponse<ProductReview>(c, productReviewMessages.FETCHED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// POST /api/product-reviews - Create system review
productReviewRoutes.post('/', authWithPermission(PERMISSIONS.PRODUCT_REVIEW.CREATE), async (c) => {
  try {
    const body = await c.req.json()
    const data = createProductReviewSchema.parse(body)
    const result = await productReviewService.create(data)
    return successResponse<ProductReview>(c, productReviewMessages.CREATED, result, 201)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// PUT /api/product-reviews/:id - Update system review
productReviewRoutes.put('/:id', authWithPermission(PERMISSIONS.PRODUCT_REVIEW.UPDATE), async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()
    const data = updateProductReviewSchema.parse(body)
    const result = await productReviewService.update(id, data)
    return successResponse<ProductReview>(c, productReviewMessages.UPDATED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// PATCH /api/product-reviews/:id/approval - Update approval status (user reviews only)
productReviewRoutes.patch('/:id/approval', authWithPermission(PERMISSIONS.PRODUCT_REVIEW.USER_STATUS_UPDATE), async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()
    const data = updateApprovalSchema.parse(body)
    const result = await productReviewService.updateApproval(id, data.approval_status)
    return successResponse<ProductReview>(c, productReviewMessages.APPROVAL_UPDATED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// PATCH /api/product-reviews/:id/status - Toggle status
productReviewRoutes.patch('/:id/status', authWithPermission(PERMISSIONS.PRODUCT_REVIEW.UPDATE), async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()
    const data = updateStatusSchema.parse(body)
    const result = await productReviewService.updateStatus(id, data.status)
    return successResponse<ProductReview>(c, productReviewMessages.STATUS_UPDATED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// DELETE /api/product-reviews/:id - Delete review
productReviewRoutes.delete('/:id', authWithPermission(PERMISSIONS.PRODUCT_REVIEW.DELETE), async (c) => {
  try {
    const id = c.req.param('id')
    await productReviewService.delete(id)
    return successResponse(c, productReviewMessages.DELETED, null)
  } catch (error) {
    return errorHandler(error, c)
  }
})
