import { Hono } from 'hono'
import { jewelleryDefaultService } from '../services/jewellery-default.service'
import { productService } from '../services/product.service'
import {
  jewelleryDefaultCreateSchema,
  jewelleryDefaultUpdateBasicSchema,
  jewelleryDefaultUpdateAttributesSchema,
  jewelleryDefaultUpdateSeoSchema,
  jewelleryDefaultUpdateMediaSchema,
  jewelleryDefaultUpdateOptionsSchema,
} from '../config/jewellery-default.schema'
import { productStatusChangeSchema, variantStockUpdateSchema } from '../config/product.schema'
import { productMessages } from '../config/product.messages'
import { successResponse } from '../../../utils/response'
import { errorHandler } from '../../../utils/error-handler'
import { authWithPermission } from '../../../middleware/auth.middleware'
import { PERMISSIONS } from '../../../config/permissions.constants'
import { PRODUCT_TYPES, isValidProductType } from '../../../config/product.config'
import { AppError } from '../../../utils/app-error'
import type { AppEnv } from '../../../types/hono.types'

export const productRoutes = new Hono<AppEnv>()

// GET /api/products - List all products
productRoutes.get('/', authWithPermission(PERMISSIONS.PRODUCT.READ), async (c) => {
  try {
    const result = await productService.getAll()
    return successResponse(c, productMessages.LIST_FETCHED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/products/for-pricing-rule - Get all products for pricing rule preview
// Uses PRICING_RULE.CREATE permission since this is used when creating/editing pricing rules
productRoutes.get('/for-pricing-rule', authWithPermission(PERMISSIONS.PRICING_RULE.CREATE), async (c) => {
  try {
    const result = await productService.getAllForPricingRule()
    return successResponse(c, productMessages.PRICING_RULE_LIST_FETCHED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/products/:id - Get product by ID
productRoutes.get('/:id', authWithPermission(PERMISSIONS.PRODUCT.READ), async (c) => {
  try {
    const { id } = c.req.param()
    const result = await productService.getById(id)

    if (!result) {
      throw new AppError(productMessages.NOT_FOUND, 404)
    }

    return successResponse(c, productMessages.FETCHED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// POST /api/products - Create product
productRoutes.post('/', authWithPermission(PERMISSIONS.PRODUCT.CREATE), async (c) => {
  try {
    const body = await c.req.json()
    const { productType } = body

    // Validate product type exists
    if (!productType) {
      throw new AppError(productMessages.PRODUCT_TYPE_REQUIRED, 400)
    }

    if (!isValidProductType(productType)) {
      throw new AppError(productMessages.INVALID_PRODUCT_TYPE, 400)
    }

    // Route to appropriate service based on product type
    let result
    switch (productType) {
      case PRODUCT_TYPES.JEWELLERY_DEFAULT.code: {
        // Validate request body with schema
        const validatedData = jewelleryDefaultCreateSchema.parse(body)
        console.log('✓ Schema validation passed for JEWELLERY_DEFAULT')
        console.log('Validated Data:', JSON.stringify(validatedData, null, 2))

        result = await jewelleryDefaultService.create(validatedData)
        break
      }

      // Future product types will be added here
      // case PRODUCT_TYPES.WATCH.code:
      //   result = await watchService.create(body)
      //   break

      default:
        throw new AppError(productMessages.INVALID_PRODUCT_TYPE, 400)
    }

    return successResponse(c, productMessages.CREATED, result, 201)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// PATCH /api/products/:id/basic - Update product basic details
productRoutes.patch('/:id/basic', authWithPermission(PERMISSIONS.PRODUCT.UPDATE), async (c) => {
  try {
    const { id } = c.req.param()
    const body = await c.req.json()

    // First, get the product to determine its type
    const product = await productService.getById(id)
    if (!product) {
      throw new AppError(productMessages.NOT_FOUND, 404)
    }

    // Route to appropriate service based on product type
    let result
    switch (product.product_type) {
      case PRODUCT_TYPES.JEWELLERY_DEFAULT.code: {
        // Validate request body with schema
        const validatedData = jewelleryDefaultUpdateBasicSchema.parse(body)
        result = await jewelleryDefaultService.updateBasicDetails(id, validatedData)
        break
      }

      // Future product types will be added here
      // case PRODUCT_TYPES.WATCH.code:
      //   result = await watchService.updateBasicDetails(id, body)
      //   break

      default:
        throw new AppError(productMessages.INVALID_PRODUCT_TYPE, 400)
    }

    return successResponse(c, productMessages.BASIC_DETAILS_UPDATED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// PATCH /api/products/:id/attributes - Update product attributes (categories, tags, badges)
productRoutes.patch('/:id/attributes', authWithPermission(PERMISSIONS.PRODUCT.UPDATE), async (c) => {
  try {
    const { id } = c.req.param()
    const body = await c.req.json()

    // First, get the product to determine its type
    const product = await productService.getById(id)
    if (!product) {
      throw new AppError(productMessages.NOT_FOUND, 404)
    }

    // Route to appropriate service based on product type
    let result
    switch (product.product_type) {
      case PRODUCT_TYPES.JEWELLERY_DEFAULT.code: {
        // Validate request body with schema
        const validatedData = jewelleryDefaultUpdateAttributesSchema.parse(body)
        result = await jewelleryDefaultService.updateAttributes(id, validatedData)
        break
      }

      // Future product types will be added here
      // case PRODUCT_TYPES.WATCH.code:
      //   result = await watchService.updateAttributes(id, body)
      //   break

      default:
        throw new AppError(productMessages.INVALID_PRODUCT_TYPE, 400)
    }

    return successResponse(c, productMessages.ATTRIBUTES_UPDATED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// PUT /api/products/:id/seo - Update product SEO
productRoutes.put('/:id/seo', authWithPermission(PERMISSIONS.PRODUCT.UPDATE), async (c) => {
  try {
    const { id } = c.req.param()
    const body = await c.req.json()

    // First, get the product to determine its type
    const product = await productService.getById(id)
    if (!product) {
      throw new AppError(productMessages.NOT_FOUND, 404)
    }

    // Route to appropriate service based on product type
    let result
    switch (product.product_type) {
      case PRODUCT_TYPES.JEWELLERY_DEFAULT.code: {
        // Validate request body with schema
        const validatedData = jewelleryDefaultUpdateSeoSchema.parse(body)
        result = await jewelleryDefaultService.updateSeo(id, validatedData)
        break
      }

      default:
        throw new AppError(productMessages.INVALID_PRODUCT_TYPE, 400)
    }

    return successResponse(c, productMessages.SEO_UPDATED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// PUT /api/products/:id/media - Update product media
productRoutes.put('/:id/media', authWithPermission(PERMISSIONS.PRODUCT.UPDATE), async (c) => {
  try {
    const { id } = c.req.param()
    const body = await c.req.json()

    // First, get the product to determine its type
    const product = await productService.getById(id)
    if (!product) {
      throw new AppError(productMessages.NOT_FOUND, 404)
    }

    // Route to appropriate service based on product type
    let result
    switch (product.product_type) {
      case PRODUCT_TYPES.JEWELLERY_DEFAULT.code: {
        // Validate request body with schema
        const validatedData = jewelleryDefaultUpdateMediaSchema.parse(body)
        result = await jewelleryDefaultService.updateMedia(id, validatedData)
        break
      }

      default:
        throw new AppError(productMessages.INVALID_PRODUCT_TYPE, 400)
    }

    return successResponse(c, productMessages.MEDIA_UPDATED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// PUT /api/products/:id/options - Update product options (metal, stone, variants, media)
productRoutes.put('/:id/options', authWithPermission(PERMISSIONS.PRODUCT.UPDATE), async (c) => {
  try {
    const { id } = c.req.param()
    const body = await c.req.json()

    // First, get the product to determine its type
    const product = await productService.getById(id)
    if (!product) {
      throw new AppError(productMessages.NOT_FOUND, 404)
    }

    // Route to appropriate service based on product type
    let result
    switch (product.product_type) {
      case PRODUCT_TYPES.JEWELLERY_DEFAULT.code: {
        // Validate request body with schema
        const validatedData = jewelleryDefaultUpdateOptionsSchema.parse(body)
        result = await jewelleryDefaultService.updateOptions(id, validatedData)
        break
      }

      default:
        throw new AppError(productMessages.INVALID_PRODUCT_TYPE, 400)
    }

    return successResponse(c, productMessages.OPTIONS_UPDATED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// PATCH /api/products/:id/status - Update product status
productRoutes.patch('/:id/status', authWithPermission(PERMISSIONS.PRODUCT.UPDATE_STATUS), async (c) => {
  try {
    const { id } = c.req.param()
    const body = await c.req.json()

    // Validate request body
    const validatedData = productStatusChangeSchema.parse(body)

    const result = await productService.updateStatus(id, validatedData.status)

    return successResponse(c, productMessages.STATUS_UPDATED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// PATCH /api/products/:productId/variants/:variantId/stock - Update variant stock
productRoutes.patch(
  '/:productId/variants/:variantId/stock',
  authWithPermission(PERMISSIONS.PRODUCT.UPDATE),
  async (c) => {
    try {
      const { productId, variantId } = c.req.param()
      const body = await c.req.json()

      // Validate request body
      const validatedData = variantStockUpdateSchema.parse(body)

      const result = await productService.updateVariantStock(
        productId,
        variantId,
        validatedData.stock_quantity
      )

      return successResponse(c, productMessages.STOCK_UPDATED, result)
    } catch (error) {
      return errorHandler(error, c)
    }
  }
)
