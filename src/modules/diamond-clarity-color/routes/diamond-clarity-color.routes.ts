import { Hono } from 'hono'
import { diamondClarityColorService } from '../services/diamond-clarity-color.service'
import { diamondClarityColorMessages } from '../config/diamond-clarity-color.messages'
import {
  createDiamondClarityColorSchema,
  updateDiamondClarityColorSchema,
} from '../config/diamond-clarity-color.schema'
import { successResponse } from '../../../utils/response'
import { errorHandler } from '../../../utils/error-handler'
import { authWithPermission } from '../../../middleware/auth.middleware'
import { PERMISSIONS } from '../../../config/permissions.constants'
import { STONE_GROUPS } from '../../../config/stone.config'
import { db } from '../../../lib/db'
import type { AppEnv } from '../../../types/hono.types'
import type { DiamondClarityColor, DiamondClarityColorListResponse } from '../types/diamond-clarity-color.types'

export const diamondClarityColorRoutes = new Hono<AppEnv>()

// GET /api/diamond-clarity-color/dropdown - Get qualities for dropdown (Diamond Pricing)
diamondClarityColorRoutes.get('/dropdown', authWithPermission(PERMISSIONS.DIAMOND_PRICING.CREATE), async (c) => {
  try {
    const result = await db.query(
      `SELECT id, name, slug FROM stone_qualities
       WHERE stone_group_id = $1 AND status = true
       ORDER BY name`,
      [STONE_GROUPS.DIAMOND]
    )
    return successResponse(c, 'Diamond clarity/colors fetched successfully', { items: result.rows })
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/diamond-clarity-color/for-product - Get diamond clarity colors for product dropdown
// Uses PRODUCT.CREATE permission so users can create products without diamond clarity color read access
diamondClarityColorRoutes.get('/for-product', authWithPermission(PERMISSIONS.PRODUCT.CREATE), async (c) => {
  try {
    const result = await diamondClarityColorService.getForProduct()
    return successResponse(c, 'Diamond clarity colors fetched successfully', { items: result })
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/diamond-clarity-color/for-product-edit - Get diamond clarity colors for product edit dropdown
// Uses PRODUCT.UPDATE permission so users can edit products without diamond clarity color read access
diamondClarityColorRoutes.get('/for-product-edit', authWithPermission(PERMISSIONS.PRODUCT.UPDATE), async (c) => {
  try {
    const result = await diamondClarityColorService.getForProduct()
    return successResponse(c, 'Diamond clarity colors fetched successfully', { items: result })
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/diamond-clarity-color/for-pricing-rule - Get diamond clarity colors for pricing rule dropdown
diamondClarityColorRoutes.get('/for-pricing-rule', authWithPermission(PERMISSIONS.PRICING_RULE.CREATE), async (c) => {
  try {
    const result = await diamondClarityColorService.getForProduct()
    return successResponse(c, 'Diamond clarity colors fetched successfully', { items: result })
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/diamond-clarity-color - List all diamond clarity/colors
diamondClarityColorRoutes.get('/', authWithPermission(PERMISSIONS.DIAMOND_CLARITY_COLOR.READ), async (c) => {
  try {
    const result = await diamondClarityColorService.list()
    return successResponse<DiamondClarityColorListResponse>(c, diamondClarityColorMessages.LIST_FETCHED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/diamond-clarity-color/:id - Get single diamond clarity/color
diamondClarityColorRoutes.get('/:id', authWithPermission(PERMISSIONS.DIAMOND_CLARITY_COLOR.READ), async (c) => {
  try {
    const id = c.req.param('id')
    const result = await diamondClarityColorService.getById(id)
    return successResponse<DiamondClarityColor>(c, diamondClarityColorMessages.FETCHED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// POST /api/diamond-clarity-color - Create diamond clarity/color
diamondClarityColorRoutes.post('/', authWithPermission(PERMISSIONS.DIAMOND_CLARITY_COLOR.CREATE), async (c) => {
  try {
    const body = await c.req.json()
    const data = createDiamondClarityColorSchema.parse(body)
    const result = await diamondClarityColorService.create(data)
    return successResponse<DiamondClarityColor>(c, diamondClarityColorMessages.CREATED, result, 201)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// PUT /api/diamond-clarity-color/:id - Update diamond clarity/color
diamondClarityColorRoutes.put('/:id', authWithPermission(PERMISSIONS.DIAMOND_CLARITY_COLOR.UPDATE), async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()
    const data = updateDiamondClarityColorSchema.parse(body)
    const result = await diamondClarityColorService.update(id, data)
    return successResponse<DiamondClarityColor>(c, diamondClarityColorMessages.UPDATED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})
