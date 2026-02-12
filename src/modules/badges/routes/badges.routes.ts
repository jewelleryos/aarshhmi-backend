import { Hono } from 'hono'
import { badgeService } from '../services/badges.service'
import { badgeMessages } from '../config/badges.messages'
import { createBadgeSchema, updateBadgeSchema } from '../config/badges.schema'
import { successResponse } from '../../../utils/response'
import { errorHandler } from '../../../utils/error-handler'
import { authWithPermission } from '../../../middleware/auth.middleware'
import { PERMISSIONS } from '../../../config/permissions.constants'
import type { AppEnv } from '../../../types/hono.types'
import type { Badge, BadgeListResponse } from '../types/badges.types'

export const badgeRoutes = new Hono<AppEnv>()

// GET /api/badges - List all badges
badgeRoutes.get('/', authWithPermission(PERMISSIONS.BADGE.READ), async (c) => {
  try {
    const result = await badgeService.list()
    return successResponse<BadgeListResponse>(c, badgeMessages.LIST_FETCHED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/badges/for-product - Get badges for product dropdown
// Uses PRODUCT.CREATE permission so users can create products without badge read access
// NOTE: This route must be defined BEFORE /:id to avoid matching 'for-product' as an id
badgeRoutes.get('/for-product', authWithPermission(PERMISSIONS.PRODUCT.CREATE), async (c) => {
  try {
    const result = await badgeService.getForProduct()
    return successResponse(c, 'Badges fetched successfully', { items: result })
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/badges/for-pricing-rule - Get badges for pricing rule dropdown
// Uses PRICING_RULE.CREATE permission
badgeRoutes.get('/for-pricing-rule', authWithPermission(PERMISSIONS.PRICING_RULE.CREATE), async (c) => {
  try {
    const result = await badgeService.getForProduct()
    return successResponse(c, 'Badges fetched successfully', { items: result })
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/badges/for-product-edit - Get badges for product edit dropdown
// Uses PRODUCT.UPDATE permission for editing products
badgeRoutes.get('/for-product-edit', authWithPermission(PERMISSIONS.PRODUCT.UPDATE), async (c) => {
  try {
    const result = await badgeService.getForProduct()
    return successResponse(c, 'Badges fetched successfully', { items: result })
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/badges/:id - Get single badge
badgeRoutes.get('/:id', authWithPermission(PERMISSIONS.BADGE.READ), async (c) => {
  try {
    const id = c.req.param('id')
    const result = await badgeService.getById(id)
    return successResponse<Badge>(c, badgeMessages.FETCHED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// POST /api/badges - Create badge
badgeRoutes.post('/', authWithPermission(PERMISSIONS.BADGE.CREATE), async (c) => {
  try {
    const body = await c.req.json()
    const data = createBadgeSchema.parse(body)
    const result = await badgeService.create(data)
    return successResponse<Badge>(c, badgeMessages.CREATED, result, 201)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// PUT /api/badges/:id - Update badge
badgeRoutes.put('/:id', authWithPermission(PERMISSIONS.BADGE.UPDATE), async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()
    const data = updateBadgeSchema.parse(body)
    const result = await badgeService.update(id, data)
    return successResponse<Badge>(c, badgeMessages.UPDATED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// Note: DELETE endpoint intentionally not exposed (pending task)
