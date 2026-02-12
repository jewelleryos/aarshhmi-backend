import { Hono } from 'hono'
import { categoryService } from '../services/categories.service'
import { categoryMessages } from '../config/categories.messages'
import {
  createCategorySchema,
  updateCategorySchema,
  updateCategorySeoSchema,
} from '../config/categories.schema'
import { successResponse } from '../../../utils/response'
import { errorHandler } from '../../../utils/error-handler'
import { authWithPermission } from '../../../middleware/auth.middleware'
import { PERMISSIONS } from '../../../config/permissions.constants'
import type { AppEnv } from '../../../types/hono.types'
import type {
  Category,
  CategoryListResponse,
  CategoryFlatListResponse,
} from '../types/categories.types'

export const categoryRoutes = new Hono<AppEnv>()

// GET /api/categories - List all categories (hierarchical)
categoryRoutes.get('/', authWithPermission(PERMISSIONS.CATEGORY.READ), async (c) => {
  try {
    const result = await categoryService.list()
    return successResponse<CategoryListResponse>(c, categoryMessages.LIST_FETCHED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/categories/flat - List all categories (flat for dropdowns)
categoryRoutes.get('/flat', authWithPermission(PERMISSIONS.CATEGORY.READ), async (c) => {
  try {
    const result = await categoryService.listFlat()
    return successResponse<CategoryFlatListResponse>(c, categoryMessages.LIST_FETCHED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/categories/for-product - Get categories for product dropdown
// Uses PRODUCT.CREATE permission so users can create products without category read access
// NOTE: This route must be defined BEFORE /:id to avoid matching 'for-product' as an id
categoryRoutes.get('/for-product', authWithPermission(PERMISSIONS.PRODUCT.CREATE), async (c) => {
  try {
    const result = await categoryService.getForProduct()
    return successResponse(c, 'Categories fetched successfully', { items: result })
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/categories/for-pricing-rule - Get categories for pricing rule dropdown
// Uses PRICING_RULE.CREATE permission so users can create pricing rules without category read access
categoryRoutes.get('/for-pricing-rule', authWithPermission(PERMISSIONS.PRICING_RULE.CREATE), async (c) => {
  try {
    const result = await categoryService.getForPricingRule()
    return successResponse(c, 'Categories fetched successfully', { items: result })
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/categories/for-product-edit - Get categories for product edit dropdown
// Uses PRODUCT.UPDATE permission for editing products
categoryRoutes.get('/for-product-edit', authWithPermission(PERMISSIONS.PRODUCT.UPDATE), async (c) => {
  try {
    const result = await categoryService.getForProduct()
    return successResponse(c, 'Categories fetched successfully', { items: result })
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/categories/:id - Get single category
categoryRoutes.get('/:id', authWithPermission(PERMISSIONS.CATEGORY.READ), async (c) => {
  try {
    const id = c.req.param('id')
    const result = await categoryService.getById(id)
    return successResponse<Category>(c, categoryMessages.FETCHED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// POST /api/categories - Create category
categoryRoutes.post('/', authWithPermission(PERMISSIONS.CATEGORY.CREATE), async (c) => {
  try {
    const body = await c.req.json()
    const data = createCategorySchema.parse(body)
    const result = await categoryService.create(data)
    return successResponse<Category>(c, categoryMessages.CREATED, result, 201)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// PUT /api/categories/:id - Update category
categoryRoutes.put('/:id', authWithPermission(PERMISSIONS.CATEGORY.UPDATE), async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()
    const data = updateCategorySchema.parse(body)
    const result = await categoryService.update(id, data)
    return successResponse<Category>(c, categoryMessages.UPDATED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// PUT /api/categories/:id/seo - Update category SEO
categoryRoutes.put('/:id/seo', authWithPermission(PERMISSIONS.CATEGORY.UPDATE), async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()
    const data = updateCategorySeoSchema.parse(body)
    const result = await categoryService.updateSeo(id, data)
    return successResponse<Category>(c, categoryMessages.SEO_UPDATED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// Note: DELETE endpoint intentionally not exposed (pending task)
