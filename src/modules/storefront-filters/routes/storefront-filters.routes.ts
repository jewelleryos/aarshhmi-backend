import { Hono } from 'hono'
import { storefrontFiltersService } from '../services/storefront-filters.service'
import {
  updateFilterGroupSchema,
  updateFilterValueSchema,
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
