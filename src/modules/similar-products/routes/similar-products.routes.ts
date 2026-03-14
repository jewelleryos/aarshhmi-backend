import { Hono } from 'hono'
import { successResponse } from '../../../utils/response'
import { errorHandler } from '../../../utils/error-handler'
import { authWithPermission } from '../../../middleware/auth.middleware'
import { PERMISSIONS } from '../../../config/permissions.constants'
import { db } from '../../../lib/db'
import { similarProductsService } from '../services/similar-products.service'
import { similarProductsSyncService } from '../services/similar-products-sync.service'
import { similarProductsMessages } from '../config/similar-products.messages'
import { updateManualPicksSchema } from '../config/similar-products.schema'
import type { AppEnv } from '../../../types/hono.types'

export const similarProductsRoutes = new Hono<AppEnv>()

// GET /api/similar-products - List all products with similar counts
similarProductsRoutes.get('/', authWithPermission(PERMISSIONS.SIMILAR_PRODUCTS.READ), async (c) => {
  try {
    const search = c.req.query('search')
    const page = parseInt(c.req.query('page') || '1')
    const limit = parseInt(c.req.query('limit') || '20')

    const result = await similarProductsService.listProducts({ search, page, limit })
    return successResponse(c, similarProductsMessages.PRODUCTS_FETCHED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// POST /api/similar-products/sync - Trigger sync
similarProductsRoutes.post('/sync', authWithPermission(PERMISSIONS.SIMILAR_PRODUCTS.UPDATE), async (c) => {
  try {
    const user = c.get('user')
    similarProductsSyncService.trigger(user.id)
    return successResponse(c, similarProductsMessages.SYNC_TRIGGERED, null)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/similar-products/products-for-selection - Get all active products for selection
similarProductsRoutes.get('/products-for-selection', authWithPermission(PERMISSIONS.SIMILAR_PRODUCTS.READ), async (c) => {
  try {
    const result = await db.query(
      `SELECT p.id, p.name, p.base_sku FROM products p WHERE p.status = 'active' ORDER BY p.base_sku ASC`
    )
    return successResponse(c, 'Products fetched successfully', { items: result.rows })
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/similar-products/:productId - Get similar products for a product
similarProductsRoutes.get('/:productId', authWithPermission(PERMISSIONS.SIMILAR_PRODUCTS.READ), async (c) => {
  try {
    const productId = c.req.param('productId')
    const result = await similarProductsService.getSimilarProducts(productId)
    return successResponse(c, similarProductsMessages.SIMILAR_PRODUCTS_FETCHED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// PUT /api/similar-products/:productId - Update manual similar products
similarProductsRoutes.put('/:productId', authWithPermission(PERMISSIONS.SIMILAR_PRODUCTS.UPDATE), async (c) => {
  try {
    const productId = c.req.param('productId')
    const body = await c.req.json()
    const validated = updateManualPicksSchema.parse(body)
    const result = await similarProductsService.updateManualPicks(productId, validated.manual_product_ids, validated.removed_system_product_ids)
    return successResponse(c, similarProductsMessages.MANUAL_PICKS_UPDATED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})
