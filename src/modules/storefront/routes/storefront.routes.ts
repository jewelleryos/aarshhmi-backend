import { Hono } from 'hono'
import { successResponse } from '../../../utils/response'
import { errorHandler } from '../../../utils/error-handler'
import { AppError } from '../../../utils/app-error'
import { HTTP_STATUS } from '../../../config/constants'
import { db } from '../../../lib/db'
import { storefrontMessages } from '../config/storefront.messages'
import { storefrontFiltersService } from '../services/storefront-filters.service'
import { storefrontProductsService } from '../services/storefront-products.service'

export const storefrontRoutes = new Hono()

// POST /filters - Public endpoint, no auth required
storefrontRoutes.post('/filters', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}))

    const categories = body.categories || []
    const tags = body.tags || []
    const price_ranges = body.price_ranges || []

    console.log('Filters API body:', JSON.stringify(body))

    const result = await storefrontFiltersService.getFilters({
      categories,
      tags,
      price_ranges,
    })

    return successResponse(c, storefrontMessages.FILTERS_FETCHED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// POST /products - Public endpoint, no auth required
storefrontRoutes.post('/products', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}))

    const result = await storefrontProductsService.getProducts({
      categories: body.categories || [],
      tags: body.tags || [],
      price_ranges: body.price_ranges || [],
      sort_by: body.sort_by,
      page: body.page,
      limit: body.limit,
    })

    return successResponse(c, storefrontMessages.PRODUCTS_FETCHED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /products/:productId/similar - Public endpoint, no auth required
storefrontRoutes.get('/products/:productId/similar', async (c) => {
  try {
    const productId = c.req.param('productId')

    const result = await db.query(
      `SELECT
        p.id, p.name, p.slug, p.base_sku,
        p.default_variant_id,
        p.metadata -> 'optionConfig' AS option_config,
        p.metadata -> 'availabilityMap' AS availability_map,
        p.metadata -> 'media' AS media,
        p.created_at,
        (
          SELECT COALESCE(json_agg(
            json_build_object(
              'id', pv.id, 'sku', pv.sku, 'price', pv.price,
              'compare_at_price', pv.compare_at_price,
              'is_available', pv.is_available, 'metadata', pv.metadata
            )
          ), '[]'::json)
          FROM product_variants pv WHERE pv.product_id = p.id
        ) AS variants,
        (
          SELECT COALESCE(json_agg(
            json_build_object(
              'id', b.id, 'name', b.name, 'slug', b.slug,
              'bg_color', b.bg_color, 'font_color', b.font_color, 'position', b.position
            )
          ), '[]'::json)
          FROM product_badges pb
          JOIN badges b ON b.id = pb.badge_id AND b.status = TRUE
          WHERE pb.product_id = p.id
        ) AS badges
       FROM similar_products sp
       JOIN products p ON p.id = sp.similar_product_id AND p.status = 'active'
       WHERE sp.product_id = $1
       ORDER BY
         CASE sp.source WHEN 'manual' THEN 0 ELSE 1 END,
         sp.rank,
         sp.score DESC
       LIMIT 10`,
      [productId]
    )

    return successResponse(c, storefrontMessages.SIMILAR_PRODUCTS_FETCHED, { items: result.rows })
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /products/sku/:sku/similar - Public endpoint, no auth required
storefrontRoutes.get('/products/sku/:sku/similar', async (c) => {
  try {
    const sku = c.req.param('sku')

    const productResult = await db.query(
      `SELECT id FROM products WHERE base_sku = $1 AND status = 'active' LIMIT 1`,
      [sku]
    )
    if (productResult.rows.length === 0) {
      return successResponse(c, storefrontMessages.SIMILAR_PRODUCTS_FETCHED, { items: [] })
    }

    const productId = productResult.rows[0].id

    const result = await db.query(
      `SELECT
        p.id, p.name, p.slug, p.base_sku,
        p.default_variant_id,
        p.metadata -> 'optionConfig' AS option_config,
        p.metadata -> 'availabilityMap' AS availability_map,
        p.metadata -> 'media' AS media,
        p.created_at,
        (
          SELECT COALESCE(json_agg(
            json_build_object(
              'id', pv.id, 'sku', pv.sku, 'price', pv.price,
              'compare_at_price', pv.compare_at_price,
              'is_available', pv.is_available, 'metadata', pv.metadata
            )
          ), '[]'::json)
          FROM product_variants pv WHERE pv.product_id = p.id
        ) AS variants,
        (
          SELECT COALESCE(json_agg(
            json_build_object(
              'id', b.id, 'name', b.name, 'slug', b.slug,
              'bg_color', b.bg_color, 'font_color', b.font_color, 'position', b.position
            )
          ), '[]'::json)
          FROM product_badges pb
          JOIN badges b ON b.id = pb.badge_id AND b.status = TRUE
          WHERE pb.product_id = p.id
        ) AS badges
       FROM similar_products sp
       JOIN products p ON p.id = sp.similar_product_id AND p.status = 'active'
       WHERE sp.product_id = $1
       ORDER BY
         CASE sp.source WHEN 'manual' THEN 0 ELSE 1 END,
         sp.rank,
         sp.score DESC
       LIMIT 10`,
      [productId]
    )

    return successResponse(c, storefrontMessages.SIMILAR_PRODUCTS_FETCHED, { items: result.rows })
  } catch (error) {
    return errorHandler(error, c)
  }
})

// POST /products/recently-viewed - Public endpoint, no auth required
storefrontRoutes.post('/products/recently-viewed', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}))
    const skus: string[] = Array.isArray(body.skus) ? body.skus.slice(0, 15) : []

    if (skus.length === 0) {
      return successResponse(c, storefrontMessages.RECENTLY_VIEWED_FETCHED, { items: [] })
    }

    const result = await db.query(
      `SELECT
        p.id, p.name, p.slug, p.base_sku,
        p.default_variant_id,
        p.metadata -> 'optionConfig' AS option_config,
        p.metadata -> 'availabilityMap' AS availability_map,
        p.metadata -> 'media' AS media,
        p.created_at,
        (
          SELECT COALESCE(json_agg(
            json_build_object(
              'id', pv.id, 'sku', pv.sku, 'price', pv.price,
              'compare_at_price', pv.compare_at_price,
              'is_available', pv.is_available, 'metadata', pv.metadata
            )
          ), '[]'::json)
          FROM product_variants pv WHERE pv.product_id = p.id
        ) AS variants,
        (
          SELECT COALESCE(json_agg(
            json_build_object(
              'id', b.id, 'name', b.name, 'slug', b.slug,
              'bg_color', b.bg_color, 'font_color', b.font_color, 'position', b.position
            )
          ), '[]'::json)
          FROM product_badges pb
          JOIN badges b ON b.id = pb.badge_id AND b.status = TRUE
          WHERE pb.product_id = p.id
        ) AS badges
       FROM products p
       WHERE p.base_sku = ANY($1) AND p.status = 'active'`,
      [skus]
    )

    // Preserve the order of SKUs sent by the client
    const productMap = new Map(result.rows.map((row: any) => [row.base_sku, row]))
    const items = skus
      .map((sku) => productMap.get(sku))
      .filter(Boolean)

    return successResponse(c, storefrontMessages.RECENTLY_VIEWED_FETCHED, { items })
  } catch (error) {
    return errorHandler(error, c)
  }
})

// POST /products/detail - Public endpoint, no auth required
storefrontRoutes.post('/products/detail', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}))

    if (!body.slug && !body.productSku) {
      throw new AppError(
        storefrontMessages.PRODUCT_DETAIL_IDENTIFIER_REQUIRED,
        HTTP_STATUS.BAD_REQUEST
      )
    }

    const result = await storefrontProductsService.getProductDetail({
      slug: body.slug,
      productSku: body.productSku,
      variantSku: body.variantSku,
      sizeChartValueId: body.sizeChartValueId,
    })

    return successResponse(c, storefrontMessages.PRODUCT_DETAIL_FETCHED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})
