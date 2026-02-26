import type { AuthCustomer } from '../../customer-auth/middleware/customer-auth.middleware'

// ========================================
// Wishlist item (returned to storefront)
// ========================================

export interface WishlistVariantOptions {
  metalType: string | null
  metalColor: string | null
  metalPurity: string | null
  diamondClarityColor: string | null
  gemstoneColor: string | null
}

export interface WishlistSizeChartValue {
  id: string
  name: string
  description: string | null
  difference: number
  isDefault: boolean
}

export interface WishlistSizeChart {
  hasSizeChart: boolean
  sizeChartGroupId: string | null
  values: WishlistSizeChartValue[] | null
}

export interface WishlistBadge {
  id: string
  name: string
  slug: string
  bg_color: string
  font_color: string
  position: number
}

export interface WishlistItem {
  id: string
  productId: string
  variantId: string
  productType: string
  productName: string
  productSlug: string
  variantName: string | null
  sku: string
  currentPrice: number
  compareAtPrice: number | null
  addedPrice: number
  priceDrop: boolean
  options: WishlistVariantOptions
  media: Record<string, unknown> | null
  sizeChart: WishlistSizeChart
  badges: WishlistBadge[]
  isAvailable: boolean
  createdAt: string
}

// ========================================
// API response
// ========================================

export interface WishlistResponse {
  wishlistId: string | null
  wishlistItems: WishlistItem[]
}

export interface WishlistCheckResponse {
  wishlistedVariantIds: string[]
}

// ========================================
// Request types
// ========================================

export interface ToggleWishlistRequest {
  product_id: string
  variant_id: string
  wishlist_id?: string
}

export interface CheckWishlistRequest {
  variant_ids: string[]
  wishlist_id?: string
}

export interface MergeWishlistRequest {
  wishlist_id: string
}

// ========================================
// Internal types
// ========================================

export type ResolvedCustomer = AuthCustomer | undefined
