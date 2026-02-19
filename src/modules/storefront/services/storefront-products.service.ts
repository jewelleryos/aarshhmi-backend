import { db } from '../../../lib/db'
import type {
  StorefrontProductsParams,
  StorefrontProductsResponse,
  StorefrontProductCard,
  StorefrontProductVariant,
} from '../types/storefront.types'

class StorefrontProductsService {
  private static readonly DEFAULT_LIMIT = 24
  private static readonly MAX_LIMIT = 48
  private static readonly DEFAULT_SORT_KEY = 'newest'

  /**
   * Get paginated product listings with filters + sorting
   */
  async getProducts(params: StorefrontProductsParams): Promise<StorefrontProductsResponse> {
    const categories = params.categories || []
    const tags = params.tags || []
    const priceRanges = params.price_ranges || []
    const page = Math.max(1, params.page || 1)
    const limit = Math.min(
      StorefrontProductsService.MAX_LIMIT,
      Math.max(1, params.limit || StorefrontProductsService.DEFAULT_LIMIT)
    )
    const offset = (page - 1) * limit
    const sortKey = params.sort_by || StorefrontProductsService.DEFAULT_SORT_KEY

    // 1. Look up sort config, resolve price ranges, and group tags by tag group — in parallel
    const [sortConfig, priceRangeFilters, tagsByGroup] = await Promise.all([
      this.getSortConfig(sortKey),
      priceRanges.length > 0 ? this.getPriceRangeValues(priceRanges) : Promise.resolve([]),
      tags.length > 0 ? this.groupTagsByTagGroup(tags) : Promise.resolve(new Map<string, string[]>()),
    ])

    // 2. Build WHERE conditions
    const values: unknown[] = []
    let paramIndex = 1
    const whereConditions: string[] = [`p.status = 'active'`]

    // Category filter (WHERE EXISTS — prevents duplicate rows)
    if (categories.length > 0) {
      whereConditions.push(
        `EXISTS (SELECT 1 FROM product_categories pc WHERE pc.product_id = p.id AND pc.category_id = ANY($${paramIndex}))`
      )
      values.push(categories)
      paramIndex++
    }

    // Tag filter — AND between groups, OR within group
    // Each tag group gets its own EXISTS clause
    for (const [, groupTagIds] of tagsByGroup) {
      whereConditions.push(
        `EXISTS (SELECT 1 FROM product_tags pt WHERE pt.product_id = p.id AND pt.tag_id = ANY($${paramIndex}))`
      )
      values.push(groupTagIds)
      paramIndex++
    }

    // Price range filter (OR across ranges)
    if (priceRangeFilters.length > 0) {
      const priceConditions: string[] = []
      for (const range of priceRangeFilters) {
        priceConditions.push(
          `(p.min_price <= $${paramIndex} AND p.max_price >= $${paramIndex + 1})`
        )
        values.push(range.max_price, range.min_price)
        paramIndex += 2
      }
      whereConditions.push(`(${priceConditions.join(' OR ')})`)
    }

    const whereClause = whereConditions.join(' AND ')

    // 3. Build ORDER BY from sort config
    let orderBy = `${sortConfig.sort_column} ${sortConfig.sort_direction}`
    if (sortConfig.tiebreaker_column && sortConfig.tiebreaker_direction) {
      orderBy += `, ${sortConfig.tiebreaker_column} ${sortConfig.tiebreaker_direction}`
    }

    // 4. Run count + product queries in parallel
    const limitParam = `$${paramIndex}`
    const offsetParam = `$${paramIndex + 1}`

    const countQuery = `
      SELECT COUNT(p.id) AS total
      FROM products p
      WHERE ${whereClause}
    `

    const productQuery = `
      SELECT
        p.id, p.name, p.slug, p.base_sku,
        p.default_variant_id,
        p.metadata -> 'optionConfig' AS option_config,
        p.metadata -> 'availabilityMap' AS availability_map,
        p.metadata -> 'media' AS media,
        p.created_at,

        (
          SELECT COALESCE(json_agg(
            json_build_object(
              'id', pv.id,
              'sku', pv.sku,
              'price', pv.price,
              'compare_at_price', pv.compare_at_price,
              'is_available', pv.is_available,
              'metadata', pv.metadata
            )
          ), '[]'::json)
          FROM product_variants pv
          WHERE pv.product_id = p.id
        ) AS variants,

        (
          SELECT COALESCE(json_agg(
            json_build_object(
              'id', b.id,
              'name', b.name,
              'slug', b.slug,
              'bg_color', b.bg_color,
              'font_color', b.font_color,
              'position', b.position
            )
          ), '[]'::json)
          FROM product_badges pb
          JOIN badges b ON b.id = pb.badge_id AND b.status = TRUE
          WHERE pb.product_id = p.id
        ) AS badges

      FROM products p
      WHERE ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ${limitParam} OFFSET ${offsetParam}
    `

    const productValues = [...values, limit, offset]

    const [countResult, productResult] = await Promise.all([
      db.query(countQuery, values),
      db.query(productQuery, productValues),
    ])

    const total = Number(countResult.rows[0].total)
    const totalPages = Math.ceil(total / limit)

    // 5. Transform rows — extract metadata fields
    const products: StorefrontProductCard[] = productResult.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      base_sku: row.base_sku,
      default_variant_id: row.default_variant_id,
      option_config: row.option_config || null,
      availability_map: row.availability_map || null,
      variants: this.transformVariants(row.variants),
      media: row.media || null,
      badges: row.badges || [],
      created_at: row.created_at,
    }))

    return {
      products,
      pagination: {
        page,
        limit,
        total,
        total_pages: totalPages,
      },
    }
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  /**
   * Transform variant rows — extract master data IDs from variant metadata
   */
  private transformVariants(variants: any[]): StorefrontProductVariant[] {
    return variants.map((v: any) => ({
      id: v.id,
      sku: v.sku,
      price: v.price,
      compare_at_price: v.compare_at_price,
      is_available: v.is_available,
      options: {
        metalType: v.metadata?.metalType || null,
        metalColor: v.metadata?.metalColor || null,
        metalPurity: v.metadata?.metalPurity || null,
        diamondClarityColor: v.metadata?.diamondClarityColor || null,
        gemstoneColor: v.metadata?.gemstoneColor || null,
      },
    }))
  }

  /**
   * Look up sort config from sort_by_options table.
   * Falls back to 'newest' if the given key is invalid/inactive.
   */
  private async getSortConfig(sortKey: string) {
    const result = await db.query(
      `SELECT sort_column, sort_direction, tiebreaker_column, tiebreaker_direction
       FROM sort_by_options
       WHERE key = $1 AND is_active = TRUE`,
      [sortKey]
    )

    if (result.rows.length > 0) {
      return result.rows[0] as {
        sort_column: string
        sort_direction: string
        tiebreaker_column: string | null
        tiebreaker_direction: string | null
      }
    }

    // Fallback to newest
    const fallback = await db.query(
      `SELECT sort_column, sort_direction, tiebreaker_column, tiebreaker_direction
       FROM sort_by_options
       WHERE key = 'newest'`
    )

    return fallback.rows[0] as {
      sort_column: string
      sort_direction: string
      tiebreaker_column: string | null
      tiebreaker_direction: string | null
    }
  }

  /**
   * Group selected tag IDs by their tag group.
   * Returns Map<tagGroupId, tagIds[]> so each group gets a separate EXISTS clause.
   */
  private async groupTagsByTagGroup(tagIds: string[]): Promise<Map<string, string[]>> {
    const result = await db.query(
      `SELECT id, tag_group_id FROM tags WHERE id = ANY($1)`,
      [tagIds]
    )

    const grouped = new Map<string, string[]>()
    for (const row of result.rows) {
      if (!grouped.has(row.tag_group_id)) {
        grouped.set(row.tag_group_id, [])
      }
      grouped.get(row.tag_group_id)!.push(row.id)
    }
    return grouped
  }

  /**
   * Get min/max values for selected price range IDs
   */
  private async getPriceRangeValues(priceRangeIds: string[]) {
    const result = await db.query(
      `SELECT min_price, max_price FROM price_filter_ranges WHERE id = ANY($1)`,
      [priceRangeIds]
    )
    return result.rows as { min_price: number; max_price: number }[]
  }
}

export const storefrontProductsService = new StorefrontProductsService()
