import type { CouponRow, CouponCondition } from '../../coupons/types/coupons.types'
import type { CartItemResponse } from '../types/storefront-cart.types'
import { CART_LEVEL_CONDITION_FIELDS } from '../../../config/coupon.config'

// ========================================
// Discount result
// ========================================
export interface CouponDiscountResult {
  totalDiscount: number
  perItemDiscounts: Map<string, number> // cartItemId → discount in paise
}

// ========================================
// Product condition data (category/tag IDs per product)
// ========================================
export interface ProductConditionData {
  categoryIds: string[]
  tagIds: string[]
}

// ========================================
// Calculate discount based on coupon type
// ========================================
export function calculateDiscount(
  coupon: CouponRow,
  items: CartItemResponse[],
  subtotal: number,
  productConditionData?: Map<string, ProductConditionData>
): CouponDiscountResult {
  switch (coupon.type) {
    case 'cart_flat':
      return calculateCartFlat(coupon, items, subtotal)

    case 'cart_percentage':
      return calculateCartPercentage(coupon, items, subtotal)

    case 'product_flat':
      return calculateProductFlat(coupon, items, subtotal, productConditionData)

    case 'product_percentage':
      return calculateProductPercentage(coupon, items, subtotal, productConditionData)

    case 'customer_specific':
      return calculateCustomerSpecific(coupon, items, subtotal, productConditionData)

    case 'making_charge_discount':
      return calculateComponentDiscount(coupon, items, subtotal, 'makingCharge', productConditionData)

    // Future types — add cases here as they're enabled
    // case 'first_purchase':
    // case 'diamond_discount':
    //   return calculateComponentDiscount(coupon, items, subtotal, 'diamondPrice', productConditionData)
    // case 'gemstone_discount':
    //   return calculateComponentDiscount(coupon, items, subtotal, 'gemstonePrice', productConditionData)

    default:
      return { totalDiscount: 0, perItemDiscounts: new Map() }
  }
}

// ========================================
// cart_flat: Fixed amount off cart subtotal
// ========================================
function calculateCartFlat(
  coupon: CouponRow,
  items: CartItemResponse[],
  subtotal: number
): CouponDiscountResult {
  const discountValue = coupon.discount_value || 0

  // Discount can never exceed the subtotal
  const totalDiscount = Math.min(discountValue, subtotal)

  if (totalDiscount <= 0 || subtotal <= 0) {
    return { totalDiscount: 0, perItemDiscounts: new Map() }
  }

  // Distribute proportionally across available items
  const perItemDiscounts = distributeProportionally(items, totalDiscount, subtotal)

  return { totalDiscount, perItemDiscounts }
}

// ========================================
// cart_percentage: Percentage off cart subtotal (with max cap)
// ========================================
function calculateCartPercentage(
  coupon: CouponRow,
  items: CartItemResponse[],
  subtotal: number
): CouponDiscountResult {
  const discountPercent = coupon.discount_percent || 0
  const maxDiscount = coupon.max_discount || Infinity

  // rawDiscount = subtotal * (percent / 100)
  const rawDiscount = Math.round(subtotal * (discountPercent / 100))

  // Cap by max_discount, then by subtotal (never exceed subtotal)
  const totalDiscount = Math.min(rawDiscount, maxDiscount, subtotal)

  if (totalDiscount <= 0 || subtotal <= 0) {
    return { totalDiscount: 0, perItemDiscounts: new Map() }
  }

  const perItemDiscounts = distributeProportionally(items, totalDiscount, subtotal)

  return { totalDiscount, perItemDiscounts }
}

// ========================================
// product_flat: Fixed amount off per unit of matching products
// ========================================
function calculateProductFlat(
  coupon: CouponRow,
  items: CartItemResponse[],
  subtotal: number,
  productConditionData?: Map<string, ProductConditionData>
): CouponDiscountResult {
  const discountValue = coupon.discount_value || 0
  const perItemDiscounts = new Map<string, number>()
  const productConditions = getProductLevelConditions(coupon.conditions)

  if (discountValue <= 0 || subtotal <= 0) {
    return { totalDiscount: 0, perItemDiscounts }
  }

  let totalDiscount = 0

  for (const item of items) {
    if (!item.isAvailable || item.lineTotal <= 0) continue

    const condData = productConditionData?.get(item.productId)
    const matches = itemMatchesProductConditions(item, productConditions, coupon.applicable_product_ids, condData)

    if (matches) {
      const unitPrice = item.quantity > 0 ? Math.round(item.lineTotal / item.quantity) : 0
      // Cap discount at unit price — can't go below zero
      const perUnitDiscount = Math.min(discountValue, unitPrice)
      const itemDiscount = perUnitDiscount * item.quantity
      perItemDiscounts.set(item.id, itemDiscount)
      totalDiscount += itemDiscount
    }
  }

  // Safety: total discount can never exceed subtotal
  if (totalDiscount > subtotal) {
    const ratio = subtotal / totalDiscount
    totalDiscount = 0
    for (const [itemId, discount] of perItemDiscounts) {
      const adjusted = Math.round(discount * ratio)
      perItemDiscounts.set(itemId, adjusted)
      totalDiscount += adjusted
    }
  }

  return { totalDiscount, perItemDiscounts }
}

// ========================================
// product_percentage: Percentage off per unit of matching products (with per-product + overall cap)
// ========================================
function calculateProductPercentage(
  coupon: CouponRow,
  items: CartItemResponse[],
  subtotal: number,
  productConditionData?: Map<string, ProductConditionData>
): CouponDiscountResult {
  const discountPercent = coupon.discount_percent || 0
  const maxDiscount = coupon.max_discount || Infinity
  const maxPerProduct = coupon.max_discount_per_product || Infinity
  const perItemDiscounts = new Map<string, number>()
  const productConditions = getProductLevelConditions(coupon.conditions)

  if (discountPercent <= 0 || subtotal <= 0) {
    return { totalDiscount: 0, perItemDiscounts }
  }

  let totalDiscount = 0

  // Step 1: Calculate per-item discounts for matching items
  for (const item of items) {
    if (!item.isAvailable || item.lineTotal <= 0) continue

    const condData = productConditionData?.get(item.productId)
    const matches = itemMatchesProductConditions(item, productConditions, coupon.applicable_product_ids, condData)

    if (matches) {
      const unitPrice = item.quantity > 0 ? Math.round(item.lineTotal / item.quantity) : 0
      const rawPerUnit = Math.round(unitPrice * discountPercent / 100)

      // Cap per product, then cap at unit price (never go negative)
      const perUnitDiscount = Math.min(rawPerUnit, maxPerProduct, unitPrice)
      const itemDiscount = perUnitDiscount * item.quantity

      perItemDiscounts.set(item.id, itemDiscount)
      totalDiscount += itemDiscount
    }
  }

  // Step 2: Cap by overall max_discount
  if (totalDiscount > maxDiscount) {
    const ratio = maxDiscount / totalDiscount
    totalDiscount = 0
    const entries = [...perItemDiscounts.entries()]
    for (let i = 0; i < entries.length; i++) {
      const [itemId, discount] = entries[i]
      if (i === entries.length - 1) {
        // Last item gets remainder to fix rounding
        const adjusted = maxDiscount - totalDiscount
        perItemDiscounts.set(itemId, adjusted)
        totalDiscount += adjusted
      } else {
        const adjusted = Math.round(discount * ratio)
        perItemDiscounts.set(itemId, adjusted)
        totalDiscount += adjusted
      }
    }
  }

  // Step 3: Safety — total discount can never exceed subtotal
  if (totalDiscount > subtotal) {
    const ratio = subtotal / totalDiscount
    totalDiscount = 0
    for (const [itemId, discount] of perItemDiscounts) {
      const adjusted = Math.round(discount * ratio)
      perItemDiscounts.set(itemId, adjusted)
      totalDiscount += adjusted
    }
  }

  return { totalDiscount, perItemDiscounts }
}

// ========================================
// customer_specific: Hybrid — delegates to cart or product calculation based on conditions
// ========================================
function calculateCustomerSpecific(
  coupon: CouponRow,
  items: CartItemResponse[],
  subtotal: number,
  productConditionData?: Map<string, ProductConditionData>
): CouponDiscountResult {
  const productConditions = getProductLevelConditions(coupon.conditions)
  const hasProductTargeting =
    productConditions.length > 0 ||
    (coupon.applicable_product_ids && coupon.applicable_product_ids.length > 0)

  // No product conditions → cart-wide discount
  if (!hasProductTargeting) {
    if (coupon.discount_type === 'percentage') {
      return calculateCartPercentage(coupon, items, subtotal)
    }
    return calculateCartFlat(coupon, items, subtotal)
  }

  // Has product conditions → product-targeted discount
  if (coupon.discount_type === 'percentage') {
    return calculateProductPercentage(coupon, items, subtotal, productConditionData)
  }
  return calculateProductFlat(coupon, items, subtotal, productConditionData)
}

// ========================================
// Component discount: % off a specific price component (making charge, diamond, gemstone)
// Generic function — reusable for all component-level coupon types
// ========================================
function calculateComponentDiscount(
  coupon: CouponRow,
  items: CartItemResponse[],
  subtotal: number,
  componentKey: 'makingCharge' | 'diamondPrice' | 'gemstonePrice',
  productConditionData?: Map<string, ProductConditionData>
): CouponDiscountResult {
  const discountPercent = coupon.discount_percent || 0
  const maxDiscount = coupon.max_discount || Infinity
  const perItemDiscounts = new Map<string, number>()
  const productConditions = getProductLevelConditions(coupon.conditions)

  if (discountPercent <= 0 || subtotal <= 0) {
    return { totalDiscount: 0, perItemDiscounts }
  }

  let totalDiscount = 0

  for (const item of items) {
    if (!item.isAvailable || item.lineTotal <= 0) continue

    // Get component value per unit
    const sp = item.pricing?.sellingPrice
    const componentValue = sp ? sp[componentKey] : 0
    if (componentValue <= 0) continue

    // Check product conditions
    const condData = productConditionData?.get(item.productId)
    const matches = itemMatchesProductConditions(item, productConditions, coupon.applicable_product_ids, condData)

    if (matches) {
      const rawPerUnit = Math.round(componentValue * discountPercent / 100)
      const perUnitDiscount = Math.min(rawPerUnit, componentValue)
      const itemDiscount = perUnitDiscount * item.quantity

      perItemDiscounts.set(item.id, itemDiscount)
      totalDiscount += itemDiscount
    }
  }

  // Cap by max_discount
  if (totalDiscount > maxDiscount) {
    const ratio = maxDiscount / totalDiscount
    totalDiscount = 0
    const entries = [...perItemDiscounts.entries()]
    for (let i = 0; i < entries.length; i++) {
      const [itemId, discount] = entries[i]
      if (i === entries.length - 1) {
        const adjusted = maxDiscount - totalDiscount
        perItemDiscounts.set(itemId, adjusted)
        totalDiscount += adjusted
      } else {
        const adjusted = Math.round(discount * ratio)
        perItemDiscounts.set(itemId, adjusted)
        totalDiscount += adjusted
      }
    }
  }

  // Safety: cap at subtotal
  if (totalDiscount > subtotal) {
    const ratio = subtotal / totalDiscount
    totalDiscount = 0
    for (const [itemId, discount] of perItemDiscounts) {
      const adjusted = Math.round(discount * ratio)
      perItemDiscounts.set(itemId, adjusted)
      totalDiscount += adjusted
    }
  }

  return { totalDiscount, perItemDiscounts }
}

// ========================================
// Product-level condition matching (exported for validation service)
// ========================================
export function getProductLevelConditions(conditions: CouponCondition[] | null): CouponCondition[] {
  if (!conditions || conditions.length === 0) return []
  return conditions.filter((c) => !(CART_LEVEL_CONDITION_FIELDS as Set<string>).has(c.field))
}

export function itemMatchesProductConditions(
  item: CartItemResponse,
  productConditions: CouponCondition[],
  applicableProductIds: string[] | null,
  conditionData?: ProductConditionData
): boolean {
  // Check applicable_product_ids if set
  if (applicableProductIds && applicableProductIds.length > 0) {
    if (!applicableProductIds.includes(item.productId)) return false
  }

  // Check each product-level condition (AND logic — all must pass)
  for (const condition of productConditions) {
    if (!evaluateProductCondition(item, condition, conditionData)) {
      return false
    }
  }

  return true
}

// ========================================
// Evaluate a single product-level condition against a cart item
// All values use IDs (not slugs) for matching
// ========================================
function evaluateProductCondition(
  item: CartItemResponse,
  condition: CouponCondition,
  conditionData?: ProductConditionData
): boolean {
  const { field, operator, value } = condition

  // Tag and category use array-based matching (product can have multiple)
  if (field === 'tag') {
    const tagIds = conditionData?.tagIds || []
    return matchArrayField(tagIds, operator, value)
  }

  if (field === 'product_category') {
    const categoryIds = conditionData?.categoryIds || []
    return matchArrayField(categoryIds, operator, value)
  }

  // Unit price — numeric comparison
  if (field === 'unit_price') {
    const unitPrice = item.quantity > 0 ? Math.round(item.lineTotal / item.quantity) : 0
    return matchNumericField(unitPrice, operator, value)
  }

  // Variant option fields — single value comparison using IDs
  const optionValue = getOptionValue(item, field)
  if (optionValue === null) return false // item doesn't have this option

  if (operator === '=') {
    return optionValue === value
  }
  if (operator === 'in') {
    const values = Array.isArray(value) ? value : [value]
    return values.includes(optionValue)
  }

  return true // unknown operator, pass
}

// Match a field where the item has multiple values (tags, categories)
// '=' means "item has this ID", 'in' means "item has ANY of these IDs"
function matchArrayField(itemIds: string[], operator: string, value: any): boolean {
  if (operator === '=') {
    return itemIds.includes(value)
  }
  if (operator === 'in') {
    const values = Array.isArray(value) ? value : [value]
    return itemIds.some((id) => values.includes(id))
  }
  return true
}

function matchNumericField(actual: number, operator: string, value: any): boolean {
  const numValue = Number(value)
  if (operator === '>=') return actual >= numValue
  if (operator === '<=') return actual <= numValue
  if (operator === '=') return actual === numValue
  return true
}

function getOptionValue(item: CartItemResponse, field: string): string | null {
  switch (field) {
    case 'metal_type':
      return item.options.metalType
    case 'metal_purity':
      return item.options.metalPurity
    case 'metal_color':
      return item.options.metalColor
    case 'diamond_clarity_color':
      return item.options.diamondClarityColor
    case 'gemstone_color':
      return item.options.gemstoneColor
    default:
      return null
  }
}

// ========================================
// Proportional distribution for cart-level discounts
// ========================================
function distributeProportionally(
  items: CartItemResponse[],
  totalDiscount: number,
  subtotal: number
): Map<string, number> {
  const perItemDiscounts = new Map<string, number>()
  const availableItems = items.filter((item) => item.isAvailable && item.lineTotal > 0)

  if (availableItems.length === 0) return perItemDiscounts

  let distributed = 0

  for (let i = 0; i < availableItems.length; i++) {
    const item = availableItems[i]

    if (i === availableItems.length - 1) {
      // Last item gets the remainder to fix rounding
      const itemDiscount = totalDiscount - distributed
      perItemDiscounts.set(item.id, itemDiscount)
    } else {
      const share = item.lineTotal / subtotal
      const itemDiscount = Math.round(totalDiscount * share)
      perItemDiscounts.set(item.id, itemDiscount)
      distributed += itemDiscount
    }
  }

  return perItemDiscounts
}
