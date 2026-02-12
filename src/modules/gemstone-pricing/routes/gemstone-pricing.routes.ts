import { Hono } from 'hono'
import { gemstonePricingService } from '../services/gemstone-pricing.service'
import { gemstonePricingBulkService, BulkCreateValidationError } from '../services/gemstone-pricing.bulk.service'
import { gemstonePricingMessages } from '../config/gemstone-pricing.messages'
import {
  createGemstonePriceSchema,
  updateGemstonePriceSchema,
  gemstonePriceFiltersSchema,
} from '../config/gemstone-pricing.schema'
import { BULK_FILE_CONSTRAINTS } from '../config/gemstone-pricing.bulk.schema'
import { successResponse } from '../../../utils/response'
import { errorHandler } from '../../../utils/error-handler'
import { authWithPermission } from '../../../middleware/auth.middleware'
import { PERMISSIONS } from '../../../config/permissions.constants'
import type { AppEnv } from '../../../types/hono.types'
import type { GemstonePrice, GemstonePriceListResponse, BulkCreateResult, BulkUpdateResult } from '../types/gemstone-pricing.types'

export const gemstonePricingRoutes = new Hono<AppEnv>()

// GET /api/gemstone-prices - List all gemstone prices
gemstonePricingRoutes.get('/', authWithPermission(PERMISSIONS.GEMSTONE_PRICING.READ), async (c) => {
  try {
    const query = c.req.query()
    const filters = gemstonePriceFiltersSchema.parse(query)
    const result = await gemstonePricingService.list(filters)
    return successResponse<GemstonePriceListResponse>(c, gemstonePricingMessages.LIST_FETCHED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/gemstone-prices/for-product - Get gemstone pricings for product dropdown
// Uses PRODUCT.CREATE permission so users can create products without gemstone pricing read access
gemstonePricingRoutes.get('/for-product', authWithPermission(PERMISSIONS.PRODUCT.CREATE), async (c) => {
  try {
    const result = await gemstonePricingService.getForProduct()
    return successResponse(c, 'Gemstone pricings fetched successfully', { items: result })
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/gemstone-prices/for-product-edit - Get gemstone pricings for product edit dropdown
// Uses PRODUCT.UPDATE permission so users can edit products without gemstone pricing read access
gemstonePricingRoutes.get('/for-product-edit', authWithPermission(PERMISSIONS.PRODUCT.UPDATE), async (c) => {
  try {
    const result = await gemstonePricingService.getForProduct()
    return successResponse(c, 'Gemstone pricings fetched successfully', { items: result })
  } catch (error) {
    return errorHandler(error, c)
  }
})

// ============ BULK OPERATION ROUTES ============
// Note: These routes MUST be placed BEFORE the /:id route to avoid path conflicts

// GET /api/gemstone-prices/template - Download template CSV
gemstonePricingRoutes.get('/template', authWithPermission(PERMISSIONS.GEMSTONE_PRICING.CREATE), async (c) => {
  try {
    const csv = gemstonePricingBulkService.generateTemplate()

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="gemstone-pricing-template.csv"',
      },
    })
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/gemstone-prices/reference - Download reference data CSV
gemstonePricingRoutes.get('/reference', authWithPermission(PERMISSIONS.GEMSTONE_PRICING.CREATE), async (c) => {
  try {
    const csv = await gemstonePricingBulkService.generateReferenceData()

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="gemstone-pricing-reference.csv"',
      },
    })
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/gemstone-prices/export - Export current prices to CSV
gemstonePricingRoutes.get('/export', authWithPermission(PERMISSIONS.GEMSTONE_PRICING.READ), async (c) => {
  try {
    const query = c.req.query()
    const filters = gemstonePriceFiltersSchema.parse(query)
    const csv = await gemstonePricingBulkService.exportToCsv(filters)

    const timestamp = Date.now()
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="gemstone-prices-${timestamp}.csv"`,
      },
    })
  } catch (error) {
    return errorHandler(error, c)
  }
})

// POST /api/gemstone-prices/bulk-create - Bulk create from CSV
gemstonePricingRoutes.post('/bulk-create', authWithPermission(PERMISSIONS.GEMSTONE_PRICING.CREATE), async (c) => {
  try {
    const formData = await c.req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return c.json({ success: false, message: gemstonePricingMessages.NO_FILE_PROVIDED }, 400)
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      return c.json({ success: false, message: gemstonePricingMessages.INVALID_FILE_TYPE }, 400)
    }

    // Validate file size
    if (file.size > BULK_FILE_CONSTRAINTS.MAX_FILE_SIZE) {
      return c.json({ success: false, message: gemstonePricingMessages.FILE_TOO_LARGE }, 400)
    }

    const result = await gemstonePricingBulkService.processBulkCreate(file)
    const message = gemstonePricingMessages.BULK_CREATE_SUCCESS.replace('{count}', String(result.created_count))
    return successResponse<BulkCreateResult>(c, message, result, 201)
  } catch (error) {
    if (error instanceof BulkCreateValidationError) {
      return c.json(
        {
          success: false,
          message: gemstonePricingMessages.BULK_CREATE_FAILED,
          data: error.details,
        },
        400
      )
    }
    return errorHandler(error, c)
  }
})

// POST /api/gemstone-prices/bulk-update - Bulk update from CSV
gemstonePricingRoutes.post('/bulk-update', authWithPermission(PERMISSIONS.GEMSTONE_PRICING.UPDATE), async (c) => {
  try {
    const formData = await c.req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return c.json({ success: false, message: gemstonePricingMessages.NO_FILE_PROVIDED }, 400)
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      return c.json({ success: false, message: gemstonePricingMessages.INVALID_FILE_TYPE }, 400)
    }

    // Validate file size
    if (file.size > BULK_FILE_CONSTRAINTS.MAX_FILE_SIZE) {
      return c.json({ success: false, message: gemstonePricingMessages.FILE_TOO_LARGE }, 400)
    }

    const result = await gemstonePricingBulkService.processBulkUpdate(file)

    const message =
      result.summary.failed > 0
        ? gemstonePricingMessages.BULK_UPDATE_PARTIAL
        : gemstonePricingMessages.BULK_UPDATE_SUCCESS

    return successResponse<BulkUpdateResult>(c, message, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// ============ END BULK OPERATION ROUTES ============

// GET /api/gemstone-prices/:id - Get single gemstone price
gemstonePricingRoutes.get('/:id', authWithPermission(PERMISSIONS.GEMSTONE_PRICING.READ), async (c) => {
  try {
    const id = c.req.param('id')
    const result = await gemstonePricingService.getById(id)
    return successResponse<GemstonePrice>(c, gemstonePricingMessages.FETCHED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// POST /api/gemstone-prices - Create gemstone price
gemstonePricingRoutes.post('/', authWithPermission(PERMISSIONS.GEMSTONE_PRICING.CREATE), async (c) => {
  try {
    const body = await c.req.json()
    const data = createGemstonePriceSchema.parse(body)
    const result = await gemstonePricingService.create(data)
    return successResponse<GemstonePrice>(c, gemstonePricingMessages.CREATED, result, 201)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// PUT /api/gemstone-prices/:id - Update gemstone price
gemstonePricingRoutes.put('/:id', authWithPermission(PERMISSIONS.GEMSTONE_PRICING.UPDATE), async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()
    const data = updateGemstonePriceSchema.parse(body)
    const result = await gemstonePricingService.update(id, data)
    return successResponse<GemstonePrice>(c, gemstonePricingMessages.UPDATED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// Note: DELETE endpoint intentionally not exposed (pending task)
