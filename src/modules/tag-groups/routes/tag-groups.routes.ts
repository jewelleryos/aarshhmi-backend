import { Hono } from 'hono'
import { tagGroupService } from '../services/tag-groups.service'
import { tagGroupMessages } from '../config/tag-groups.messages'
import {
  createTagGroupSchema,
  updateTagGroupSchema,
  updateTagGroupSeoSchema,
} from '../config/tag-groups.schema'
import { successResponse } from '../../../utils/response'
import { errorHandler } from '../../../utils/error-handler'
import { authWithPermission } from '../../../middleware/auth.middleware'
import { PERMISSIONS } from '../../../config/permissions.constants'
import type { AppEnv } from '../../../types/hono.types'
import type { TagGroup, TagGroupListResponse } from '../types/tag-groups.types'

export const tagGroupRoutes = new Hono<AppEnv>()

// GET /api/tag-groups - List all tag groups (excluding system-generated)
tagGroupRoutes.get('/', authWithPermission(PERMISSIONS.TAG_GROUP.READ), async (c) => {
  try {
    const result = await tagGroupService.list()
    return successResponse<TagGroupListResponse>(c, tagGroupMessages.LIST_FETCHED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/tag-groups/for-product - Get tag groups for product dropdown
// Uses PRODUCT.CREATE permission so users can create products without tag group read access
// NOTE: This route must be defined BEFORE /:id to avoid matching 'for-product' as an id
tagGroupRoutes.get('/for-product', authWithPermission(PERMISSIONS.PRODUCT.CREATE), async (c) => {
  try {
    const result = await tagGroupService.getForProduct()
    return successResponse(c, 'Tag groups fetched successfully', { items: result })
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/tag-groups/for-product-edit - Get tag groups for product edit dropdown
// Uses PRODUCT.UPDATE permission for editing products
tagGroupRoutes.get('/for-product-edit', authWithPermission(PERMISSIONS.PRODUCT.UPDATE), async (c) => {
  try {
    const result = await tagGroupService.getForProduct()
    return successResponse(c, 'Tag groups fetched successfully', { items: result })
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/tag-groups/:id - Get single tag group
tagGroupRoutes.get('/:id', authWithPermission(PERMISSIONS.TAG_GROUP.READ), async (c) => {
  try {
    const id = c.req.param('id')
    const result = await tagGroupService.getById(id)
    return successResponse<TagGroup>(c, tagGroupMessages.FETCHED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// POST /api/tag-groups - Create tag group
tagGroupRoutes.post('/', authWithPermission(PERMISSIONS.TAG_GROUP.CREATE), async (c) => {
  try {
    const body = await c.req.json()
    const data = createTagGroupSchema.parse(body)
    const result = await tagGroupService.create(data)
    return successResponse<TagGroup>(c, tagGroupMessages.CREATED, result, 201)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// PUT /api/tag-groups/:id - Update tag group
tagGroupRoutes.put('/:id', authWithPermission(PERMISSIONS.TAG_GROUP.UPDATE), async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()
    const data = updateTagGroupSchema.parse(body)
    const result = await tagGroupService.update(id, data)
    return successResponse<TagGroup>(c, tagGroupMessages.UPDATED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// PUT /api/tag-groups/:id/seo - Update tag group SEO
tagGroupRoutes.put('/:id/seo', authWithPermission(PERMISSIONS.TAG_GROUP.UPDATE), async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()
    const data = updateTagGroupSeoSchema.parse(body)
    const result = await tagGroupService.updateSeo(id, data)
    return successResponse<TagGroup>(c, tagGroupMessages.SEO_UPDATED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// Note: DELETE endpoint intentionally not exposed (pending task)
