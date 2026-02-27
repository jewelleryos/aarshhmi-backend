import type { AuthCustomer } from '../../customer-auth/middleware/customer-auth.middleware'

// ========================================
// Reuse storefront pricing types
// ========================================
import type {
  StorefrontPricingComponent,
  StorefrontVariantPricing,
} from '../../storefront/types/storefront.types'

// ========================================
// Cart item pricing (per unit — selling + compareAt)
// ========================================

export interface CartItemPricing {
  sellingPrice: StorefrontPricingComponent
  compareAtPrice: StorefrontPricingComponent
}

// ========================================
// Cart item variant options (for display)
// ========================================

export interface CartItemOptions {
  metalType: string | null
  metalColor: string | null
  metalPurity: string | null
  diamondClarityColor: string | null
  gemstoneColor: string | null
}

// ========================================
// Option config — lookup table to resolve option IDs to display names
// ========================================

export interface OptionConfigItem {
  id: string
  name: string
  slug: string
  imageUrl: string | null
  imageAltText: string | null
}

export interface OptionConfigPurityItem extends OptionConfigItem {
  metalTypeId: string
}

export interface CartItemOptionConfig {
  metalTypes: OptionConfigItem[]
  metalColors: OptionConfigItem[]
  metalPurities: OptionConfigPurityItem[]
  diamondClarityColors: OptionConfigItem[] | null
  gemstoneColors: OptionConfigItem[] | null
}

// ========================================
// Cart item badge
// ========================================

export interface CartItemBadge {
  id: string
  name: string
  slug: string
  bgColor: string
  fontColor: string
  position: number
}

// ========================================
// Single cart item in response
// ========================================

export interface CartItemResponse {
  id: string
  productId: string
  variantId: string
  productName: string
  productSlug: string
  variantName: string | null
  sku: string
  quantity: number

  // Size selection
  sizeChartValueId: string | null
  sizeChartValueName: string | null

  // Variant display options (raw IDs)
  options: CartItemOptions

  // Option config — lookup table to resolve option IDs to names/images
  optionConfig: CartItemOptionConfig | null

  // Per-unit pricing breakdown (selling + compareAt)
  pricing: CartItemPricing

  // Line totals
  lineTotal: number
  addedPrice: number
  priceChanged: boolean

  // Coupon discount for this item (0 until coupon module)
  couponDiscount: number

  // Media
  media: Record<string, unknown> | null

  // Badges
  badges: CartItemBadge[]

  // Size chart info (so frontend knows if size selector should show)
  sizeChart: {
    hasSizeChart: boolean
    sizeChartGroupId: string | null
    values: Array<{
      id: string
      name: string
      description: string | null
      difference: number
      isDefault: boolean
    }> | null
  }

  // Availability
  isAvailable: boolean
  unavailableReason: string | null
}

// ========================================
// Cart summary
// ========================================

export interface CartSummary {
  subtotalPrice: number
  discountAmount: number
  totalPrice: number
  totalTaxAmount: number
  itemCount: number
  availableItemCount: number
  hasUnavailableItems: boolean
}

// ========================================
// Coupon summary (null until coupon module)
// ========================================

export interface CouponSummary {
  code: string
  type: string
  discountAmount: number
  displayText: string
}

// ========================================
// Full cart response
// ========================================

export interface CartResponse {
  cartId: string | null
  items: CartItemResponse[]
  summary: CartSummary
  couponSummary: CouponSummary | null
  couponRemovalReason: string | null
}

// ========================================
// Cart count response
// ========================================

export interface CartCountResponse {
  cartId: string | null
  count: number
}

// ========================================
// Internal types
// ========================================

export type ResolvedCustomer = AuthCustomer | undefined
