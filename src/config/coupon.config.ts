/**
 * Coupon Configuration
 * Defines all coupon types, their fields, conditions, and behaviors.
 * Adding a new coupon type = adding a new entry to COUPON_TYPES.
 */

// ========================================
// Coupon type codes
// ========================================
export const COUPON_TYPE_CODES = {
  CART_FLAT: 'cart_flat',
  CART_PERCENTAGE: 'cart_percentage',
  FIRST_PURCHASE: 'first_purchase',
  PRODUCT_FLAT: 'product_flat',
  PRODUCT_PERCENTAGE: 'product_percentage',
  CUSTOMER_SPECIFIC: 'customer_specific',
  MAKING_CHARGE_DISCOUNT: 'making_charge_discount',
  DIAMOND_DISCOUNT: 'diamond_discount',
  GEMSTONE_DISCOUNT: 'gemstone_discount',
} as const

export type CouponTypeCode = (typeof COUPON_TYPE_CODES)[keyof typeof COUPON_TYPE_CODES]

// ========================================
// Condition field types
// ========================================
export const CONDITION_FIELDS = {
  // Cart-level
  CART_SUBTOTAL: 'cart_subtotal',
  ITEM_COUNT: 'item_count',
  // Product-level
  UNIT_PRICE: 'unit_price',
  PRODUCT_CATEGORY: 'product_category',
  TAG: 'tag',
  METAL_TYPE: 'metal_type',
  METAL_PURITY: 'metal_purity',
  METAL_COLOR: 'metal_color',
  DIAMOND_CLARITY_COLOR: 'diamond_clarity_color',
  GEMSTONE_COLOR: 'gemstone_color',
} as const

// Fields evaluated against the overall cart (not per-item)
export const CART_LEVEL_CONDITION_FIELDS = new Set([
  CONDITION_FIELDS.CART_SUBTOTAL,
  CONDITION_FIELDS.ITEM_COUNT,
])

// ========================================
// Coupon type definitions
// ========================================
export interface CouponTypeDefinition {
  code: CouponTypeCode
  label: string
  description: string
  discountMode: 'flat' | 'percentage' | 'configurable'
  targetLevel: 'cart' | 'product' | 'component'
  componentTarget?: 'makingCharge' | 'diamondPrice' | 'gemstonePrice'
  availableConditions: string[]
  fixedBehaviors: {
    guestAllowed?: boolean
    requiresAuth?: boolean
    showOnStorefront?: boolean
  }
  requiresProductIds: boolean
  requiresCustomerEmails: boolean
}

export const COUPON_TYPES: Record<CouponTypeCode, CouponTypeDefinition> = {
  // Phase 1
  cart_flat: {
    code: 'cart_flat',
    label: 'Cart Flat Amount Off',
    description: 'Fixed rupee amount deducted from the entire cart subtotal',
    discountMode: 'flat',
    targetLevel: 'cart',
    availableConditions: [CONDITION_FIELDS.CART_SUBTOTAL, CONDITION_FIELDS.ITEM_COUNT],
    fixedBehaviors: {},
    requiresProductIds: false,
    requiresCustomerEmails: false,
  },

  // Phase 2
  cart_percentage: {
    code: 'cart_percentage',
    label: 'Cart Percentage Off',
    description: 'Percentage discount on the entire cart subtotal (with max cap)',
    discountMode: 'percentage',
    targetLevel: 'cart',
    availableConditions: [CONDITION_FIELDS.CART_SUBTOTAL, CONDITION_FIELDS.ITEM_COUNT],
    fixedBehaviors: {},
    requiresProductIds: false,
    requiresCustomerEmails: false,
  },

  // Phase 3
  first_purchase: {
    code: 'first_purchase',
    label: 'First Purchase Discount',
    description: 'Discount for customers with zero completed orders',
    discountMode: 'configurable',
    targetLevel: 'cart',
    availableConditions: [CONDITION_FIELDS.CART_SUBTOTAL],
    fixedBehaviors: {
      guestAllowed: false,
      requiresAuth: true,
    },
    requiresProductIds: false,
    requiresCustomerEmails: false,
  },

  // Phase 4
  product_flat: {
    code: 'product_flat',
    label: 'Product Flat Amount Off',
    description: 'Fixed rupee discount on products matching conditions',
    discountMode: 'flat',
    targetLevel: 'product',
    availableConditions: [
      CONDITION_FIELDS.CART_SUBTOTAL,
      CONDITION_FIELDS.UNIT_PRICE,
      CONDITION_FIELDS.PRODUCT_CATEGORY,
      CONDITION_FIELDS.TAG,
      CONDITION_FIELDS.METAL_TYPE,
      CONDITION_FIELDS.METAL_PURITY,
      CONDITION_FIELDS.METAL_COLOR,
      CONDITION_FIELDS.DIAMOND_CLARITY_COLOR,
      CONDITION_FIELDS.GEMSTONE_COLOR,
    ],
    fixedBehaviors: {},
    requiresProductIds: false,
    requiresCustomerEmails: false,
  },

  // Phase 5
  product_percentage: {
    code: 'product_percentage',
    label: 'Product Percentage Off',
    description: 'Percentage discount on products matching conditions (with max cap)',
    discountMode: 'percentage',
    targetLevel: 'product',
    availableConditions: [
      CONDITION_FIELDS.CART_SUBTOTAL,
      CONDITION_FIELDS.UNIT_PRICE,
      CONDITION_FIELDS.PRODUCT_CATEGORY,
      CONDITION_FIELDS.TAG,
      CONDITION_FIELDS.METAL_TYPE,
      CONDITION_FIELDS.METAL_PURITY,
      CONDITION_FIELDS.METAL_COLOR,
      CONDITION_FIELDS.DIAMOND_CLARITY_COLOR,
      CONDITION_FIELDS.GEMSTONE_COLOR,
    ],
    fixedBehaviors: {},
    requiresProductIds: false,
    requiresCustomerEmails: false,
  },

  // Phase 6
  customer_specific: {
    code: 'customer_specific',
    label: 'Customer-Specific Coupon',
    description: 'Discount assigned to specific customers by email or ID',
    discountMode: 'configurable',
    targetLevel: 'cart',
    availableConditions: [
      CONDITION_FIELDS.CART_SUBTOTAL,
      CONDITION_FIELDS.UNIT_PRICE,
      CONDITION_FIELDS.PRODUCT_CATEGORY,
      CONDITION_FIELDS.TAG,
      CONDITION_FIELDS.METAL_TYPE,
      CONDITION_FIELDS.METAL_PURITY,
      CONDITION_FIELDS.METAL_COLOR,
      CONDITION_FIELDS.DIAMOND_CLARITY_COLOR,
      CONDITION_FIELDS.GEMSTONE_COLOR,
    ],
    fixedBehaviors: {
      guestAllowed: false,
      requiresAuth: true,
      showOnStorefront: false,
    },
    requiresProductIds: false,
    requiresCustomerEmails: true,
  },

  // Phase 7
  making_charge_discount: {
    code: 'making_charge_discount',
    label: 'Making Charge Discount',
    description: 'Percentage off on the making charge component',
    discountMode: 'percentage',
    targetLevel: 'component',
    componentTarget: 'makingCharge',
    availableConditions: [
      CONDITION_FIELDS.CART_SUBTOTAL,
      CONDITION_FIELDS.METAL_TYPE,
      CONDITION_FIELDS.METAL_PURITY,
      CONDITION_FIELDS.METAL_COLOR,
      CONDITION_FIELDS.PRODUCT_CATEGORY,
    ],
    fixedBehaviors: {},
    requiresProductIds: false,
    requiresCustomerEmails: false,
  },

  // Phase 8
  diamond_discount: {
    code: 'diamond_discount',
    label: 'Diamond Discount',
    description: 'Percentage off on the diamond price component',
    discountMode: 'percentage',
    targetLevel: 'component',
    componentTarget: 'diamondPrice',
    availableConditions: [
      CONDITION_FIELDS.CART_SUBTOTAL,
      CONDITION_FIELDS.DIAMOND_CLARITY_COLOR,
      CONDITION_FIELDS.METAL_TYPE,
      CONDITION_FIELDS.METAL_PURITY,
      CONDITION_FIELDS.METAL_COLOR,
      CONDITION_FIELDS.PRODUCT_CATEGORY,
    ],
    fixedBehaviors: {},
    requiresProductIds: false,
    requiresCustomerEmails: false,
  },

  // Phase 9
  gemstone_discount: {
    code: 'gemstone_discount',
    label: 'Gemstone Discount',
    description: 'Percentage off on the gemstone price component',
    discountMode: 'percentage',
    targetLevel: 'component',
    componentTarget: 'gemstonePrice',
    availableConditions: [
      CONDITION_FIELDS.CART_SUBTOTAL,
      CONDITION_FIELDS.GEMSTONE_COLOR,
      CONDITION_FIELDS.METAL_TYPE,
      CONDITION_FIELDS.METAL_PURITY,
      CONDITION_FIELDS.METAL_COLOR,
      CONDITION_FIELDS.PRODUCT_CATEGORY,
    ],
    fixedBehaviors: {},
    requiresProductIds: false,
    requiresCustomerEmails: false,
  },
}

// ========================================
// Helper: get type definition
// ========================================
export function getCouponTypeDefinition(type: string): CouponTypeDefinition | null {
  return COUPON_TYPES[type as CouponTypeCode] || null
}

// ========================================
// Enabled types — uncomment as each phase is implemented
// ========================================
export const ENABLED_COUPON_TYPES: CouponTypeCode[] = [
  'cart_flat',
  'cart_percentage',
  'product_flat',
  'product_percentage',
  'customer_specific',
  'making_charge_discount',
  // 'first_purchase',
  // 'diamond_discount',
  // 'gemstone_discount',
]

// ========================================
// Coupon module config
// ========================================
export const COUPON_CONFIG = {
  maxCodeLength: 50,
  maxConditions: 10,
  maxProductIds: 100,
  maxCustomerEmails: 500,
} as const
