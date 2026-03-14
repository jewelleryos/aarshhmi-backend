import { Hono } from 'hono'
import { successResponse } from '../../../utils/response'
import { errorHandler } from '../../../utils/error-handler'
import { productReviewService } from '../services/product-review.service'
import type { StorefrontReviewResponse } from '../types/product-review.types'

export const storefrontReviewRoutes = new Hono()

// GET /api/storefront/reviews/:sku - Get reviews by product SKU (public)
storefrontReviewRoutes.get('/:sku', async (c) => {
  try {
    const sku = c.req.param('sku')
    const result = await productReviewService.getByProductSku(sku)
    return successResponse<StorefrontReviewResponse>(c, 'Reviews fetched', result)
  } catch (error) {
    return errorHandler(error, c)
  }
})
