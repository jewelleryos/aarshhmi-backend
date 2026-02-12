import { Hono } from 'hono'
import { tagService } from '../services/tags.service'
import { tagMessages } from '../config/tags.messages'
import {
  createTagSchema,
  updateTagSchema,
  updateTagSeoSchema,
} from '../config/tags.schema'
import { successResponse } from '../../../utils/response'
import { errorHandler } from '../../../utils/error-handler'
import { authWithPermission } from '../../../middleware/auth.middleware'
import { PERMISSIONS } from '../../../config/permissions.constants'
import type { AppEnv } from '../../../types/hono.types'
import type { TagWithGroup, TagListResponse } from '../types/tags.types'

export const tagRoutes = new Hono<AppEnv>()

// GET /api/tags - List all tags (with optional group filter)
tagRoutes.get('/', authWithPermission(PERMISSIONS.TAG.READ), async (c) => {
  try {
    const tagGroupId = c.req.query('tag_group_id')
    const query = tagGroupId ? { tag_group_id: tagGroupId } : undefined
    const result = await tagService.list(query)
    return successResponse<TagListResponse>(c, tagMessages.LIST_FETCHED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/tags/for-product - Get tags for product dropdown
// Uses PRODUCT.CREATE permission so users can create products without tag read access
// NOTE: This route must be defined BEFORE /:id to avoid matching 'for-product' as an id
tagRoutes.get('/for-product', authWithPermission(PERMISSIONS.PRODUCT.CREATE), async (c) => {
  try {
    const result = await tagService.getForProduct()
    return successResponse(c, 'Tags fetched successfully', { items: result })
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/tags/for-pricing-rule - Get tags for pricing rule dropdown
// Uses PRICING_RULE.CREATE permission so users can create pricing rules without tag read access
// NOTE: This route must be defined BEFORE /:id to avoid matching 'for-pricing-rule' as an id
tagRoutes.get('/for-pricing-rule', authWithPermission(PERMISSIONS.PRICING_RULE.CREATE), async (c) => {
  try {
    const result = await tagService.getForPricingRule()
    return successResponse(c, 'Tags fetched successfully', { items: result })
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/tags/for-product-edit - Get tags for product edit dropdown
// Uses PRODUCT.UPDATE permission for editing products
tagRoutes.get('/for-product-edit', authWithPermission(PERMISSIONS.PRODUCT.UPDATE), async (c) => {
  try {
    const result = await tagService.getForProduct()
    return successResponse(c, 'Tags fetched successfully', { items: result })
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/tags/:id - Get single tag
tagRoutes.get('/:id', authWithPermission(PERMISSIONS.TAG.READ), async (c) => {
  try {
    const id = c.req.param('id')
    const result = await tagService.getById(id)
    return successResponse<TagWithGroup>(c, tagMessages.FETCHED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// POST /api/tags - Create tag
tagRoutes.post('/', authWithPermission(PERMISSIONS.TAG.CREATE), async (c) => {
  try {
    const body = await c.req.json()
    const data = createTagSchema.parse(body)
    const result = await tagService.create(data)
    return successResponse<TagWithGroup>(c, tagMessages.CREATED, result, 201)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// PUT /api/tags/:id - Update tag
tagRoutes.put('/:id', authWithPermission(PERMISSIONS.TAG.UPDATE), async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()
    const data = updateTagSchema.parse(body)
    const result = await tagService.update(id, data)
    return successResponse<TagWithGroup>(c, tagMessages.UPDATED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// PUT /api/tags/:id/seo - Update tag SEO
tagRoutes.put('/:id/seo', authWithPermission(PERMISSIONS.TAG.UPDATE), async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()
    const data = updateTagSeoSchema.parse(body)
    const result = await tagService.updateSeo(id, data)
    return successResponse<TagWithGroup>(c, tagMessages.SEO_UPDATED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// Note: DELETE endpoint intentionally not exposed (pending task)
