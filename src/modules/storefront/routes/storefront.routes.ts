import { Hono } from 'hono'
import { successResponse } from '../../../utils/response'
import { errorHandler } from '../../../utils/error-handler'
import { AppError } from '../../../utils/app-error'
import { HTTP_STATUS } from '../../../config/constants'
import { storefrontMessages } from '../config/storefront.messages'
import { storefrontFiltersService } from '../services/storefront-filters.service'
import { storefrontProductsService } from '../services/storefront-products.service'

export const storefrontRoutes = new Hono()

// POST /filters - Public endpoint, no auth required
storefrontRoutes.post('/filters', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}))

    const categories = body.categories || []
    const tags = body.tags || []
    const price_ranges = body.price_ranges || []

    console.log('Filters API body:', JSON.stringify(body))

    const result = await storefrontFiltersService.getFilters({
      categories,
      tags,
      price_ranges,
    })

    return successResponse(c, storefrontMessages.FILTERS_FETCHED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// POST /products - Public endpoint, no auth required
storefrontRoutes.post('/products', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}))

    const result = await storefrontProductsService.getProducts({
      categories: body.categories || [],
      tags: body.tags || [],
      price_ranges: body.price_ranges || [],
      sort_by: body.sort_by,
      page: body.page,
      limit: body.limit,
    })

    return successResponse(c, storefrontMessages.PRODUCTS_FETCHED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// POST /products/detail - Public endpoint, no auth required
storefrontRoutes.post('/products/detail', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}))

    if (!body.slug && !body.productSku) {
      throw new AppError(
        storefrontMessages.PRODUCT_DETAIL_IDENTIFIER_REQUIRED,
        HTTP_STATUS.BAD_REQUEST
      )
    }

    const result = await storefrontProductsService.getProductDetail({
      slug: body.slug,
      productSku: body.productSku,
      variantSku: body.variantSku,
      sizeChartValueId: body.sizeChartValueId,
    })

    return successResponse(c, storefrontMessages.PRODUCT_DETAIL_FETCHED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})
