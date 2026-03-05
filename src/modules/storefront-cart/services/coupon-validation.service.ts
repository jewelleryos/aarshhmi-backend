import type { CouponRow, CouponCondition } from '../../coupons/types/coupons.types'
import type { CartItemResponse, ResolvedCustomer } from '../types/storefront-cart.types'
import { getCouponTypeDefinition } from '../../../config/coupon.config'
import {
  getProductLevelConditions,
  itemMatchesProductConditions,
  type ProductConditionData,
} from './coupon-calculation.service'

// ========================================
// Validation result
// ========================================
export interface CouponValidationResult {
  valid: boolean
  error?: string
}

// ========================================
// Validate coupon against cart state
// ========================================
export function validateCoupon(
  coupon: CouponRow,
  subtotal: number,
  itemCount: number,
  customer: ResolvedCustomer,
  cartItems?: CartItemResponse[],
  productConditionData?: Map<string, ProductConditionData>
): CouponValidationResult {
  // Step 1: Active
  if (!coupon.is_active) {
    return { valid: false, error: 'This coupon is no longer active' }
  }

  // Step 2: Date range
  const now = new Date()

  if (coupon.valid_from && now < new Date(coupon.valid_from)) {
    return { valid: false, error: 'This coupon is not yet active' }
  }

  if (coupon.valid_until && now > new Date(coupon.valid_until)) {
    return { valid: false, error: 'This coupon has expired' }
  }

  // Step 3: Total usage limit
  if (coupon.usage_limit !== null && coupon.usage_count >= coupon.usage_limit) {
    return { valid: false, error: 'This coupon has been fully redeemed' }
  }

  // Step 4: Guest check
  if (!coupon.guest_allowed && !customer) {
    return { valid: false, error: 'Please login to use this coupon' }
  }

  // Step 4.5: Customer-specific email/ID check
  const assignedEmails = coupon.assigned_customer_emails
  const assignedIds = coupon.metadata?.assigned_customer_ids
  if ((assignedEmails && assignedEmails.length > 0) || (assignedIds && assignedIds.length > 0)) {
    if (!customer) {
      return { valid: false, error: 'Please login to use this coupon' }
    }

    const emailMatch = assignedEmails && assignedEmails.length > 0
      ? assignedEmails.some((e) => e.toLowerCase() === customer.email?.toLowerCase())
      : false

    const idMatch = assignedIds && assignedIds.length > 0
      ? assignedIds.includes(customer.id)
      : false

    if (!emailMatch && !idMatch) {
      return { valid: false, error: 'This coupon is not available for your account' }
    }
  }

  // Step 5: Min cart value
  if (coupon.min_cart_value !== null && subtotal < coupon.min_cart_value) {
    const remaining = coupon.min_cart_value - subtotal
    const remainingRs = (remaining / 100).toLocaleString('en-IN')
    return {
      valid: false,
      error: `Add Rs.${remainingRs} more to use this coupon`,
    }
  }

  // Step 6: Cart-level conditions (cart_subtotal, item_count)
  // Product-level conditions (category, tag, metal, etc.) are skipped here —
  // they're evaluated per-item in Step 7
  if (coupon.conditions && coupon.conditions.length > 0) {
    for (const condition of coupon.conditions) {
      const result = evaluateCondition(condition, subtotal, itemCount)
      if (!result.valid) {
        return result
      }
    }
  }

  // Step 7: Product/component match check
  const productConditions = getProductLevelConditions(coupon.conditions)
  const hasProductTargeting =
    productConditions.length > 0 ||
    (coupon.applicable_product_ids && coupon.applicable_product_ids.length > 0)

  // For component-level types, also check component value > 0
  const typeDef = getCouponTypeDefinition(coupon.type)
  const componentKey = typeDef?.componentTarget as 'makingCharge' | 'diamondPrice' | 'gemstonePrice' | undefined

  if ((hasProductTargeting || componentKey) && cartItems) {
    const availableItems = cartItems.filter((item) => item.isAvailable && item.lineTotal > 0)
    const hasMatch = availableItems.some((item) => {
      const condData = productConditionData?.get(item.productId)
      const matchesConditions = hasProductTargeting
        ? itemMatchesProductConditions(item, productConditions, coupon.applicable_product_ids, condData)
        : true
      const hasComponent = componentKey
        ? (item.pricing?.sellingPrice?.[componentKey] || 0) > 0
        : true
      return matchesConditions && hasComponent
    })

    if (!hasMatch) {
      return { valid: false, error: 'No products in your cart qualify for this discount' }
    }
  }

  return { valid: true }
}

// ========================================
// Evaluate a single cart-level condition
// ========================================
function evaluateCondition(
  condition: CouponCondition,
  subtotal: number,
  itemCount: number
): CouponValidationResult {
  const { field, operator, value } = condition

  if (field === 'cart_subtotal') {
    const numValue = Number(value)
    if (operator === '>=' && subtotal < numValue) {
      const rsValue = (numValue / 100).toLocaleString('en-IN')
      return { valid: false, error: `Cart subtotal must be at least Rs.${rsValue}` }
    }
    if (operator === '<=' && subtotal > numValue) {
      const rsValue = (numValue / 100).toLocaleString('en-IN')
      return { valid: false, error: `Cart subtotal must not exceed Rs.${rsValue}` }
    }
  }

  if (field === 'item_count') {
    const numValue = Number(value)
    if (operator === '>=' && itemCount < numValue) {
      return { valid: false, error: `Cart must have at least ${numValue} item${numValue > 1 ? 's' : ''}` }
    }
    if (operator === '<=' && itemCount > numValue) {
      return { valid: false, error: `Cart must have at most ${numValue} item${numValue > 1 ? 's' : ''}` }
    }
  }

  // Product-level fields (tag, product_category, metal_type, etc.)
  // are not evaluated here — they're handled in Step 7 per-item
  return { valid: true }
}
