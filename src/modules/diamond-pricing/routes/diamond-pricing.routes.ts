import { Hono } from 'hono'
import { diamondPricingService } from '../services/diamond-pricing.service'
import { diamondPricingBulkService, BulkCreateValidationError } from '../services/diamond-pricing.bulk.service'
import { diamondPricingMessages } from '../config/diamond-pricing.messages'
import {
  createDiamondPriceSchema,
  updateDiamondPriceSchema,
  diamondPriceFiltersSchema,
} from '../config/diamond-pricing.schema'
import { BULK_FILE_CONSTRAINTS } from '../config/diamond-pricing.bulk.schema'
import { successResponse } from '../../../utils/response'
import { errorHandler } from '../../../utils/error-handler'
import { authWithPermission } from '../../../middleware/auth.middleware'
import { PERMISSIONS } from '../../../config/permissions.constants'
import type { AppEnv } from '../../../types/hono.types'
import type { DiamondPrice, DiamondPriceListResponse, BulkCreateResult, BulkUpdateResult } from '../types/diamond-pricing.types'

export const diamondPricingRoutes = new Hono<AppEnv>()

// GET /api/diamond-prices - List all diamond prices
diamondPricingRoutes.get('/', authWithPermission(PERMISSIONS.DIAMOND_PRICING.READ), async (c) => {
  try {
    const query = c.req.query()
    const filters = diamondPriceFiltersSchema.parse(query)
    const result = await diamondPricingService.list(filters)
    return successResponse<DiamondPriceListResponse>(c, diamondPricingMessages.LIST_FETCHED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/diamond-prices/for-product - Get diamond pricings for product dropdown
// Uses PRODUCT.CREATE permission so users can create products without diamond pricing read access
diamondPricingRoutes.get('/for-product', authWithPermission(PERMISSIONS.PRODUCT.CREATE), async (c) => {
  try {
    const result = await diamondPricingService.getForProduct()
    return successResponse(c, 'Diamond pricings fetched successfully', { items: result })
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/diamond-prices/for-product-edit - Get diamond pricings for product edit dropdown
// Uses PRODUCT.UPDATE permission so users can edit products without diamond pricing read access
diamondPricingRoutes.get('/for-product-edit', authWithPermission(PERMISSIONS.PRODUCT.UPDATE), async (c) => {
  try {
    const result = await diamondPricingService.getForProduct()
    return successResponse(c, 'Diamond pricings fetched successfully', { items: result })
  } catch (error) {
    return errorHandler(error, c)
  }
})

// ============ BULK OPERATION ROUTES ============
// Note: These routes MUST be placed BEFORE the /:id route to avoid path conflicts

// GET /api/diamond-prices/template - Download template CSV
diamondPricingRoutes.get('/template', authWithPermission(PERMISSIONS.DIAMOND_PRICING.CREATE), async (c) => {
  try {
    const csv = diamondPricingBulkService.generateTemplate()

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="diamond-pricing-template.csv"',
      },
    })
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/diamond-prices/reference - Download reference data CSV
diamondPricingRoutes.get('/reference', authWithPermission(PERMISSIONS.DIAMOND_PRICING.CREATE), async (c) => {
  try {
    const csv = await diamondPricingBulkService.generateReferenceData()

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="diamond-pricing-reference.csv"',
      },
    })
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/diamond-prices/export - Export current prices to CSV
diamondPricingRoutes.get('/export', authWithPermission(PERMISSIONS.DIAMOND_PRICING.READ), async (c) => {
  try {
    const query = c.req.query()
    const filters = diamondPriceFiltersSchema.parse(query)
    const csv = await diamondPricingBulkService.exportToCsv(filters)

    const timestamp = Date.now()
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="diamond-prices-${timestamp}.csv"`,
      },
    })
  } catch (error) {
    return errorHandler(error, c)
  }
})

// POST /api/diamond-prices/bulk-create - Bulk create from CSV
diamondPricingRoutes.post('/bulk-create', authWithPermission(PERMISSIONS.DIAMOND_PRICING.CREATE), async (c) => {
  try {
    const formData = await c.req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return c.json({ success: false, message: diamondPricingMessages.NO_FILE_PROVIDED }, 400)
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      return c.json({ success: false, message: diamondPricingMessages.INVALID_FILE_TYPE }, 400)
    }

    // Validate file size
    if (file.size > BULK_FILE_CONSTRAINTS.MAX_FILE_SIZE) {
      return c.json({ success: false, message: diamondPricingMessages.FILE_TOO_LARGE }, 400)
    }

    const result = await diamondPricingBulkService.processBulkCreate(file)
    const message = diamondPricingMessages.BULK_CREATE_SUCCESS.replace('{count}', String(result.created_count))
    return successResponse<BulkCreateResult>(c, message, result, 201)
  } catch (error) {
    if (error instanceof BulkCreateValidationError) {
      return c.json(
        {
          success: false,
          message: diamondPricingMessages.BULK_CREATE_FAILED,
          data: error.details,
        },
        400
      )
    }
    return errorHandler(error, c)
  }
})

// POST /api/diamond-prices/bulk-update - Bulk update from CSV
diamondPricingRoutes.post('/bulk-update', authWithPermission(PERMISSIONS.DIAMOND_PRICING.UPDATE), async (c) => {
  try {
    const formData = await c.req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return c.json({ success: false, message: diamondPricingMessages.NO_FILE_PROVIDED }, 400)
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      return c.json({ success: false, message: diamondPricingMessages.INVALID_FILE_TYPE }, 400)
    }

    // Validate file size
    if (file.size > BULK_FILE_CONSTRAINTS.MAX_FILE_SIZE) {
      return c.json({ success: false, message: diamondPricingMessages.FILE_TOO_LARGE }, 400)
    }

    const result = await diamondPricingBulkService.processBulkUpdate(file)

    const message =
      result.summary.failed > 0
        ? diamondPricingMessages.BULK_UPDATE_PARTIAL
        : diamondPricingMessages.BULK_UPDATE_SUCCESS

    return successResponse<BulkUpdateResult>(c, message, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// ============ END BULK OPERATION ROUTES ============

// GET /api/diamond-prices/:id - Get single diamond price
diamondPricingRoutes.get('/:id', authWithPermission(PERMISSIONS.DIAMOND_PRICING.READ), async (c) => {
  try {
    const id = c.req.param('id')
    const result = await diamondPricingService.getById(id)
    return successResponse<DiamondPrice>(c, diamondPricingMessages.FETCHED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// POST /api/diamond-prices - Create diamond price
diamondPricingRoutes.post('/', authWithPermission(PERMISSIONS.DIAMOND_PRICING.CREATE), async (c) => {
  try {
    const body = await c.req.json()
    const data = createDiamondPriceSchema.parse(body)
    const result = await diamondPricingService.create(data)
    return successResponse<DiamondPrice>(c, diamondPricingMessages.CREATED, result, 201)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// PUT /api/diamond-prices/:id - Update diamond price
diamondPricingRoutes.put('/:id', authWithPermission(PERMISSIONS.DIAMOND_PRICING.UPDATE), async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()
    const data = updateDiamondPriceSchema.parse(body)
    const result = await diamondPricingService.update(id, data)
    return successResponse<DiamondPrice>(c, diamondPricingMessages.UPDATED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// Note: DELETE endpoint intentionally not exposed (pending task)
