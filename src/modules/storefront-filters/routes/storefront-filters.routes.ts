import { Hono } from 'hono'
import { storefrontFiltersService } from '../services/storefront-filters.service'
import { priceFilterService } from '../services/price-filter.service'
import { sortByService } from '../services/sort-by.service'
import { groupConfigService } from '../services/group-config.service'
import {
  updateFilterGroupSchema,
  updateFilterValueSchema,
  createPriceFilterRangeSchema,
  updatePriceFilterRangeSchema,
  updateSortByOptionSchema,
  updateGroupConfigSchema,
} from '../config/storefront-filters.schema'
import { storefrontFiltersMessages } from '../config/storefront-filters.messages'
import { successResponse } from '../../../utils/response'
import { errorHandler } from '../../../utils/error-handler'
import { authWithPermission } from '../../../middleware/auth.middleware'
import { PERMISSIONS } from '../../../config/permissions.constants'
import type { AppEnv } from '../../../types/hono.types'

export const storefrontFiltersRoutes = new Hono<AppEnv>()

// GET /api/storefront-filters - List all filter groups with values
storefrontFiltersRoutes.get(
  '/',
  authWithPermission(PERMISSIONS.STOREFRONT_FILTER.READ),
  async (c) => {
    try {
      const filters = await storefrontFiltersService.list()
      return successResponse(c, storefrontFiltersMessages.LIST_FETCHED, filters)
    } catch (error) {
      return errorHandler(error, c)
    }
  }
)

// PUT /api/storefront-filters/:id - Update filter group settings
storefrontFiltersRoutes.put(
  '/:id',
  authWithPermission(PERMISSIONS.STOREFRONT_FILTER.UPDATE),
  async (c) => {
    try {
      const { id } = c.req.param()
      const body = await c.req.json()

      // Validate request body
      const validatedData = updateFilterGroupSchema.parse(body)

      const result = await storefrontFiltersService.updateGroup(id, validatedData)

      return successResponse(c, storefrontFiltersMessages.GROUP_UPDATED, result)
    } catch (error) {
      return errorHandler(error, c)
    }
  }
)

// PUT /api/storefront-filters/:id/values/:valueId - Update filter value settings
storefrontFiltersRoutes.put(
  '/:id/values/:valueId',
  authWithPermission(PERMISSIONS.STOREFRONT_FILTER.UPDATE),
  async (c) => {
    try {
      const { id, valueId } = c.req.param()
      const body = await c.req.json()

      // Validate request body
      const validatedData = updateFilterValueSchema.parse(body)

      const result = await storefrontFiltersService.updateValue(
        id,
        valueId,
        validatedData
      )

      return successResponse(c, storefrontFiltersMessages.VALUE_UPDATED, result)
    } catch (error) {
      return errorHandler(error, c)
    }
  }
)

// ============================================
// GROUP CONFIG
// ============================================

// GET /api/storefront-filters/group-config - List all group configs
storefrontFiltersRoutes.get(
  '/group-config',
  authWithPermission(PERMISSIONS.STOREFRONT_FILTER.READ),
  async (c) => {
    try {
      const items = await groupConfigService.list()
      return successResponse(c, storefrontFiltersMessages.GROUP_CONFIGS_FETCHED, {
        items,
      })
    } catch (error) {
      return errorHandler(error, c)
    }
  }
)

// PUT /api/storefront-filters/group-config/:id - Update a group config
storefrontFiltersRoutes.put(
  '/group-config/:id',
  authWithPermission(PERMISSIONS.STOREFRONT_FILTER.UPDATE),
  async (c) => {
    try {
      const { id } = c.req.param()
      const body = await c.req.json()
      const validatedData = updateGroupConfigSchema.parse(body)
      const result = await groupConfigService.update(id, validatedData)
      return successResponse(
        c,
        storefrontFiltersMessages.GROUP_CONFIG_UPDATED,
        result
      )
    } catch (error) {
      return errorHandler(error, c)
    }
  }
)

// ============================================
// PRICE FILTER RANGES
// ============================================

// GET /api/storefront-filters/price-ranges - List all price ranges
storefrontFiltersRoutes.get(
  '/price-ranges',
  authWithPermission(PERMISSIONS.STOREFRONT_FILTER.READ),
  async (c) => {
    try {
      const items = await priceFilterService.list()
      return successResponse(c, storefrontFiltersMessages.PRICE_RANGES_FETCHED, {
        items,
      })
    } catch (error) {
      return errorHandler(error, c)
    }
  }
)

// POST /api/storefront-filters/price-ranges - Create a price range
storefrontFiltersRoutes.post(
  '/price-ranges',
  authWithPermission(PERMISSIONS.STOREFRONT_FILTER.UPDATE),
  async (c) => {
    try {
      const body = await c.req.json()
      const validatedData = createPriceFilterRangeSchema.parse(body)
      const result = await priceFilterService.create(validatedData)
      return successResponse(
        c,
        storefrontFiltersMessages.PRICE_RANGE_CREATED,
        result
      )
    } catch (error) {
      return errorHandler(error, c)
    }
  }
)

// PUT /api/storefront-filters/price-ranges/:id - Update a price range
storefrontFiltersRoutes.put(
  '/price-ranges/:id',
  authWithPermission(PERMISSIONS.STOREFRONT_FILTER.UPDATE),
  async (c) => {
    try {
      const { id } = c.req.param()
      const body = await c.req.json()
      const validatedData = updatePriceFilterRangeSchema.parse(body)
      const result = await priceFilterService.update(id, validatedData)
      return successResponse(
        c,
        storefrontFiltersMessages.PRICE_RANGE_UPDATED,
        result
      )
    } catch (error) {
      return errorHandler(error, c)
    }
  }
)

// DELETE /api/storefront-filters/price-ranges/:id - Soft delete a price range
storefrontFiltersRoutes.delete(
  '/price-ranges/:id',
  authWithPermission(PERMISSIONS.STOREFRONT_FILTER.UPDATE),
  async (c) => {
    try {
      const { id } = c.req.param()
      const result = await priceFilterService.delete(id)
      return successResponse(
        c,
        storefrontFiltersMessages.PRICE_RANGE_DELETED,
        result
      )
    } catch (error) {
      return errorHandler(error, c)
    }
  }
)

// ============================================
// SORT-BY OPTIONS
// ============================================

// GET /api/storefront-filters/sort-by - List all sort-by options
storefrontFiltersRoutes.get(
  '/sort-by',
  authWithPermission(PERMISSIONS.STOREFRONT_FILTER.READ),
  async (c) => {
    try {
      const items = await sortByService.list()
      return successResponse(c, storefrontFiltersMessages.SORT_BY_OPTIONS_FETCHED, {
        items,
      })
    } catch (error) {
      return errorHandler(error, c)
    }
  }
)

// PUT /api/storefront-filters/sort-by/:id - Update a sort-by option
storefrontFiltersRoutes.put(
  '/sort-by/:id',
  authWithPermission(PERMISSIONS.STOREFRONT_FILTER.UPDATE),
  async (c) => {
    try {
      const { id } = c.req.param()
      const body = await c.req.json()
      const validatedData = updateSortByOptionSchema.parse(body)
      const result = await sortByService.update(id, validatedData)
      return successResponse(
        c,
        storefrontFiltersMessages.SORT_BY_OPTION_UPDATED,
        result
      )
    } catch (error) {
      return errorHandler(error, c)
    }
  }
)
