import { db } from '../../../lib/db'
import { AppError } from '../../../utils/app-error'
import { HTTP_STATUS } from '../../../config/constants'
import {
  COUPON_TYPES,
  ENABLED_COUPON_TYPES,
  getCouponTypeDefinition,
} from '../../../config/coupon.config'
import type { CouponTypeCode } from '../../../config/coupon.config'
import { couponMessages } from '../config/coupons.messages'
import type { CouponRow, CouponListItem, CouponDetail } from '../types/coupons.types'

// ========================================
// Helper: build discount display string
// ========================================
function buildDiscountDisplay(row: CouponRow): string {
  const typeDef = getCouponTypeDefinition(row.type)
  if (!typeDef) return ''

  const formatRs = (paise: number) => {
    const rs = paise / 100
    return `Rs.${rs.toLocaleString('en-IN')}`
  }

  // For configurable types, check discount_type
  const effectiveMode = typeDef.discountMode === 'configurable'
    ? (row.discount_type || 'flat')
    : typeDef.discountMode

  if (effectiveMode === 'flat') {
    const suffix = typeDef.targetLevel === 'product' ? ' / product' : ''
    return `${formatRs(row.discount_value || 0)} off${suffix}`
  }

  if (effectiveMode === 'percentage') {
    let display = `${row.discount_percent}% off`

    if (typeDef.targetLevel === 'component') {
      const componentLabels: Record<string, string> = {
        makingCharge: 'making charge',
        diamondPrice: 'diamond price',
        gemstonePrice: 'gemstone price',
      }
      const label = typeDef.componentTarget ? componentLabels[typeDef.componentTarget] : ''
      if (label) display = `${row.discount_percent}% off ${label}`
    }

    if (typeDef.targetLevel === 'product') {
      display += ' / product'
      if (row.max_discount_per_product) {
        display += ` (max ${formatRs(row.max_discount_per_product)})`
      }
    } else if (row.max_discount) {
      display += ` (max ${formatRs(row.max_discount)})`
    }

    return display
  }

  return ''
}

// ========================================
// Helper: map DB row to list item
// ========================================
function toListItem(row: CouponRow): CouponListItem {
  const typeDef = getCouponTypeDefinition(row.type)
  return {
    id: row.id,
    code: row.code,
    type: row.type,
    typeLabel: typeDef?.label || row.type,
    discountDisplay: buildDiscountDisplay(row),
    isActive: row.is_active,
    validFrom: row.valid_from,
    validUntil: row.valid_until,
    usageCount: row.usage_count,
    usageLimit: row.usage_limit,
    createdAt: row.created_at,
  }
}

export const couponsService = {
  // ============================================
  // LIST — all coupons with optional filters
  // ============================================
  async list(filters?: {
    type?: string
    is_active?: string
    search?: string
  }): Promise<{ items: CouponListItem[] }> {
    let sql = `SELECT * FROM coupons`
    const conditions: string[] = []
    const params: unknown[] = []
    let paramIndex = 1

    if (filters?.type) {
      conditions.push(`type = $${paramIndex++}`)
      params.push(filters.type)
    }

    if (filters?.is_active === 'true') {
      conditions.push(`is_active = true`)
    } else if (filters?.is_active === 'false') {
      conditions.push(`is_active = false`)
    }

    if (filters?.search) {
      conditions.push(`UPPER(code) LIKE $${paramIndex++}`)
      params.push(`%${filters.search.toUpperCase()}%`)
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`
    }

    sql += ` ORDER BY created_at DESC`

    const result = await db.query(sql, params)
    return { items: result.rows.map(toListItem) }
  },

  // ============================================
  // GET BY ID — single coupon with detail
  // ============================================
  async getById(id: string): Promise<CouponDetail> {
    const result = await db.query(`SELECT * FROM coupons WHERE id = $1`, [id])

    if (result.rows.length === 0) {
      throw new AppError(couponMessages.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    // Count active carts with this coupon applied
    const cartCountResult = await db.query(
      `SELECT COUNT(*)::int AS count FROM carts WHERE applied_coupon_id = $1`,
      [id]
    )

    const row = result.rows[0]
    return {
      ...row,
      activeCartCount: cartCountResult.rows[0]?.count || 0,
    }
  },

  // ============================================
  // CREATE — new coupon
  // ============================================
  async create(data: Record<string, any>): Promise<CouponDetail> {
    const type = data.type as CouponTypeCode

    // Validate type is enabled
    if (!ENABLED_COUPON_TYPES.includes(type)) {
      const typeDef = getCouponTypeDefinition(type)
      if (!typeDef) {
        throw new AppError(couponMessages.INVALID_TYPE, HTTP_STATUS.BAD_REQUEST)
      }
      throw new AppError(couponMessages.TYPE_NOT_ENABLED, HTTP_STATUS.BAD_REQUEST)
    }

    // Uppercase the code
    const code = data.code.trim().toUpperCase()

    // Check uniqueness
    const existing = await db.query(
      `SELECT id FROM coupons WHERE UPPER(code) = $1`,
      [code]
    )
    if (existing.rows.length > 0) {
      throw new AppError(couponMessages.CODE_ALREADY_EXISTS, HTTP_STATUS.CONFLICT)
    }

    // Get type definition and apply fixed behaviors
    const typeDef = COUPON_TYPES[type]
    const guestAllowed = typeDef.fixedBehaviors.guestAllowed !== undefined
      ? typeDef.fixedBehaviors.guestAllowed
      : (data.guest_allowed ?? true)

    const showOnStorefront = typeDef.fixedBehaviors.showOnStorefront !== undefined
      ? typeDef.fixedBehaviors.showOnStorefront
      : (data.show_on_storefront ?? true)

    // Validate type-specific fields
    this.validateTypeFields(typeDef, data)

    // Validate conditions fields are allowed for this type
    if (data.conditions && data.conditions.length > 0) {
      for (const condition of data.conditions) {
        if (!typeDef.availableConditions.includes(condition.field)) {
          throw new AppError(
            `${couponMessages.INVALID_CONDITION_FIELD}: "${condition.field}"`,
            HTTP_STATUS.BAD_REQUEST
          )
        }
      }
    }

    const result = await db.query(
      `INSERT INTO coupons (
        code, type, discount_type, discount_value, discount_percent,
        max_discount, max_discount_per_product,
        applicable_product_ids, assigned_customer_emails,
        conditions, min_cart_value, valid_from, valid_until,
        usage_limit, is_active, guest_allowed, show_on_storefront,
        description, display_text, metadata
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7,
        $8, $9,
        $10, $11, $12, $13,
        $14, $15, $16, $17,
        $18, $19, $20
      ) RETURNING id`,
      [
        code,
        type,
        data.discount_type || null,
        data.discount_value || null,
        data.discount_percent || null,
        data.max_discount || null,
        data.max_discount_per_product || null,
        data.applicable_product_ids || null,
        data.assigned_customer_emails || null,
        JSON.stringify(data.conditions || []),
        data.min_cart_value || null,
        data.valid_from || null,
        data.valid_until || null,
        data.usage_limit || null,
        data.is_active ?? true,
        guestAllowed,
        showOnStorefront,
        data.description || null,
        data.display_text || null,
        JSON.stringify(data.metadata || {}),
      ]
    )

    return this.getById(result.rows[0].id)
  },

  // ============================================
  // UPDATE — edit coupon (type cannot change)
  // ============================================
  async update(id: string, data: Record<string, any>): Promise<CouponDetail> {
    // Get existing coupon
    const existing = await this.getById(id)

    // Reject type change
    if (data.type !== undefined) {
      throw new AppError(couponMessages.TYPE_CANNOT_CHANGE, HTTP_STATUS.BAD_REQUEST)
    }

    const typeDef = getCouponTypeDefinition(existing.type)!

    // If code is changing, check uniqueness
    if (data.code !== undefined) {
      const code = data.code.trim().toUpperCase()
      const duplicate = await db.query(
        `SELECT id FROM coupons WHERE UPPER(code) = $1 AND id != $2`,
        [code, id]
      )
      if (duplicate.rows.length > 0) {
        throw new AppError(couponMessages.CODE_ALREADY_EXISTS, HTTP_STATUS.CONFLICT)
      }
      data.code = code
    }

    // Validate conditions if provided
    if (data.conditions && data.conditions.length > 0) {
      for (const condition of data.conditions) {
        if (!typeDef.availableConditions.includes(condition.field)) {
          throw new AppError(
            `${couponMessages.INVALID_CONDITION_FIELD}: "${condition.field}"`,
            HTTP_STATUS.BAD_REQUEST
          )
        }
      }
    }

    // Build dynamic update query
    const updates: string[] = []
    const values: unknown[] = []
    let paramIndex = 1

    const fields: Array<{ key: string; column: string; transform?: (v: any) => any }> = [
      { key: 'code', column: 'code' },
      { key: 'discount_type', column: 'discount_type' },
      { key: 'discount_value', column: 'discount_value' },
      { key: 'discount_percent', column: 'discount_percent' },
      { key: 'max_discount', column: 'max_discount' },
      { key: 'max_discount_per_product', column: 'max_discount_per_product' },
      { key: 'applicable_product_ids', column: 'applicable_product_ids' },
      { key: 'assigned_customer_emails', column: 'assigned_customer_emails' },
      { key: 'conditions', column: 'conditions', transform: (v: any) => JSON.stringify(v) },
      { key: 'min_cart_value', column: 'min_cart_value' },
      { key: 'valid_from', column: 'valid_from' },
      { key: 'valid_until', column: 'valid_until' },
      { key: 'usage_limit', column: 'usage_limit' },
      { key: 'is_active', column: 'is_active' },
      { key: 'guest_allowed', column: 'guest_allowed' },
      { key: 'show_on_storefront', column: 'show_on_storefront' },
      { key: 'description', column: 'description' },
      { key: 'display_text', column: 'display_text' },
      { key: 'metadata', column: 'metadata', transform: (v: any) => JSON.stringify(v) },
    ]

    for (const field of fields) {
      if (data[field.key] !== undefined) {
        // Respect fixed behaviors
        if (field.key === 'guest_allowed' && typeDef.fixedBehaviors.guestAllowed !== undefined) {
          continue
        }
        if (field.key === 'show_on_storefront' && typeDef.fixedBehaviors.showOnStorefront !== undefined) {
          continue
        }

        const value = field.transform ? field.transform(data[field.key]) : data[field.key]
        updates.push(`${field.column} = $${paramIndex++}`)
        values.push(value)
      }
    }

    if (updates.length === 0) {
      return this.getById(id)
    }

    values.push(id)
    await db.query(
      `UPDATE coupons SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      values
    )

    return this.getById(id)
  },

  // ============================================
  // DELETE — remove coupon
  // ============================================
  async delete(id: string): Promise<void> {
    const result = await db.query(
      `DELETE FROM coupons WHERE id = $1 RETURNING id`,
      [id]
    )

    if (result.rows.length === 0) {
      throw new AppError(couponMessages.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }
  },

  // ============================================
  // CHECK DEPENDENCY — count active carts using this coupon
  // ============================================
  async checkDependency(id: string): Promise<{ canDelete: boolean; activeCartCount: number }> {
    // Ensure coupon exists
    await this.getById(id)

    const result = await db.query(
      `SELECT COUNT(*)::int AS count FROM carts WHERE applied_coupon_id = $1`,
      [id]
    )

    const activeCartCount = result.rows[0]?.count || 0
    return {
      canDelete: true, // Always allow delete — FK is SET NULL
      activeCartCount,
    }
  },

  // ============================================
  // VALIDATE TYPE FIELDS (private)
  // ============================================
  validateTypeFields(
    typeDef: { discountMode: string; targetLevel: string; requiresProductIds: boolean; requiresCustomerEmails: boolean },
    data: Record<string, any>
  ): void {
    const { discountMode, targetLevel, requiresProductIds, requiresCustomerEmails } = typeDef

    if (discountMode === 'flat') {
      if (!data.discount_value || data.discount_value <= 0) {
        throw new AppError(couponMessages.DISCOUNT_VALUE_REQUIRED, HTTP_STATUS.BAD_REQUEST)
      }
    } else if (discountMode === 'percentage') {
      if (!data.discount_percent || data.discount_percent <= 0) {
        throw new AppError(couponMessages.DISCOUNT_PERCENT_REQUIRED, HTTP_STATUS.BAD_REQUEST)
      }
      if (!data.max_discount || data.max_discount <= 0) {
        throw new AppError(couponMessages.MAX_DISCOUNT_REQUIRED, HTTP_STATUS.BAD_REQUEST)
      }
    } else if (discountMode === 'configurable') {
      if (!data.discount_type) {
        throw new AppError(couponMessages.DISCOUNT_TYPE_REQUIRED, HTTP_STATUS.BAD_REQUEST)
      }
      if (data.discount_type === 'flat') {
        if (!data.discount_value || data.discount_value <= 0) {
          throw new AppError(couponMessages.DISCOUNT_VALUE_REQUIRED, HTTP_STATUS.BAD_REQUEST)
        }
      } else if (data.discount_type === 'percentage') {
        if (!data.discount_percent || data.discount_percent <= 0) {
          throw new AppError(couponMessages.DISCOUNT_PERCENT_REQUIRED, HTTP_STATUS.BAD_REQUEST)
        }
        if (!data.max_discount || data.max_discount <= 0) {
          throw new AppError(couponMessages.MAX_DISCOUNT_REQUIRED, HTTP_STATUS.BAD_REQUEST)
        }
      }
    }

    if (requiresProductIds) {
      if (!data.applicable_product_ids || data.applicable_product_ids.length === 0) {
        throw new AppError(couponMessages.PRODUCT_IDS_REQUIRED, HTTP_STATUS.BAD_REQUEST)
      }
    }

    // Product-level types need at least one product-level condition OR applicable_product_ids
    if (targetLevel === 'product' && !requiresProductIds) {
      const hasProductIds = data.applicable_product_ids && data.applicable_product_ids.length > 0
      const hasProductConditions = data.conditions && data.conditions.length > 0 &&
        data.conditions.some((c: any) => !['cart_subtotal', 'item_count'].includes(c.field))

      if (!hasProductIds && !hasProductConditions) {
        throw new AppError(couponMessages.PRODUCT_TARGETING_REQUIRED, HTTP_STATUS.BAD_REQUEST)
      }
    }

    if (requiresCustomerEmails) {
      const hasEmails = data.assigned_customer_emails && data.assigned_customer_emails.length > 0
      const hasCustomerIds = data.metadata?.assigned_customer_ids && data.metadata.assigned_customer_ids.length > 0
      if (!hasEmails && !hasCustomerIds) {
        throw new AppError(couponMessages.CUSTOMER_EMAILS_REQUIRED, HTTP_STATUS.BAD_REQUEST)
      }
    }
  },
}
