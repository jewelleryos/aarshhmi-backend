import type { CouponTypeCode } from '../../../config/coupon.config'

// ========================================
// Coupon DB row
// ========================================
export interface CouponRow {
  id: string
  code: string
  type: CouponTypeCode
  discount_type: 'flat' | 'percentage' | null
  discount_value: number | null
  discount_percent: number | null
  max_discount: number | null
  max_discount_per_product: number | null
  applicable_product_ids: string[] | null
  assigned_customer_emails: string[] | null
  conditions: CouponCondition[]
  min_cart_value: number | null
  valid_from: string | null
  valid_until: string | null
  usage_limit: number | null
  usage_count: number
  is_active: boolean
  guest_allowed: boolean
  show_on_storefront: boolean
  description: string | null
  display_text: string | null
  metadata: CouponMetadata
  created_at: string
  updated_at: string
}

// ========================================
// Metadata structure
// ========================================
export interface CouponMetadata {
  terms_and_conditions?: string | null
  assigned_customer_ids?: string[] | null
}

// ========================================
// Condition structure
// ========================================
export interface CouponCondition {
  field: string
  operator: string
  value: any
}

// ========================================
// Admin list response item
// ========================================
export interface CouponListItem {
  id: string
  code: string
  type: CouponTypeCode
  typeLabel: string
  discountDisplay: string
  isActive: boolean
  validFrom: string | null
  validUntil: string | null
  usageCount: number
  usageLimit: number | null
  createdAt: string
}

// ========================================
// Admin detail response
// ========================================
export interface CouponDetail extends CouponRow {
  activeCartCount: number
}
