import { db } from '../../../lib/db'
import { AppError } from '../../../utils/app-error'
import { HTTP_STATUS } from '../../../config/constants'
import { WISHLIST_CONFIG } from '../../../config/wishlist.config'
import { wishlistMessages } from '../config/wishlist.messages'
import type {
  WishlistItem,
  WishlistResponse,
  WishlistCheckResponse,
  ResolvedCustomer,
} from '../types/wishlist.types'

export const wishlistService = {
  // ============================================
  // GET /wishlist — fetch wishlist with items
  // ============================================
  async getWishlist(
    customer: ResolvedCustomer,
    wishlistId?: string
  ): Promise<WishlistResponse> {
    const resolved = await this.resolveWishlistId(customer, wishlistId)

    if (!resolved) {
      return { wishlistId: null, wishlistItems: [] }
    }

    const wishlistItems = await this.fetchWishlistItems(resolved)
    return { wishlistId: resolved, wishlistItems }
  },

  // ============================================
  // POST /toggle — add or remove item
  // ============================================
  async toggle(
    customer: ResolvedCustomer,
    productId: string,
    variantId: string,
    wishlistId?: string
  ): Promise<{ response: WishlistResponse; added: boolean }> {
    // Check guest mode
    if (!customer) {
      this.assertGuestAllowed()
    }

    // Validate product and variant exist
    const variant = await this.validateProductVariant(productId, variantId)

    // Find or create wishlist
    let resolvedWishlistId = await this.resolveWishlistId(customer, wishlistId)

    if (!resolvedWishlistId) {
      resolvedWishlistId = await this.createWishlist(customer?.id || null)
    }

    // Check if item already exists
    const existing = await db.query(
      `SELECT id FROM wishlist_items
       WHERE wishlist_id = $1 AND product_id = $2 AND variant_id = $3`,
      [resolvedWishlistId, productId, variantId]
    )

    let added: boolean

    if (existing.rows.length > 0) {
      // Item exists — remove it (toggle off)
      await db.query(`DELETE FROM wishlist_items WHERE id = $1`, [existing.rows[0].id])
      added = false
    } else {
      // Item doesn't exist — add it (toggle on)
      // Check max limit
      const countResult = await db.query(
        `SELECT COUNT(*)::int AS count FROM wishlist_items WHERE wishlist_id = $1`,
        [resolvedWishlistId]
      )
      if (countResult.rows[0].count >= WISHLIST_CONFIG.maxWishlistItems) {
        throw new AppError(
          `${wishlistMessages.WISHLIST_LIMIT_REACHED} (max ${WISHLIST_CONFIG.maxWishlistItems} items)`,
          HTTP_STATUS.BAD_REQUEST
        )
      }

      await db.query(
        `INSERT INTO wishlist_items (wishlist_id, product_type, product_id, variant_id, added_price)
         VALUES ($1, $2, $3, $4, $5)`,
        [resolvedWishlistId, 'jewellery_default', productId, variantId, variant.price]
      )
      added = true
    }

    const wishlistItems = await this.fetchWishlistItems(resolvedWishlistId)
    return {
      response: { wishlistId: resolvedWishlistId, wishlistItems },
      added,
    }
  },

  // ============================================
  // DELETE /items/:item_id — remove specific item
  // ============================================
  async removeItem(
    customer: ResolvedCustomer,
    itemId: string,
    wishlistId?: string
  ): Promise<WishlistResponse> {
    const resolvedWishlistId = await this.resolveWishlistId(customer, wishlistId)

    if (!resolvedWishlistId) {
      throw new AppError(wishlistMessages.INVALID_WISHLIST, HTTP_STATUS.NOT_FOUND)
    }

    // Verify item belongs to this wishlist
    const item = await db.query(
      `SELECT id FROM wishlist_items WHERE id = $1 AND wishlist_id = $2`,
      [itemId, resolvedWishlistId]
    )

    if (item.rows.length === 0) {
      throw new AppError(wishlistMessages.ITEM_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    await db.query(`DELETE FROM wishlist_items WHERE id = $1`, [itemId])

    const wishlistItems = await this.fetchWishlistItems(resolvedWishlistId)
    return { wishlistId: resolvedWishlistId, wishlistItems }
  },

  // ============================================
  // POST /check — bulk check which variants are wishlisted
  // ============================================
  async check(
    customer: ResolvedCustomer,
    variantIds: string[],
    wishlistId?: string
  ): Promise<WishlistCheckResponse> {
    const resolvedWishlistId = await this.resolveWishlistId(customer, wishlistId)

    if (!resolvedWishlistId) {
      return { wishlistedVariantIds: [] }
    }

    const result = await db.query(
      `SELECT variant_id FROM wishlist_items
       WHERE wishlist_id = $1 AND variant_id = ANY($2)`,
      [resolvedWishlistId, variantIds]
    )

    return {
      wishlistedVariantIds: result.rows.map((r: any) => r.variant_id),
    }
  },

  // ============================================
  // GET /count — item count for header badge
  // ============================================
  async getCount(
    customer: ResolvedCustomer,
    wishlistId?: string
  ): Promise<WishlistResponse> {
    const resolved = await this.resolveWishlistId(customer, wishlistId)

    if (!resolved) {
      return { wishlistId: null, wishlistItems: [] }
    }

    const wishlistItems = await this.fetchWishlistItems(resolved)
    return { wishlistId: resolved, wishlistItems }
  },

  // ============================================
  // POST /merge — merge guest wishlist into user's
  // ============================================
  async merge(
    customerId: string,
    guestWishlistId: string
  ): Promise<WishlistResponse> {
    // Find guest wishlist (must be a guest wishlist — customer_id IS NULL)
    const guestWishlist = await db.query(
      `SELECT id FROM wishlists WHERE id = $1 AND customer_id IS NULL`,
      [guestWishlistId]
    )

    if (guestWishlist.rows.length === 0) {
      throw new AppError(wishlistMessages.GUEST_WISHLIST_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    // Find or create user's wishlist
    let userWishlistId: string
    const userWishlist = await db.query(
      `SELECT id FROM wishlists WHERE customer_id = $1`,
      [customerId]
    )

    if (userWishlist.rows.length > 0) {
      userWishlistId = userWishlist.rows[0].id
    } else {
      userWishlistId = await this.createWishlist(customerId)
    }

    // Get guest items
    const guestItems = await db.query(
      `SELECT product_type, product_id, variant_id, added_price FROM wishlist_items
       WHERE wishlist_id = $1`,
      [guestWishlistId]
    )

    // Move non-duplicate items
    for (const item of guestItems.rows) {
      const exists = await db.query(
        `SELECT id FROM wishlist_items
         WHERE wishlist_id = $1 AND product_id = $2 AND variant_id = $3`,
        [userWishlistId, item.product_id, item.variant_id]
      )

      if (exists.rows.length === 0) {
        // Check max limit before adding
        const countResult = await db.query(
          `SELECT COUNT(*)::int AS count FROM wishlist_items WHERE wishlist_id = $1`,
          [userWishlistId]
        )
        if (countResult.rows[0].count < WISHLIST_CONFIG.maxWishlistItems) {
          await db.query(
            `INSERT INTO wishlist_items (wishlist_id, product_type, product_id, variant_id, added_price)
             VALUES ($1, $2, $3, $4, $5)`,
            [userWishlistId, item.product_type, item.product_id, item.variant_id, item.added_price]
          )
        }
      }
    }

    // Delete guest wishlist (cascade deletes remaining items)
    await db.query(`DELETE FROM wishlists WHERE id = $1`, [guestWishlistId])

    const wishlistItems = await this.fetchWishlistItems(userWishlistId)
    return { wishlistId: userWishlistId, wishlistItems }
  },

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  /**
   * Resolve wishlist ID from customer or guest wishlist_id
   * Returns null if no wishlist found (don't create)
   */
  async resolveWishlistId(
    customer: ResolvedCustomer,
    wishlistId?: string
  ): Promise<string | null> {
    if (customer) {
      // Logged-in user — find by customer_id
      const result = await db.query(
        `SELECT id FROM wishlists WHERE customer_id = $1`,
        [customer.id]
      )
      return result.rows[0]?.id || null
    }

    if (wishlistId) {
      // Guest — find by wishlist_id (must be a guest wishlist)
      const result = await db.query(
        `SELECT id FROM wishlists WHERE id = $1 AND customer_id IS NULL`,
        [wishlistId]
      )
      return result.rows[0]?.id || null
    }

    return null
  },

  /**
   * Create a new wishlist
   */
  async createWishlist(customerId: string | null): Promise<string> {
    const result = await db.query(
      `INSERT INTO wishlists (customer_id) VALUES ($1) RETURNING id`,
      [customerId]
    )
    return result.rows[0].id
  },

  /**
   * Assert guest mode is allowed
   */
  assertGuestAllowed(): void {
    if (WISHLIST_CONFIG.wishlistMode === 'auth_only') {
      throw new AppError(wishlistMessages.AUTH_REQUIRED, HTTP_STATUS.UNAUTHORIZED)
    }
  },

  /**
   * Validate product and variant exist and return variant data
   */
  async validateProductVariant(
    productId: string,
    variantId: string
  ): Promise<{ price: number }> {
    const result = await db.query(
      `SELECT pv.price
       FROM product_variants pv
       JOIN products p ON p.id = pv.product_id
       WHERE pv.id = $1 AND pv.product_id = $2 AND p.status = 'active'`,
      [variantId, productId]
    )

    if (result.rows.length === 0) {
      throw new AppError(wishlistMessages.VARIANT_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    return { price: result.rows[0].price }
  },

  /**
   * Fetch full wishlist items with product data for response
   */
  async fetchWishlistItems(wishlistId: string): Promise<WishlistItem[]> {
    const result = await db.query(
      `SELECT
        wi.id,
        wi.product_id,
        wi.variant_id,
        wi.product_type,
        wi.added_price,
        wi.created_at,
        p.name AS product_name,
        p.slug AS product_slug,
        p.status AS product_status,
        p.metadata -> 'media' AS media,
        (p.metadata -> 'sizeChart' ->> 'hasSizeChart')::boolean AS has_size_chart,
        p.metadata -> 'sizeChart' ->> 'sizeChartGroupId' AS size_chart_group_id,
        pv.variant_name,
        pv.sku,
        pv.price AS current_price,
        pv.compare_at_price,
        pv.is_available,
        pv.metadata ->> 'metalType' AS metal_type,
        pv.metadata ->> 'metalColor' AS metal_color,
        pv.metadata ->> 'metalPurity' AS metal_purity,
        pv.metadata ->> 'diamondClarityColor' AS diamond_clarity_color,
        pv.metadata ->> 'gemstoneColor' AS gemstone_color,
        (
          SELECT COALESCE(json_agg(
            json_build_object(
              'id', scv.id,
              'name', scv.name,
              'description', scv.description,
              'difference', scv.difference,
              'isDefault', scv.is_default
            ) ORDER BY scv.name
          ), '[]'::json)
          FROM size_chart_values scv
          WHERE scv.size_chart_group_id = (p.metadata -> 'sizeChart' ->> 'sizeChartGroupId')
            AND (p.metadata -> 'sizeChart' ->> 'hasSizeChart')::boolean = true
        ) AS size_chart_values,
        (
          SELECT COALESCE(json_agg(
            json_build_object(
              'id', b.id,
              'name', b.name,
              'slug', b.slug,
              'bg_color', b.bg_color,
              'font_color', b.font_color,
              'position', b.position
            ) ORDER BY b.position
          ), '[]'::json)
          FROM product_badges pb
          JOIN badges b ON pb.badge_id = b.id AND b.status = true
          WHERE pb.product_id = p.id
        ) AS badges
       FROM wishlist_items wi
       JOIN products p ON p.id = wi.product_id
       JOIN product_variants pv ON pv.id = wi.variant_id
       WHERE wi.wishlist_id = $1
       ORDER BY wi.created_at DESC`,
      [wishlistId]
    )

    return result.rows.map((row: any) => {
      const hasSizeChart = row.has_size_chart === true
      const sizeChartValues = hasSizeChart ? row.size_chart_values : null

      return {
        id: row.id,
        productId: row.product_id,
        variantId: row.variant_id,
        productType: row.product_type,
        productName: row.product_name,
        productSlug: row.product_slug,
        variantName: row.variant_name || null,
        sku: row.sku,
        currentPrice: row.current_price,
        compareAtPrice: row.compare_at_price || null,
        addedPrice: row.added_price,
        priceDrop: row.current_price < row.added_price,
        options: {
          metalType: row.metal_type || null,
          metalColor: row.metal_color || null,
          metalPurity: row.metal_purity || null,
          diamondClarityColor: row.diamond_clarity_color || null,
          gemstoneColor: row.gemstone_color || null,
        },
        media: row.media || null,
        sizeChart: {
          hasSizeChart,
          sizeChartGroupId: hasSizeChart ? row.size_chart_group_id : null,
          values: sizeChartValues,
        },
        badges: row.badges || [],
        isAvailable: row.is_available && row.product_status === 'active',
        createdAt: row.created_at,
      }
    })
  },
}
