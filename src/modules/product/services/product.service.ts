// Product service - Common operations for all product types
import { db } from '../../../lib/db'
import { AppError } from '../../../utils/app-error'
import { productMessages } from '../config/product.messages'

// Types for list
interface ProductListItem {
  id: string
  name: string
  base_sku: string
  status: string
  min_price: number
  max_price: number
  variant_count: number
  primary_category: { id: string; name: string } | null
  created_at: string
}

interface ProductListResult {
  items: ProductListItem[]
  total: number
}

// Types for detail view
interface ProductOptionValue {
  id: string
  value: string
  rank: number
}

interface ProductOption {
  id: string
  name: string
  rank: number
  values: ProductOptionValue[]
}

interface VariantOptionValue {
  option_name: string
  option_value_id: string
  value: string
}

interface ProductVariant {
  id: string
  sku: string
  variant_name: string | null
  price: number
  compare_at_price: number | null
  cost_price: number | null
  price_components: Record<string, unknown>
  is_default: boolean
  is_available: boolean
  stock_quantity: number | null
  metadata: Record<string, unknown>
  option_values: VariantOptionValue[]
}

interface ProductCategory {
  id: string
  name: string
  slug: string
  is_primary: boolean
}

interface ProductTag {
  id: string
  name: string
  slug: string
  tag_group_id: string
  tag_group_name: string
}

interface ProductBadge {
  id: string
  name: string
  slug: string
  bg_color: string
  font_color: string
}

export interface ProductDetail {
  id: string
  name: string
  slug: string
  short_description: string | null
  description: string | null
  product_type: string
  base_sku: string
  style_sku: string | null
  status: string
  min_price: number
  max_price: number
  variant_count: number
  default_variant_id: string | null
  seo: Record<string, unknown>
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  options: ProductOption[]
  variants: ProductVariant[]
  categories: ProductCategory[]
  tags: ProductTag[]
  badges: ProductBadge[]
}

class ProductService {
  /**
   * Get all products for listing
   */
  async getAll(): Promise<ProductListResult> {
    const result = await db.query<ProductListItem>(`
      SELECT
        p.id,
        p.name,
        p.base_sku,
        p.status,
        p.min_price,
        p.max_price,
        p.variant_count,
        p.created_at,
        CASE
          WHEN c.id IS NOT NULL THEN json_build_object('id', c.id, 'name', c.name)
          ELSE NULL
        END as primary_category
      FROM products p
      LEFT JOIN product_categories pc ON pc.product_id = p.id AND pc.is_primary = true
      LEFT JOIN categories c ON c.id = pc.category_id
      ORDER BY p.created_at DESC
    `)

    return {
      items: result.rows,
      total: result.rows.length,
    }
  }

  /**
   * Get product by ID with all related data
   * Excludes system-generated tags
   */
  async getById(id: string): Promise<ProductDetail | null> {
    const result = await db.query<ProductDetail>(
      `
      SELECT
        p.id,
        p.name,
        p.slug,
        p.short_description,
        p.description,
        p.product_type,
        p.base_sku,
        p.style_sku,
        p.status,
        p.min_price,
        p.max_price,
        p.variant_count,
        p.default_variant_id,
        p.seo,
        p.metadata,
        p.created_at,
        p.updated_at,

        -- Options with values
        (
          SELECT COALESCE(json_agg(
            json_build_object(
              'id', po.id,
              'name', po.name,
              'rank', po.rank,
              'values', (
                SELECT COALESCE(json_agg(
                  json_build_object(
                    'id', pov.id,
                    'value', pov.value,
                    'rank', pov.rank
                  ) ORDER BY pov.rank
                ), '[]'::json)
                FROM product_option_values pov
                WHERE pov.option_id = po.id
              )
            ) ORDER BY po.rank
          ), '[]'::json)
          FROM product_options po
          WHERE po.product_id = p.id
        ) as options,

        -- Variants with option values
        (
          SELECT COALESCE(json_agg(
            json_build_object(
              'id', pv.id,
              'sku', pv.sku,
              'variant_name', pv.variant_name,
              'price', pv.price,
              'compare_at_price', pv.compare_at_price,
              'cost_price', pv.cost_price,
              'price_components', pv.price_components,
              'is_default', pv.is_default,
              'is_available', pv.is_available,
              'stock_quantity', pv.stock_quantity,
              'metadata', pv.metadata,
              'option_values', (
                SELECT COALESCE(json_agg(
                  json_build_object(
                    'option_name', po.name,
                    'option_value_id', pov.id,
                    'value', pov.value
                  ) ORDER BY po.rank
                ), '[]'::json)
                FROM variant_option_values vov
                JOIN product_option_values pov ON vov.option_value_id = pov.id
                JOIN product_options po ON pov.option_id = po.id
                WHERE vov.variant_id = pv.id
              )
            ) ORDER BY pv.is_default DESC, pv.created_at
          ), '[]'::json)
          FROM product_variants pv
          WHERE pv.product_id = p.id
        ) as variants,

        -- Categories
        (
          SELECT COALESCE(json_agg(
            json_build_object(
              'id', c.id,
              'name', c.name,
              'slug', c.slug,
              'is_primary', pc.is_primary
            ) ORDER BY pc.is_primary DESC
          ), '[]'::json)
          FROM product_categories pc
          JOIN categories c ON pc.category_id = c.id
          WHERE pc.product_id = p.id
        ) as categories,

        -- Tags (EXCLUDE system-generated)
        (
          SELECT COALESCE(json_agg(
            json_build_object(
              'id', t.id,
              'name', t.name,
              'slug', t.slug,
              'tag_group_id', t.tag_group_id,
              'tag_group_name', tg.name
            ) ORDER BY tg.rank, t.rank
          ), '[]'::json)
          FROM product_tags pt
          JOIN tags t ON pt.tag_id = t.id
          JOIN tag_groups tg ON t.tag_group_id = tg.id
          WHERE pt.product_id = p.id
            AND t.is_system_generated = false
            AND tg.is_system_generated = false
        ) as tags,

        -- Badges
        (
          SELECT COALESCE(json_agg(
            json_build_object(
              'id', b.id,
              'name', b.name,
              'slug', b.slug,
              'bg_color', b.bg_color,
              'font_color', b.font_color
            ) ORDER BY b.position
          ), '[]'::json)
          FROM product_badges pb
          JOIN badges b ON pb.badge_id = b.id
          WHERE pb.product_id = p.id
        ) as badges

      FROM products p
      WHERE p.id = $1
      `,
      [id]
    )

    return result.rows[0] || null
  }

  /**
   * Get all products for pricing rule preview
   * Optimized query that fetches all required data in a single call
   * Returns all products with their variants, categories, tags, badges
   */
  async getAllForPricingRule(): Promise<ProductForPricingRule[]> {
    const result = await db.query<ProductForPricingRule>(`
      SELECT
        p.id,
        p.name,
        p.base_sku,
        p.metadata,
        -- Categories (only IDs needed for matching)
        (
          SELECT COALESCE(json_agg(
            json_build_object('id', pc.category_id)
          ), '[]'::json)
          FROM product_categories pc
          WHERE pc.product_id = p.id
        ) as categories,
        -- Tags (only IDs needed for matching, include system-generated for pricing rule matching)
        (
          SELECT COALESCE(json_agg(
            json_build_object('id', pt.tag_id)
          ), '[]'::json)
          FROM product_tags pt
          WHERE pt.product_id = p.id
        ) as tags,
        -- Badges (only IDs needed for matching)
        (
          SELECT COALESCE(json_agg(
            json_build_object('id', pb.badge_id)
          ), '[]'::json)
          FROM product_badges pb
          WHERE pb.product_id = p.id
        ) as badges,
        -- Variants with pricing data
        (
          SELECT COALESCE(json_agg(
            json_build_object(
              'id', pv.id,
              'sku', pv.sku,
              'variant_name', pv.variant_name,
              'price', pv.price,
              'price_components', pv.price_components,
              'metadata', pv.metadata
            ) ORDER BY pv.is_default DESC, pv.created_at
          ), '[]'::json)
          FROM product_variants pv
          WHERE pv.product_id = p.id
        ) as variants
      FROM products p
      ORDER BY p.name ASC
    `)

    return result.rows
  }

  /**
   * Update product status
   */
  async updateStatus(id: string, status: string): Promise<{ id: string; status: string }> {
    // Verify product exists
    const existing = await db.query('SELECT id FROM products WHERE id = $1', [id])

    if (existing.rows.length === 0) {
      throw new AppError(productMessages.NOT_FOUND, 404)
    }

    // Update status
    const result = await db.query(
      `UPDATE products SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, status`,
      [status, id]
    )

    return {
      id: result.rows[0].id,
      status: result.rows[0].status,
    }
  }

  /**
   * Update variant stock quantity
   */
  async updateVariantStock(
    productId: string,
    variantId: string,
    stockQuantity: number
  ): Promise<{ id: string; stock_quantity: number }> {
    // Verify variant exists and belongs to the product
    const existing = await db.query(
      'SELECT id FROM product_variants WHERE id = $1 AND product_id = $2',
      [variantId, productId]
    )

    if (existing.rows.length === 0) {
      throw new AppError(productMessages.VARIANT_NOT_FOUND, 404)
    }

    // Update stock quantity
    const result = await db.query(
      `UPDATE product_variants
       SET stock_quantity = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, stock_quantity`,
      [stockQuantity, variantId]
    )

    return {
      id: result.rows[0].id,
      stock_quantity: result.rows[0].stock_quantity,
    }
  }
}

// Type for pricing rule preview products
interface ProductForPricingRule {
  id: string
  name: string
  base_sku: string
  metadata: Record<string, unknown>
  categories: { id: string }[]
  tags: { id: string }[]
  badges: { id: string }[]
  variants: {
    id: string
    sku: string
    variant_name: string | null
    price: number
    price_components: Record<string, unknown>
    metadata: Record<string, unknown>
  }[]
}

export const productService = new ProductService()
