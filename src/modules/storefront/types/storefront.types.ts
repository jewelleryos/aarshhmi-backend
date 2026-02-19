// Request body
export interface StorefrontFiltersParams {
  categories?: string[]
  tags?: string[]
  price_ranges?: string[]
}

// Category value in response
export interface StorefrontCategoryValue {
  id: string
  name: string
  slug: string
  display_name: string | null
  media_url: string | null
  media_alt_text: string | null
  count: number
  children: StorefrontCategoryValue[]
}

// Tag value in response
export interface StorefrontTagValue {
  id: string
  name: string
  slug: string
  display_name: string | null
  media_url: string | null
  media_alt_text: string | null
  count: number
}

// Price range value in response
export interface StorefrontPriceValue {
  id: string
  display_name: string
  min_price: number
  max_price: number
  media_url: string | null
  media_alt_text: string | null
  count: number
}

// Filter group in response
export interface StorefrontFilterGroup {
  type: 'category' | 'tag_group' | 'price_filter'
  id?: string
  label: string
  slug?: string
  media_url?: string | null
  media_alt_text?: string | null
  values: StorefrontCategoryValue[] | StorefrontTagValue[] | StorefrontPriceValue[]
}

// Sort-by option in response
export interface StorefrontSortByOption {
  key: string
  label: string
}

// Full response
export interface StorefrontFiltersResponse {
  filters: StorefrontFilterGroup[]
  sort_by: StorefrontSortByOption[]
}

// ============================================
// PRODUCTS API TYPES
// ============================================

// Product listing request body
export interface StorefrontProductsParams {
  categories?: string[]
  tags?: string[]
  price_ranges?: string[]
  sort_by?: string
  page?: number
  limit?: number
}

// Variant options (master data IDs from variant metadata)
export interface StorefrontVariantOptions {
  metalType: string | null
  metalColor: string | null
  metalPurity: string | null
  diamondClarityColor: string | null
  gemstoneColor: string | null
}

// Variant in product card
export interface StorefrontProductVariant {
  id: string
  sku: string
  price: number
  compare_at_price: number | null
  is_available: boolean
  options: StorefrontVariantOptions
}

// Badge in product card
export interface StorefrontProductBadge {
  id: string
  name: string
  slug: string
  bg_color: string
  font_color: string
  position: number
}

// Product card in response
export interface StorefrontProductCard {
  id: string
  name: string
  slug: string
  base_sku: string
  default_variant_id: string | null
  option_config: Record<string, unknown> | null
  availability_map: Record<string, unknown> | null
  variants: StorefrontProductVariant[]
  media: Record<string, unknown> | null
  badges: StorefrontProductBadge[]
  created_at: string
}

// Pagination in response
export interface StorefrontPagination {
  page: number
  limit: number
  total: number
  total_pages: number
}

// Products full response
export interface StorefrontProductsResponse {
  products: StorefrontProductCard[]
  pagination: StorefrontPagination
}
