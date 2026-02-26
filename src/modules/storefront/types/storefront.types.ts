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

// ============================================
// PRODUCT DETAIL API TYPES
// ============================================

// Request body
export interface StorefrontProductDetailParams {
  slug?: string
  productSku?: string
  variantSku?: string
  sizeChartValueId?: string
}

// Size chart value in response
export interface StorefrontSizeChartValue {
  id: string
  name: string
  description: string | null
  difference: number
  isDefault: boolean
}

// Size chart in response
export interface StorefrontSizeChart {
  hasSizeChart: boolean
  sizeChartGroupId: string | null
  values: StorefrontSizeChartValue[] | null
}

// Engraving in response
export interface StorefrontEngraving {
  hasEngraving: boolean
  maxChars: number | null
}

// Variant config (lightweight — for option → SKU mapping)
export interface StorefrontVariantConfig {
  id: string
  sku: string
  isDefault: boolean
  isAvailable: boolean
  metalTypeId: string
  metalColorId: string
  metalPurityId: string
  diamondClarityColorId: string | null
  gemstoneColorId: string | null
}

// Pricing component breakdown (NO costPrice exposed)
export interface StorefrontPricingComponent {
  metalPrice: number
  makingCharge: number
  diamondPrice: number
  gemstonePrice: number
  pearlPrice: number
  finalPriceWithoutTax: number
  taxAmount: number
  finalPriceWithTax: number
  taxIncluded: boolean
  finalPrice: number
}

// Variant pricing (selling + compareAt only)
export interface StorefrontVariantPricing {
  sellingPrice: StorefrontPricingComponent
  compareAtPrice: StorefrontPricingComponent
}

// Variant weights
export interface StorefrontVariantWeights {
  metal: { grams: number }
  diamond: { carat: number; grams: number; stoneCount: number } | null
  gemstone: { carat: number; grams: number; stoneCount: number } | null
  pearl: { grams: number; count: number } | null
  total: { grams: number }
}

// Selected variant (full detail)
export interface StorefrontDetailVariant {
  id: string
  sku: string
  variantName: string | null
  isDefault: boolean
  isAvailable: boolean
  stockQuantity: number
  options: StorefrontVariantOptions
  metalWeight: number
  pricing: StorefrontVariantPricing
  weights: StorefrontVariantWeights
}

// Diamond stone entry (with resolved names)
export interface StorefrontDiamondEntry {
  shapeName: string
  shapeSlug: string
  totalCarat: number
  noOfStones: number
}

// Gemstone entry (with resolved names)
export interface StorefrontGemstoneEntry {
  typeName: string
  typeSlug: string
  shapeName: string
  shapeSlug: string
  totalCarat: number
  noOfStones: number
}

// Pearl entry (with resolved names)
export interface StorefrontPearlEntry {
  typeName: string
  typeSlug: string
  qualityName: string
  qualitySlug: string
  noOfPearls: number
  totalGrams: number
}

// Stone details in response
export interface StorefrontStoneDetails {
  diamond: {
    totalCarat: number
    totalGrams: number
    stoneCount: number
    entries: StorefrontDiamondEntry[]
  } | null
  gemstone: {
    totalCarat: number
    totalGrams: number
    stoneCount: number
    qualityName: string
    entries: StorefrontGemstoneEntry[]
  } | null
  pearl: {
    totalGrams: number
    totalCount: number
    entries: StorefrontPearlEntry[]
  } | null
}

// Category in response
export interface StorefrontDetailCategory {
  id: string
  name: string
  slug: string
  isPrimary: boolean
}

// Tag in response
export interface StorefrontDetailTag {
  id: string
  name: string
  slug: string
  groupName: string
  groupSlug: string
}

// SEO in response
export interface StorefrontDetailSeo {
  meta: {
    title: string | null
    keywords: string | null
    description: string | null
    robots: string | null
    canonical: string | null
  }
  openGraph: {
    title: string | null
    siteName: string | null
    description: string | null
    url: string | null
    imageUrl: string | null
  }
  twitter: {
    cardTitle: string | null
    siteName: string | null
    description: string | null
    url: string | null
    media: string | null
  }
}

// Master data for pricing recalculation (size chart)
export interface PricingMasterData {
  metalPurities: { id: string; metal_type_id: string; price: number }[]
  stonePricings: { id: string; price: number }[]
  makingCharges: { id: string; metal_type_id: string; from: number; to: number; is_fixed_pricing: boolean; amount: number }[]
  otherCharges: { id: string; name: string; amount: number }[]
  mrpMarkup: { diamond: number; gemstone: number; pearl: number; making_charge: number }
  pricingRules: { id: string; name: string; conditions: any[]; actions: any; product_type: string }[]
}

// Full product detail response
export interface StorefrontProductDetail {
  id: string
  name: string
  slug: string
  baseSku: string
  styleSku: string | null
  shortDescription: string | null
  description: string | null
  productType: string
  engraving: StorefrontEngraving
  sizeChart: StorefrontSizeChart
  isSizeChartSelected: boolean
  sizeChartValueId: string | null
  media: Record<string, unknown> | null
  optionConfig: Record<string, unknown> | null
  availabilityMap: Record<string, unknown> | null
  variantConfigs: StorefrontVariantConfig[]
  stoneDetails: StorefrontStoneDetails
  badges: StorefrontProductBadge[]
  categories: StorefrontDetailCategory[]
  tags: StorefrontDetailTag[]
  seo: StorefrontDetailSeo
  variant: StorefrontDetailVariant
}
