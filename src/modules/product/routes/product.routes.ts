import { Hono } from 'hono'
import crypto from 'crypto'
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
import { bunnyService } from '../../../shared/bunny-service'
import { isAllowedMimeType, getMaxSizeForType } from '../../media/config/media.config'
import type { AppEnv } from '../../../types/hono.types'

// Get file extension from filename
function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.')
  if (lastDot === -1) return ''
  return filename.slice(lastDot + 1).toLowerCase()
}

// Generate short unique ID for media items
function generateMediaId(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 12)
}

// Represents a file that needs to be uploaded to CDN
interface PendingFileUpload {
  fileKey: string
  file: File
  colorSlug: string
  position: number
  gemstoneSlug?: string
}

/**
 * Process product media uploads:
 * 1. Collect files from FormData by matching fileKey in media items
 * 2. Validate each file (type, size)
 * 3. Create product folder on CDN
 * 4. Upload each file with proper naming
 * 5. Replace fileKey with id + path in media items
 * 6. Clean up extra fields (colorSlug, gemstoneColorSlug)
 *
 * On error: deletes any already-uploaded files + folder
 * After this function, body.media is in standard format (same as before)
 */
async function processProductMediaUploads(
  body: Record<string, unknown>,
  formData: Record<string, string | File>
): Promise<void> {
  const media = body.media as Record<string, unknown> | undefined
  if (!media) return

  const colorMedia = media.colorMedia as Record<string, unknown>[] | undefined
  if (!colorMedia || colorMedia.length === 0) return

  // Check if any items have fileKey (new uploads). If none, skip processing.
  let hasNewUploads = false
  for (const cm of colorMedia) {
    const items = cm.items as Record<string, unknown>[]
    if (items?.some(item => item.fileKey)) { hasNewUploads = true; break }
    const gemSubs = cm.gemstoneSubMedia as Record<string, unknown>[]
    if (gemSubs) {
      for (const gsm of gemSubs) {
        const gsmItems = gsm.items as Record<string, unknown>[]
        if (gsmItems?.some(item => item.fileKey)) { hasNewUploads = true; break }
      }
    }
    if (hasNewUploads) break
  }
  if (!hasNewUploads) return

  const basic = body.basic as Record<string, unknown>
  const rawSku = basic.productSku as string
  if (!rawSku) throw new AppError('Product SKU is required for media upload', 400)
  const baseSku = rawSku.toLowerCase()

  // 1. Collect all files to upload
  const pendingFiles: PendingFileUpload[] = []

  for (const cm of colorMedia) {
    const colorSlug = cm.colorSlug as string
    if (!colorSlug) throw new AppError('Color slug is required for media upload', 400)

    const items = (cm.items as Record<string, unknown>[]) || []
    for (const item of items) {
      if (!item.fileKey) continue
      const file = formData[item.fileKey as string]
      if (!file || typeof file === 'string') {
        throw new AppError(`File not found for key: ${item.fileKey}`, 400)
      }
      pendingFiles.push({
        fileKey: item.fileKey as string,
        file: file as File,
        colorSlug,
        position: item.position as number,
      })
    }

    const gemSubs = (cm.gemstoneSubMedia as Record<string, unknown>[]) || []
    for (const gsm of gemSubs) {
      const gemstoneSlug = gsm.gemstoneColorSlug as string
      if (!gemstoneSlug) throw new AppError('Gemstone color slug is required for media upload', 400)

      const gsmItems = (gsm.items as Record<string, unknown>[]) || []
      for (const item of gsmItems) {
        if (!item.fileKey) continue
        const file = formData[item.fileKey as string]
        if (!file || typeof file === 'string') {
          throw new AppError(`File not found for key: ${item.fileKey}`, 400)
        }
        pendingFiles.push({
          fileKey: item.fileKey as string,
          file: file as File,
          colorSlug,
          position: item.position as number,
          gemstoneSlug,
        })
      }
    }
  }

  if (pendingFiles.length === 0) return

  // 2. Validate all files BEFORE uploading
  for (const { file, fileKey } of pendingFiles) {
    if (!isAllowedMimeType(file.type)) {
      throw new AppError(`Invalid file type for ${fileKey}: ${file.type}`, 400)
    }
    const maxSize = getMaxSizeForType(file.type)
    if (file.size > maxSize) {
      const maxMB = Math.round(maxSize / (1024 * 1024))
      throw new AppError(`File too large for ${fileKey}: max ${maxMB}MB`, 400)
    }
  }

  // 3. Create folder + upload files
  const folderPath = `products/${baseSku}`
  const uploadedPaths: string[] = []

  try {
    // Create the product folder
    await bunnyService.createFolder('products', baseSku)

    // Upload each file
    const fileKeyToPath = new Map<string, string>()

    for (const entry of pendingFiles) {
      const ext = getFileExtension(entry.file.name)
      const fileName = entry.gemstoneSlug
        ? `${baseSku}-${entry.colorSlug}-${entry.gemstoneSlug}-${entry.position}.${ext}`
        : `${baseSku}-${entry.colorSlug}-${entry.position}.${ext}`

      const buffer = Buffer.from(await entry.file.arrayBuffer())
      const result = await bunnyService.uploadFile(folderPath, buffer, fileName)

      if (!result.success || !result.data) {
        throw new AppError(`Failed to upload file: ${fileName}`, 500)
      }

      uploadedPaths.push(result.data.path)
      fileKeyToPath.set(entry.fileKey, `/${result.data.path}`)
    }

    // 4. Replace fileKey with id + path in media items, clean up extra fields
    for (const cm of colorMedia) {
      const items = (cm.items as Record<string, unknown>[]) || []
      for (const item of items) {
        if (item.fileKey) {
          const cdnPath = fileKeyToPath.get(item.fileKey as string)
          item.id = generateMediaId()
          item.path = cdnPath
          delete item.fileKey
        }
      }

      const gemSubs = (cm.gemstoneSubMedia as Record<string, unknown>[]) || []
      for (const gsm of gemSubs) {
        const gsmItems = (gsm.items as Record<string, unknown>[]) || []
        for (const item of gsmItems) {
          if (item.fileKey) {
            const cdnPath = fileKeyToPath.get(item.fileKey as string)
            item.id = generateMediaId()
            item.path = cdnPath
            delete item.fileKey
          }
        }
        // Remove extra slug field (not in Zod schema)
        delete gsm.gemstoneColorSlug
      }

      // Remove extra fields (not in Zod schema)
      delete cm.colorSlug
    }
  } catch (error) {
    // ROLLBACK: Delete any uploaded files + folder
    if (uploadedPaths.length > 0) {
      try {
        for (const path of uploadedPaths) {
          await bunnyService.deleteFile(path)
        }
        await bunnyService.deleteFolder(folderPath)
      } catch (cleanupError) {
        console.error('Failed to cleanup uploaded files:', cleanupError)
      }
    }
    throw error
  }
}

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
// Accepts multipart/form-data: 'data' field (JSON string) + file fields (keyed by fileKey)
productRoutes.post('/', authWithPermission(PERMISSIONS.PRODUCT.CREATE), async (c) => {
  try {
    // Parse multipart FormData
    const formData = await c.req.parseBody()
    const dataString = formData['data']
    if (!dataString || typeof dataString !== 'string') {
      throw new AppError('Missing "data" field in request', 400)
    }
    const body = JSON.parse(dataString)
    const { productType } = body

    // Validate product type exists
    if (!productType) {
      throw new AppError(productMessages.PRODUCT_TYPE_REQUIRED, 400)
    }

    if (!isValidProductType(productType)) {
      throw new AppError(productMessages.INVALID_PRODUCT_TYPE, 400)
    }

    // Process media uploads: validate files, upload to CDN, replace fileKey with path
    // After this, body.media is in standard format (same as JSON-only flow)
    await processProductMediaUploads(body, formData as Record<string, string | File>)

    // Route to appropriate service based on product type
    let result
    switch (productType) {
      case PRODUCT_TYPES.JEWELLERY_DEFAULT.code: {
        // Validate request body with schema (same as before — media items now have paths)
        const validatedData = jewelleryDefaultCreateSchema.parse(body)
        result = await jewelleryDefaultService.create(validatedData)
        break
      }

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
// Accepts multipart/form-data: 'data' field (JSON string) + file fields for new uploads
productRoutes.put('/:id/media', authWithPermission(PERMISSIONS.PRODUCT.UPDATE), async (c) => {
  try {
    const { id } = c.req.param()

    // First, get the product to determine its type
    const product = await productService.getById(id)
    if (!product) {
      throw new AppError(productMessages.NOT_FOUND, 404)
    }

    // Parse multipart FormData
    const formData = await c.req.parseBody()
    const dataString = formData['data']
    if (!dataString || typeof dataString !== 'string') {
      throw new AppError('Missing "data" field in request', 400)
    }
    const body = JSON.parse(dataString)

    // Process any new media uploads (items with fileKey get uploaded, items with path stay as-is)
    // Need baseSku for folder naming — get from product
    const baseSku = product.base_sku
    if (body.colorMedia) {
      // Wrap in media structure for processProductMediaUploads (uses productSku field name)
      const wrappedBody = { basic: { productSku: baseSku }, media: body }
      await processProductMediaUploads(wrappedBody, formData as Record<string, string | File>)
      // Unwrap back
      Object.assign(body, wrappedBody.media)
    }

    // Route to appropriate service based on product type
    let result
    switch (product.product_type) {
      case PRODUCT_TYPES.JEWELLERY_DEFAULT.code: {
        // Validate request body with schema (same as before)
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
