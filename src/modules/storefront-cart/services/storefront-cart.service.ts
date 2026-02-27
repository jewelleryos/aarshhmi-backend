import { db } from '../../../lib/db'
import { AppError } from '../../../utils/app-error'
import { HTTP_STATUS } from '../../../config/constants'
import { CURRENCY_CONFIG } from '../../../config/currency'
import { PRODUCT_TYPES } from '../../../config/product.config'
import { CART_CONFIG } from '../../../config/cart.config'
import { storefrontCartMessages } from '../config/storefront-cart.messages'
import { wishlistService } from '../../wishlist/services/wishlist.service'
import type {
  CartItemResponse,
  CartItemPricing,
  CartResponse,
  CartCountResponse,
  CartSummary,
  ResolvedCustomer,
} from '../types/storefront-cart.types'
import type {
  StorefrontVariantPricing,
  PricingMasterData,
} from '../../storefront/types/storefront.types'

export const storefrontCartService = {
  // ============================================
  // GET / — fetch cart with latest prices
  // ============================================
  async getCart(
    customer: ResolvedCustomer,
    cartId?: string
  ): Promise<CartResponse> {
    const resolvedCartId = await this.resolveCartId(customer, cartId)

    if (!resolvedCartId) {
      return {
        cartId: null,
        items: [],
        summary: {
          subtotalPrice: 0,
          discountAmount: 0,
          totalPrice: 0,
          totalTaxAmount: 0,
          itemCount: 0,
          availableItemCount: 0,
          hasUnavailableItems: false,
        },
        couponSummary: null,
        couponRemovalReason: null,
      }
    }

    // Fetch all cart items with product/variant/size data
    const result = await db.query(
      `SELECT
        ci.id, ci.product_id, ci.variant_id, ci.quantity,
        ci.size_chart_value_id, ci.added_price, ci.metadata AS item_metadata,
        ci.created_at,
        p.name AS product_name, p.slug AS product_slug,
        p.status AS product_status, p.metadata AS product_metadata,
        pv.variant_name, pv.sku, pv.price AS variant_price,
        pv.compare_at_price, pv.price_components,
        pv.is_available AS variant_available,
        pv.stock_quantity, pv.metadata AS variant_metadata,
        scv.name AS size_chart_value_name,
        scv.difference AS size_chart_difference,
        scv.is_default AS size_chart_is_default,
        (
          SELECT COALESCE(json_agg(
            json_build_object(
              'id', sv.id, 'name', sv.name, 'description', sv.description,
              'difference', sv.difference, 'isDefault', sv.is_default
            ) ORDER BY sv.name
          ), '[]'::json)
          FROM size_chart_values sv
          WHERE sv.size_chart_group_id = (p.metadata -> 'sizeChart' ->> 'sizeChartGroupId')
            AND (p.metadata -> 'sizeChart' ->> 'hasSizeChart')::boolean = true
        ) AS size_chart_values,
        (
          SELECT COALESCE(json_agg(
            json_build_object(
              'id', b.id, 'name', b.name, 'slug', b.slug,
              'bgColor', b.bg_color, 'fontColor', b.font_color, 'position', b.position
            ) ORDER BY b.position
          ), '[]'::json)
          FROM product_badges pb
          JOIN badges b ON pb.badge_id = b.id AND b.status = true
          WHERE pb.product_id = p.id
        ) AS badges,
        p.metadata -> 'media' AS media
      FROM cart_items ci
      JOIN products p ON p.id = ci.product_id
      JOIN product_variants pv ON pv.id = ci.variant_id
      LEFT JOIN size_chart_values scv ON scv.id = ci.size_chart_value_id
      WHERE ci.cart_id = $1
      ORDER BY ci.created_at ASC`,
      [resolvedCartId]
    )

    const rows = result.rows

    // Check if any item's product has a size chart — fetch master data once if so
    const hasSizeChartItems = rows.some(
      (row: any) => row.product_metadata?.sizeChart?.hasSizeChart === true
    )
    let masterData: PricingMasterData | null = null
    if (hasSizeChartItems) {
      masterData = await this.fetchPricingMasterData()
    }

    // Build cart items
    const items: CartItemResponse[] = []
    let subtotalPrice = 0
    let totalTaxAmount = 0
    let itemCount = 0
    let availableItemCount = 0
    let hasUnavailableItems = false

    for (const row of rows) {
      const productMeta = row.product_metadata || {}
      const variantMeta = row.variant_metadata || {}
      const hasSizeChart = productMeta.sizeChart?.hasSizeChart === true

      // Determine availability
      let isAvailable = true
      let unavailableReason: string | null = null

      if (row.product_status !== 'active') {
        isAvailable = false
        unavailableReason = 'Product is no longer available'
      } else if (!row.variant_available) {
        isAvailable = false
        unavailableReason = 'This variant is currently unavailable'
      }

      // Determine pricing
      let pricing: CartItemPricing
      if (hasSizeChart && masterData) {
        // Always recalculate for size chart products
        const difference = row.size_chart_value_id
          ? (parseFloat(row.size_chart_difference) || 0)
          : 0
        const adjustedMetalWeight = (variantMeta.metalWeight || 0) + difference
        const adjustedVariantMeta = { ...variantMeta, metalWeight: adjustedMetalWeight }
        const recalculated = this.recalculateFullPricing(adjustedVariantMeta, productMeta, masterData)
        pricing = {
          sellingPrice: recalculated.sellingPrice,
          compareAtPrice: recalculated.compareAtPrice,
        }
      } else {
        // Use stored price_components from variant
        const priceComponents = row.price_components || {}
        pricing = {
          sellingPrice: priceComponents.sellingPrice || {
            metalPrice: 0, makingCharge: 0, diamondPrice: 0, gemstonePrice: 0,
            pearlPrice: 0, finalPriceWithoutTax: 0, taxAmount: 0, finalPriceWithTax: 0,
            taxIncluded: CURRENCY_CONFIG.includeTax, finalPrice: 0,
          },
          compareAtPrice: priceComponents.compareAtPrice || {
            metalPrice: 0, makingCharge: 0, diamondPrice: 0, gemstonePrice: 0,
            pearlPrice: 0, finalPriceWithoutTax: 0, taxAmount: 0, finalPriceWithTax: 0,
            taxIncluded: CURRENCY_CONFIG.includeTax, finalPrice: 0,
          },
        }
      }

      const unitPrice = pricing.sellingPrice.finalPrice || 0
      const lineTotal = unitPrice * row.quantity
      const priceChanged = unitPrice !== row.added_price

      // Size chart values
      const sizeChartValues = hasSizeChart ? row.size_chart_values : null

      const cartItem: CartItemResponse = {
        id: row.id,
        productId: row.product_id,
        variantId: row.variant_id,
        productName: row.product_name,
        productSlug: row.product_slug,
        variantName: row.variant_name || null,
        sku: row.sku,
        quantity: row.quantity,
        sizeChartValueId: row.size_chart_value_id || null,
        sizeChartValueName: row.size_chart_value_name || null,
        options: {
          metalType: variantMeta.metalType || null,
          metalColor: variantMeta.metalColor || null,
          metalPurity: variantMeta.metalPurity || null,
          diamondClarityColor: variantMeta.diamondClarityColor || null,
          gemstoneColor: variantMeta.gemstoneColor || null,
        },
        optionConfig: productMeta.optionConfig || null,
        pricing,
        lineTotal,
        addedPrice: row.added_price,
        priceChanged,
        couponDiscount: 0,
        media: row.media || null,
        badges: row.badges || [],
        sizeChart: {
          hasSizeChart,
          sizeChartGroupId: hasSizeChart ? (productMeta.sizeChart?.sizeChartGroupId || null) : null,
          values: sizeChartValues,
        },
        isAvailable,
        unavailableReason,
      }

      items.push(cartItem)
      itemCount += row.quantity

      if (isAvailable) {
        subtotalPrice += lineTotal
        totalTaxAmount += (pricing.sellingPrice.taxAmount || 0) * row.quantity
        availableItemCount += row.quantity
      } else {
        hasUnavailableItems = true
      }
    }

    const summary: CartSummary = {
      subtotalPrice,
      discountAmount: 0,
      totalPrice: subtotalPrice,
      totalTaxAmount,
      itemCount,
      availableItemCount,
      hasUnavailableItems,
    }

    return {
      cartId: resolvedCartId,
      items,
      summary,
      couponSummary: null,
      couponRemovalReason: null,
    }
  },

  // ============================================
  // POST /items — add item to cart
  // ============================================
  async addItem(
    customer: ResolvedCustomer,
    productId: string,
    variantId: string,
    sizeChartValueId?: string,
    quantity: number = 1,
    cartId?: string
  ): Promise<CartResponse> {
    if (!customer) {
      this.assertGuestAllowed()
    }

    // Validate product and variant
    const { variant, product } = await this.validateProductVariant(productId, variantId)
    const productMeta = product.metadata || {}
    const variantMeta = variant.metadata || {}
    const hasSizeChart = productMeta.sizeChart?.hasSizeChart === true

    // Size chart validation
    let resolvedSizeChartValueId: string | null = null
    if (hasSizeChart) {
      if (!sizeChartValueId) {
        throw new AppError(storefrontCartMessages.SIZE_CHART_REQUIRED, HTTP_STATUS.BAD_REQUEST)
      }
      await this.validateSizeChartValue(productMeta, sizeChartValueId)
      resolvedSizeChartValueId = sizeChartValueId
    }

    // Find or create cart
    let resolvedCartId = await this.resolveCartId(customer, cartId)
    if (!resolvedCartId) {
      resolvedCartId = await this.createCart(customer?.id || null)
    }

    // Check if item already exists (same variant + same size)
    let existingQuery: string
    let existingParams: any[]

    if (resolvedSizeChartValueId) {
      existingQuery = `SELECT id, quantity FROM cart_items
        WHERE cart_id = $1 AND variant_id = $2 AND size_chart_value_id = $3`
      existingParams = [resolvedCartId, variantId, resolvedSizeChartValueId]
    } else {
      existingQuery = `SELECT id, quantity FROM cart_items
        WHERE cart_id = $1 AND variant_id = $2 AND size_chart_value_id IS NULL`
      existingParams = [resolvedCartId, variantId]
    }

    const existing = await db.query(existingQuery, existingParams)

    if (existing.rows.length > 0) {
      // Increment quantity
      const newQty = existing.rows[0].quantity + quantity
      if (newQty > CART_CONFIG.maxQuantityPerItem) {
        throw new AppError(
          `${storefrontCartMessages.MAX_QUANTITY_REACHED} (max ${CART_CONFIG.maxQuantityPerItem})`,
          HTTP_STATUS.BAD_REQUEST
        )
      }
      await db.query(
        `UPDATE cart_items SET quantity = $1 WHERE id = $2`,
        [newQty, existing.rows[0].id]
      )
    } else {
      // Check cart item limit
      const countResult = await db.query(
        `SELECT COUNT(*)::int AS count FROM cart_items WHERE cart_id = $1`,
        [resolvedCartId]
      )
      if (countResult.rows[0].count >= CART_CONFIG.maxCartItems) {
        throw new AppError(
          `${storefrontCartMessages.CART_LIMIT_REACHED} (max ${CART_CONFIG.maxCartItems} items)`,
          HTTP_STATUS.BAD_REQUEST
        )
      }

      // Snapshot added_price
      const addedPrice = await this.getAddedPrice(variantMeta, productMeta, variant.price, hasSizeChart, resolvedSizeChartValueId)

      await db.query(
        `INSERT INTO cart_items (cart_id, product_id, variant_id, quantity, size_chart_value_id, added_price)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [resolvedCartId, productId, variantId, quantity, resolvedSizeChartValueId, addedPrice]
      )
    }

    return this.getCart(customer, resolvedCartId)
  },

  // ============================================
  // PATCH /items/:item_id — update quantity/size
  // ============================================
  async updateItem(
    customer: ResolvedCustomer,
    itemId: string,
    quantity?: number,
    sizeChartValueId?: string,
    cartId?: string
  ): Promise<CartResponse> {
    const resolvedCartId = await this.resolveCartId(customer, cartId)
    if (!resolvedCartId) {
      throw new AppError(storefrontCartMessages.INVALID_CART, HTTP_STATUS.NOT_FOUND)
    }

    // Verify item belongs to this cart
    const item = await db.query(
      `SELECT ci.id, ci.variant_id, ci.product_id, ci.quantity, ci.size_chart_value_id,
              p.metadata AS product_metadata
       FROM cart_items ci
       JOIN products p ON p.id = ci.product_id
       WHERE ci.id = $1 AND ci.cart_id = $2`,
      [itemId, resolvedCartId]
    )

    if (item.rows.length === 0) {
      throw new AppError(storefrontCartMessages.ITEM_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    const cartItem = item.rows[0]

    // Update quantity
    if (quantity !== undefined) {
      if (quantity > CART_CONFIG.maxQuantityPerItem) {
        throw new AppError(
          `${storefrontCartMessages.MAX_QUANTITY_REACHED} (max ${CART_CONFIG.maxQuantityPerItem})`,
          HTTP_STATUS.BAD_REQUEST
        )
      }
      await db.query(`UPDATE cart_items SET quantity = $1 WHERE id = $2`, [quantity, itemId])
    }

    // Update size chart value
    if (sizeChartValueId !== undefined) {
      const productMeta = cartItem.product_metadata || {}
      const hasSizeChart = productMeta.sizeChart?.hasSizeChart === true

      if (!hasSizeChart) {
        throw new AppError(storefrontCartMessages.SIZE_CHART_VALUE_NOT_FOUND, HTTP_STATUS.BAD_REQUEST)
      }

      await this.validateSizeChartValue(productMeta, sizeChartValueId)

      // Check if same variant + new size already exists as another cart item
      const duplicate = await db.query(
        `SELECT id, quantity FROM cart_items
         WHERE cart_id = $1 AND variant_id = $2 AND size_chart_value_id = $3 AND id != $4`,
        [resolvedCartId, cartItem.variant_id, sizeChartValueId, itemId]
      )

      if (duplicate.rows.length > 0) {
        // Merge: add quantities together
        const currentQty = quantity !== undefined ? quantity : cartItem.quantity
        const mergedQty = Math.min(
          duplicate.rows[0].quantity + currentQty,
          CART_CONFIG.maxQuantityPerItem
        )
        await db.query(`UPDATE cart_items SET quantity = $1 WHERE id = $2`, [mergedQty, duplicate.rows[0].id])
        await db.query(`DELETE FROM cart_items WHERE id = $1`, [itemId])
      } else {
        await db.query(
          `UPDATE cart_items SET size_chart_value_id = $1 WHERE id = $2`,
          [sizeChartValueId, itemId]
        )
      }
    }

    return this.getCart(customer, resolvedCartId)
  },

  // ============================================
  // DELETE /items/:item_id — remove item
  // ============================================
  async removeItem(
    customer: ResolvedCustomer,
    itemId: string,
    cartId?: string
  ): Promise<CartResponse> {
    const resolvedCartId = await this.resolveCartId(customer, cartId)
    if (!resolvedCartId) {
      throw new AppError(storefrontCartMessages.INVALID_CART, HTTP_STATUS.NOT_FOUND)
    }

    const item = await db.query(
      `SELECT id FROM cart_items WHERE id = $1 AND cart_id = $2`,
      [itemId, resolvedCartId]
    )

    if (item.rows.length === 0) {
      throw new AppError(storefrontCartMessages.ITEM_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    await db.query(`DELETE FROM cart_items WHERE id = $1`, [itemId])

    return this.getCart(customer, resolvedCartId)
  },

  // ============================================
  // GET /count — item count for header badge
  // ============================================
  async getCount(
    customer: ResolvedCustomer,
    cartId?: string
  ): Promise<CartCountResponse> {
    const resolvedCartId = await this.resolveCartId(customer, cartId)

    if (!resolvedCartId) {
      return { cartId: null, count: 0 }
    }

    const result = await db.query(
      `SELECT COALESCE(SUM(quantity), 0)::int AS count FROM cart_items WHERE cart_id = $1`,
      [resolvedCartId]
    )

    return { cartId: resolvedCartId, count: result.rows[0].count }
  },

  // ============================================
  // POST /merge — merge guest cart into user's cart
  // ============================================
  async merge(
    customerId: string,
    guestCartId: string
  ): Promise<CartResponse> {
    // Find guest cart (must be a guest cart — customer_id IS NULL)
    const guestCart = await db.query(
      `SELECT id FROM carts WHERE id = $1 AND customer_id IS NULL`,
      [guestCartId]
    )

    if (guestCart.rows.length === 0) {
      throw new AppError(storefrontCartMessages.GUEST_CART_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    // Find or create user's cart
    let userCartId: string
    const userCart = await db.query(
      `SELECT id FROM carts WHERE customer_id = $1`,
      [customerId]
    )

    if (userCart.rows.length > 0) {
      userCartId = userCart.rows[0].id
    } else {
      userCartId = await this.createCart(customerId)
    }

    // Get guest cart items
    const guestItems = await db.query(
      `SELECT product_id, variant_id, quantity, size_chart_value_id, added_price
       FROM cart_items WHERE cart_id = $1`,
      [guestCartId]
    )

    // Move non-duplicate items
    for (const item of guestItems.rows) {
      // Check if same variant + same size exists in user's cart
      let existsQuery: string
      let existsParams: any[]

      if (item.size_chart_value_id) {
        existsQuery = `SELECT id FROM cart_items
          WHERE cart_id = $1 AND variant_id = $2 AND size_chart_value_id = $3`
        existsParams = [userCartId, item.variant_id, item.size_chart_value_id]
      } else {
        existsQuery = `SELECT id FROM cart_items
          WHERE cart_id = $1 AND variant_id = $2 AND size_chart_value_id IS NULL`
        existsParams = [userCartId, item.variant_id]
      }

      const exists = await db.query(existsQuery, existsParams)

      if (exists.rows.length === 0) {
        // Check max limit before adding
        const countResult = await db.query(
          `SELECT COUNT(*)::int AS count FROM cart_items WHERE cart_id = $1`,
          [userCartId]
        )
        if (countResult.rows[0].count < CART_CONFIG.maxCartItems) {
          await db.query(
            `INSERT INTO cart_items (cart_id, product_id, variant_id, quantity, size_chart_value_id, added_price)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [userCartId, item.product_id, item.variant_id, item.quantity, item.size_chart_value_id, item.added_price]
          )
        }
      }
    }

    // Delete guest cart (CASCADE deletes remaining items)
    await db.query(`DELETE FROM carts WHERE id = $1`, [guestCartId])

    return this.getCart({ id: customerId } as any, userCartId)
  },

  // ============================================
  // POST /items/:item_id/move-to-wishlist
  // ============================================
  async moveToWishlist(
    customer: ResolvedCustomer,
    itemId: string,
    cartId?: string,
    wishlistId?: string
  ): Promise<CartResponse> {
    const resolvedCartId = await this.resolveCartId(customer, cartId)
    if (!resolvedCartId) {
      throw new AppError(storefrontCartMessages.INVALID_CART, HTTP_STATUS.NOT_FOUND)
    }

    // Get cart item data
    const item = await db.query(
      `SELECT id, product_id, variant_id FROM cart_items WHERE id = $1 AND cart_id = $2`,
      [itemId, resolvedCartId]
    )

    if (item.rows.length === 0) {
      throw new AppError(storefrontCartMessages.ITEM_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    const cartItem = item.rows[0]

    // Add to wishlist (toggle — if already in wishlist, it removes then adds again, but that's fine)
    await wishlistService.toggle(customer, cartItem.product_id, cartItem.variant_id, wishlistId)

    // Remove from cart
    await db.query(`DELETE FROM cart_items WHERE id = $1`, [itemId])

    return this.getCart(customer, resolvedCartId)
  },

  // ============================================
  // POST /move-to-cart — move from wishlist to cart
  // ============================================
  async moveToCart(
    customer: ResolvedCustomer,
    wishlistItemId: string,
    sizeChartValueId?: string,
    cartId?: string,
    wishlistId?: string
  ): Promise<CartResponse> {
    // Get wishlist item data directly from DB
    const resolvedWishlistId = await wishlistService.resolveWishlistId(customer, wishlistId)
    if (!resolvedWishlistId) {
      throw new AppError('Wishlist not found', HTTP_STATUS.NOT_FOUND)
    }

    const wishlistItem = await db.query(
      `SELECT id, product_id, variant_id FROM wishlist_items WHERE id = $1 AND wishlist_id = $2`,
      [wishlistItemId, resolvedWishlistId]
    )

    if (wishlistItem.rows.length === 0) {
      throw new AppError('Wishlist item not found', HTTP_STATUS.NOT_FOUND)
    }

    const wItem = wishlistItem.rows[0]

    // Add to cart (handles validation, duplicate detection, quantity increment)
    const cartResponse = await this.addItem(
      customer,
      wItem.product_id,
      wItem.variant_id,
      sizeChartValueId,
      1,
      cartId
    )

    // Remove from wishlist
    await wishlistService.removeItem(customer, wishlistItemId, wishlistId)

    return cartResponse
  },

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  /**
   * Resolve cart ID from customer or guest cart_id
   */
  async resolveCartId(
    customer: ResolvedCustomer,
    cartId?: string
  ): Promise<string | null> {
    if (customer) {
      const result = await db.query(
        `SELECT id FROM carts WHERE customer_id = $1`,
        [customer.id]
      )
      return result.rows[0]?.id || null
    }

    if (cartId) {
      const result = await db.query(
        `SELECT id FROM carts WHERE id = $1 AND customer_id IS NULL`,
        [cartId]
      )
      return result.rows[0]?.id || null
    }

    return null
  },

  /**
   * Create a new cart
   */
  async createCart(customerId: string | null): Promise<string> {
    const result = await db.query(
      `INSERT INTO carts (customer_id) VALUES ($1) RETURNING id`,
      [customerId]
    )
    return result.rows[0].id
  },

  /**
   * Assert guest mode is allowed
   */
  assertGuestAllowed(): void {
    if (CART_CONFIG.cartMode === 'auth_only') {
      throw new AppError(storefrontCartMessages.AUTH_REQUIRED, HTTP_STATUS.UNAUTHORIZED)
    }
  },

  /**
   * Validate product and variant exist, are active, and variant belongs to product
   */
  async validateProductVariant(
    productId: string,
    variantId: string
  ): Promise<{ variant: any; product: any }> {
    const result = await db.query(
      `SELECT
        p.id AS product_id, p.status AS product_status, p.metadata AS metadata,
        pv.id AS variant_id, pv.price, pv.is_available, pv.stock_quantity,
        pv.metadata AS variant_metadata, pv.price_components
       FROM products p
       JOIN product_variants pv ON pv.product_id = p.id
       WHERE p.id = $1 AND pv.id = $2`,
      [productId, variantId]
    )

    if (result.rows.length === 0) {
      throw new AppError(storefrontCartMessages.PRODUCT_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    const row = result.rows[0]

    if (row.product_status !== 'active') {
      throw new AppError(storefrontCartMessages.PRODUCT_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    if (!row.is_available) {
      throw new AppError(storefrontCartMessages.VARIANT_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    return {
      variant: {
        id: row.variant_id,
        price: row.price,
        is_available: row.is_available,
        stock_quantity: row.stock_quantity,
        metadata: row.variant_metadata,
        price_components: row.price_components,
      },
      product: {
        id: row.product_id,
        status: row.product_status,
        metadata: row.metadata,
      },
    }
  },

  /**
   * Validate size chart value belongs to the product's size chart group
   */
  async validateSizeChartValue(
    productMeta: any,
    sizeChartValueId: string
  ): Promise<{ id: string; difference: number }> {
    const sizeChartGroupId = productMeta.sizeChart?.sizeChartGroupId
    if (!sizeChartGroupId) {
      throw new AppError(storefrontCartMessages.SIZE_CHART_VALUE_NOT_FOUND, HTTP_STATUS.BAD_REQUEST)
    }

    const result = await db.query(
      `SELECT id, difference FROM size_chart_values
       WHERE id = $1 AND size_chart_group_id = $2`,
      [sizeChartValueId, sizeChartGroupId]
    )

    if (result.rows.length === 0) {
      throw new AppError(storefrontCartMessages.SIZE_CHART_VALUE_NOT_FOUND, HTTP_STATUS.BAD_REQUEST)
    }

    return {
      id: result.rows[0].id,
      difference: parseFloat(result.rows[0].difference) || 0,
    }
  },

  /**
   * Get the added_price snapshot for a new cart item
   */
  async getAddedPrice(
    variantMeta: any,
    productMeta: any,
    variantPrice: number,
    hasSizeChart: boolean,
    sizeChartValueId: string | null
  ): Promise<number> {
    if (!hasSizeChart) {
      // Use variant's stored selling price
      return variantPrice
    }

    // For size chart products, recalculate to get the exact price for this size
    let difference = 0
    if (sizeChartValueId) {
      const scv = await db.query(
        `SELECT difference FROM size_chart_values WHERE id = $1`,
        [sizeChartValueId]
      )
      if (scv.rows.length > 0) {
        difference = parseFloat(scv.rows[0].difference) || 0
      }
    }

    const adjustedMetalWeight = (variantMeta.metalWeight || 0) + difference
    const adjustedVariantMeta = { ...variantMeta, metalWeight: adjustedMetalWeight }
    const masterData = await this.fetchPricingMasterData()
    const recalculated = this.recalculateFullPricing(adjustedVariantMeta, productMeta, masterData)
    return recalculated.sellingPrice.finalPrice
  },

  /**
   * Fetch master data for pricing recalculation (size chart)
   */
  async fetchPricingMasterData(): Promise<PricingMasterData> {
    const [metalPurities, stonePricings, makingCharges, otherCharges, mrpMarkup, pricingRules] =
      await Promise.all([
        db.query('SELECT id, metal_type_id, price FROM metal_purities WHERE status = true'),
        db.query('SELECT id, price FROM stone_prices WHERE status = true'),
        db.query(`SELECT id, metal_type_id, "from", "to", is_fixed_pricing, amount FROM making_charges WHERE status = true`),
        db.query('SELECT id, name, amount FROM other_charges WHERE status = true'),
        db.query('SELECT id, diamond, gemstone, pearl, making_charge FROM mrp_markup LIMIT 1'),
        db.query('SELECT id, name, conditions, actions, product_type FROM pricing_rules'),
      ])

    return {
      metalPurities: metalPurities.rows,
      stonePricings: stonePricings.rows,
      makingCharges: makingCharges.rows,
      otherCharges: otherCharges.rows,
      mrpMarkup: mrpMarkup.rows[0] || { diamond: 0, gemstone: 0, pearl: 0, making_charge: 0 },
      pricingRules: pricingRules.rows,
    }
  },

  /**
   * Full pricing recalculation from zero.
   * Same logic as storefront-products.service.ts
   */
  recalculateFullPricing(
    variantMeta: any,
    productMeta: any,
    masterData: PricingMasterData
  ): StorefrontVariantPricing {
    const metalPurityId = variantMeta.metalPurity
    const metalTypeId = variantMeta.metalType
    const metalWeight = variantMeta.metalWeight || 0
    const diamondClarityColorId = variantMeta.diamondClarityColor || null
    const gemstoneColorId = variantMeta.gemstoneColor || null
    const mrp = masterData.mrpMarkup

    // 1. Metal price
    const metalPurity = masterData.metalPurities.find((mp: any) => mp.id === metalPurityId)
    const metalCostPrice = metalPurity ? Math.round(metalPurity.price * metalWeight) : 0

    // 2. Making charge
    const mc = masterData.makingCharges.find(
      (m: any) => m.metal_type_id === metalTypeId && metalWeight >= m.from && metalWeight <= m.to
    )
    let baseMakingCharge = 0
    if (mc) {
      baseMakingCharge = mc.is_fixed_pricing
        ? Math.round((metalWeight * mc.amount) * CURRENCY_CONFIG.subunits)
        : Math.round((mc.amount / 100) * metalCostPrice)
    }

    let totalOtherCharges = 0
    for (const oc of masterData.otherCharges) totalOtherCharges += oc.amount
    const makingChargeCost = baseMakingCharge + totalOtherCharges

    // 3. Diamond price
    let diamondCost = 0
    const diamondEntries = productMeta?.stone?.diamond?.entries || []
    if (diamondClarityColorId && diamondEntries.length > 0) {
      for (const entry of diamondEntries) {
        const match = entry.pricings?.find((p: any) => p.clarityColorId === diamondClarityColorId)
        if (match) {
          const sp = masterData.stonePricings.find((s: any) => s.id === match.pricingId)
          if (sp) diamondCost += Math.round(sp.price * entry.totalCarat)
        }
      }
    }

    // 4. Gemstone price
    let gemstoneCost = 0
    const gemstoneEntries = productMeta?.stone?.gemstone?.entries || []
    if (gemstoneColorId && gemstoneEntries.length > 0) {
      for (const entry of gemstoneEntries) {
        const match = entry.pricings?.find((p: any) => p.colorId === gemstoneColorId)
        if (match) {
          const sp = masterData.stonePricings.find((s: any) => s.id === match.pricingId)
          if (sp) gemstoneCost += Math.round(sp.price * entry.totalCarat)
        }
      }
    }

    // 5. Pearl price
    let pearlCost = 0
    if (productMeta?.stone?.hasPearl) {
      for (const entry of (productMeta.stone.pearl?.entries || [])) {
        if (entry.amount) pearlCost += entry.amount * CURRENCY_CONFIG.subunits
      }
    }

    // 6. Pricing rule markups
    let mcMarkup = 0, diaMarkup = 0, gemMarkup = 0, pearlMarkup = 0
    for (const rule of masterData.pricingRules) {
      if (rule.product_type !== PRODUCT_TYPES.JEWELLERY_DEFAULT.code) continue
      if (!this.matchesPricingRuleConditions(rule.conditions, variantMeta, productMeta)) continue

      if (rule.actions.makingChargeMarkup > 0)
        mcMarkup += Math.round(makingChargeCost * (rule.actions.makingChargeMarkup / 100))
      if (rule.actions.diamondMarkup > 0)
        diaMarkup += Math.round(diamondCost * (rule.actions.diamondMarkup / 100))
      if (rule.actions.gemstoneMarkup > 0)
        gemMarkup += Math.round(gemstoneCost * (rule.actions.gemstoneMarkup / 100))
      if (rule.actions.pearlMarkup > 0)
        pearlMarkup += Math.round(pearlCost * (rule.actions.pearlMarkup / 100))
    }

    // 7. Selling prices
    const mcSelling = makingChargeCost + mcMarkup
    const diaSelling = diamondCost + diaMarkup
    const gemSelling = gemstoneCost + gemMarkup
    const pearlSelling = pearlCost + pearlMarkup

    // 8. CompareAt prices (MRP markup on selling)
    const mcCompareAt = Math.round(mcSelling * (1 + (mrp.making_charge / 100)))
    const diaCompareAt = Math.round(diaSelling * (1 + (mrp.diamond / 100)))
    const gemCompareAt = Math.round(gemSelling * (1 + (mrp.gemstone / 100)))
    const pearlCompareAt = Math.round(pearlSelling * (1 + (mrp.pearl / 100)))

    // 9. Totals
    const sellingTotal = metalCostPrice + mcSelling + diaSelling + gemSelling + pearlSelling
    const compareAtTotal = metalCostPrice + mcCompareAt + diaCompareAt + gemCompareAt + pearlCompareAt

    // 10. Tax
    const taxRate = CURRENCY_CONFIG.includeTax ? CURRENCY_CONFIG.taxRatePercent / 100 : 0
    const sellingTax = Math.round(sellingTotal * taxRate)
    const compareAtTax = Math.round(compareAtTotal * taxRate)
    const includeTax = CURRENCY_CONFIG.includeTax

    return {
      sellingPrice: {
        metalPrice: metalCostPrice,
        makingCharge: mcSelling,
        diamondPrice: diaSelling,
        gemstonePrice: gemSelling,
        pearlPrice: pearlSelling,
        finalPriceWithoutTax: sellingTotal,
        taxAmount: sellingTax,
        finalPriceWithTax: sellingTotal + sellingTax,
        taxIncluded: includeTax,
        finalPrice: includeTax ? sellingTotal + sellingTax : sellingTotal,
      },
      compareAtPrice: {
        metalPrice: metalCostPrice,
        makingCharge: mcCompareAt,
        diamondPrice: diaCompareAt,
        gemstonePrice: gemCompareAt,
        pearlPrice: pearlCompareAt,
        finalPriceWithoutTax: compareAtTotal,
        taxAmount: compareAtTax,
        finalPriceWithTax: compareAtTotal + compareAtTax,
        taxIncluded: includeTax,
        finalPrice: includeTax ? compareAtTotal + compareAtTax : compareAtTotal,
      },
    }
  },

  /**
   * Evaluate pricing rule conditions against variant/product metadata
   */
  matchesPricingRuleConditions(conditions: any[], variantMeta: any, productMeta: any): boolean {
    if (!conditions || conditions.length === 0) return false

    for (const cond of conditions) {
      let matched = false

      if (cond.type === 'category') {
        const ids = productMeta?.attributes?.categories?.map((c: any) => c.id) || []
        matched = cond.value.matchType === 'any'
          ? cond.value.categoryIds.some((id: string) => ids.includes(id))
          : cond.value.categoryIds.every((id: string) => ids.includes(id))
      } else if (cond.type === 'tags') {
        const ids = productMeta?.attributes?.tags?.map((t: any) => t.id) || []
        matched = cond.value.matchType === 'any'
          ? cond.value.tagIds.some((id: string) => ids.includes(id))
          : cond.value.tagIds.every((id: string) => ids.includes(id))
      } else if (cond.type === 'badges') {
        const ids = productMeta?.attributes?.badges?.map((b: any) => b.id) || []
        matched = cond.value.matchType === 'any'
          ? cond.value.badgeIds.some((id: string) => ids.includes(id))
          : cond.value.badgeIds.every((id: string) => ids.includes(id))
      } else if (cond.type === 'metal_type') {
        matched = cond.value.metalTypeIds.includes(variantMeta.metalType)
      } else if (cond.type === 'metal_color') {
        matched = cond.value.metalColorIds.includes(variantMeta.metalColor)
      } else if (cond.type === 'metal_purity') {
        matched = cond.value.metalPurityIds.includes(variantMeta.metalPurity)
      } else if (cond.type === 'diamond_clarity_color') {
        matched = productMeta?.stone?.hasDiamond && variantMeta.diamondClarityColor
          ? cond.value.diamondClarityColorIds.includes(variantMeta.diamondClarityColor) : false
      } else if (cond.type === 'diamond_carat') {
        if (!productMeta?.stone?.hasDiamond) { matched = false } else {
          let total = 0
          for (const e of (productMeta.stone.diamond?.entries || [])) total += e.totalCarat
          matched = total >= cond.value.from && total <= cond.value.to
        }
      } else if (cond.type === 'metal_weight') {
        const w = variantMeta.metalWeight || variantMeta.weights?.metal?.grams || 0
        matched = w >= cond.value.from && w <= cond.value.to
      } else if (cond.type === 'gemstone_carat') {
        if (!productMeta?.stone?.hasGemstone) { matched = false } else {
          let total = 0
          for (const e of (productMeta.stone.gemstone?.entries || [])) total += e.totalCarat
          matched = total >= cond.value.from && total <= cond.value.to
        }
      } else if (cond.type === 'pearl_gram') {
        if (!productMeta?.stone?.hasPearl) { matched = false } else {
          let total = 0
          for (const e of (productMeta.stone.pearl?.entries || [])) total += e.totalGrams
          matched = total >= cond.value.from && total <= cond.value.to
        }
      }

      if (!matched) return false
    }
    return true
  },
}
