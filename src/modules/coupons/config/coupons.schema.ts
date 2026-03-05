import { z } from 'zod'
import { COUPON_CONFIG } from '../../../config/coupon.config'

// ========================================
// Condition schema
// ========================================
const conditionSchema = z.object({
  field: z.string().min(1),
  operator: z.string().min(1),
  value: z.any(),
})

// ========================================
// Create coupon
// ========================================
export const createCouponSchema = z.object({
  code: z.string().min(1, 'Code is required').max(COUPON_CONFIG.maxCodeLength),
  type: z.string().min(1, 'Type is required'),

  // Discount fields (validated per-type in service)
  discount_type: z.enum(['flat', 'percentage']).optional(),
  discount_value: z.number().int().min(1).optional(),
  discount_percent: z.number().min(0.01).max(100).optional(),
  max_discount: z.number().int().min(1).optional(),
  max_discount_per_product: z.number().int().min(1).optional(),

  // Targeting
  applicable_product_ids: z.array(z.string()).optional(),
  assigned_customer_emails: z.array(z.string().email()).optional(),

  // Conditions
  conditions: z.array(conditionSchema).max(COUPON_CONFIG.maxConditions).optional().default([]),

  // Constraints
  min_cart_value: z.number().int().min(0).optional().nullable(),
  valid_from: z.string().optional().nullable(),
  valid_until: z.string().optional().nullable(),
  usage_limit: z.number().int().min(1).optional().nullable(),

  // Flags
  is_active: z.boolean().optional().default(true),
  guest_allowed: z.boolean().optional().default(true),
  show_on_storefront: z.boolean().optional().default(true),

  // Display
  description: z.string().optional().nullable(),
  display_text: z.string().optional().nullable(),

  // Metadata
  metadata: z.object({
    terms_and_conditions: z.string().optional().nullable(),
    assigned_customer_ids: z.array(z.string()).optional().nullable(),
  }).optional().default({}),
})

// ========================================
// Update coupon — all optional except no type change
// ========================================
export const updateCouponSchema = z.object({
  code: z.string().min(1).max(COUPON_CONFIG.maxCodeLength).optional(),

  // type is NOT in update schema — cannot change type

  discount_type: z.enum(['flat', 'percentage']).optional(),
  discount_value: z.number().int().min(1).optional().nullable(),
  discount_percent: z.number().min(0.01).max(100).optional().nullable(),
  max_discount: z.number().int().min(1).optional().nullable(),
  max_discount_per_product: z.number().int().min(1).optional().nullable(),

  applicable_product_ids: z.array(z.string()).optional().nullable(),
  assigned_customer_emails: z.array(z.string().email()).optional().nullable(),

  conditions: z.array(conditionSchema).max(COUPON_CONFIG.maxConditions).optional(),

  min_cart_value: z.number().int().min(0).optional().nullable(),
  valid_from: z.string().optional().nullable(),
  valid_until: z.string().optional().nullable(),
  usage_limit: z.number().int().min(1).optional().nullable(),

  is_active: z.boolean().optional(),
  guest_allowed: z.boolean().optional(),
  show_on_storefront: z.boolean().optional(),

  description: z.string().optional().nullable(),
  display_text: z.string().optional().nullable(),

  // Metadata
  metadata: z.object({
    terms_and_conditions: z.string().optional().nullable(),
    assigned_customer_ids: z.array(z.string()).optional().nullable(),
  }).optional(),
})
