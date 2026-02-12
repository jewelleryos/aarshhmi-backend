// Jewellery Default - Product type specific types

/**
 * Dimensions for the product
 */
export interface Dimensions {
  width: number
  height: number
  length: number
}

/**
 * Engraving configuration
 */
export interface EngravingConfig {
  hasEngraving: boolean
  maxChars: number | null
}

/**
 * Size chart configuration
 */
export interface SizeChartConfig {
  hasSizeChart: boolean
  sizeChartGroupId: string | null
}

/**
 * Basic details for jewellery-default product
 */
export interface BasicDetails {
  title: string
  slug: string
  productSku: string
  styleSku: string | null
  shortDescription: string | null
  description: string | null
  dimensions: Dimensions
  engraving: EngravingConfig
  sizeChart: SizeChartConfig
}

/**
 * Metal color in selected metal
 */
export interface MetalColor {
  colorId: string
}

/**
 * Metal purity with weight in selected metal
 */
export interface MetalPurity {
  purityId: string
  weight: number
}

/**
 * Selected metal configuration
 */
export interface SelectedMetal {
  metalTypeId: string
  colors: MetalColor[]
  purities: MetalPurity[]
}

/**
 * Metal details for jewellery-default product
 */
export interface MetalDetails {
  selectedMetals: SelectedMetal[]
}

/**
 * Diamond clarity/color selection
 */
export interface DiamondClarityColor {
  id: string
}

/**
 * Diamond pricing for a clarity/color
 */
export interface DiamondPricing {
  clarityColorId: string
  pricingId: string
}

/**
 * Diamond entry
 */
export interface DiamondEntry {
  shapeId: string
  totalCarat: number
  noOfStones: number
  pricings: DiamondPricing[]
}

/**
 * Diamond details
 */
export interface DiamondDetails {
  clarityColors: DiamondClarityColor[]
  entries: DiamondEntry[]
}

/**
 * Gemstone color selection
 */
export interface GemstoneColor {
  id: string
}

/**
 * Gemstone pricing for a color
 */
export interface GemstonePricing {
  colorId: string
  pricingId: string
}

/**
 * Gemstone entry
 */
export interface GemstoneEntry {
  typeId: string
  shapeId: string
  totalCarat: number
  noOfStones: number
  pricings: GemstonePricing[]
}

/**
 * Gemstone details
 */
export interface GemstoneDetails {
  qualityId: string
  colors: GemstoneColor[]
  entries: GemstoneEntry[]
}

/**
 * Pearl entry
 */
export interface PearlEntry {
  typeId: string
  qualityId: string
  noOfPearls: number
  totalGrams: number
  amount: number
}

/**
 * Pearl details
 */
export interface PearlDetails {
  entries: PearlEntry[]
}

/**
 * Stone details for jewellery-default product
 */
export interface StoneDetails {
  hasDiamond: boolean
  diamond: DiamondDetails | null
  hasGemstone: boolean
  gemstone: GemstoneDetails | null
  hasPearl: boolean
  pearl: PearlDetails | null
}

/**
 * SEO meta tags
 */
export interface SeoMeta {
  title: string | null
  keywords: string | null
  description: string | null
  robots: string | null
  canonical: string | null
}

/**
 * SEO Open Graph tags
 */
export interface SeoOpenGraph {
  title: string | null
  siteName: string | null
  description: string | null
  url: string | null
  imageUrl: string | null
}

/**
 * SEO Twitter card tags
 */
export interface SeoTwitter {
  cardTitle: string | null
  siteName: string | null
  description: string | null
  url: string | null
  media: string | null
}

/**
 * SEO details for product
 */
export interface SeoDetails {
  meta: SeoMeta
  openGraph: SeoOpenGraph
  twitter: SeoTwitter
}

/**
 * Badge reference
 */
export interface BadgeRef {
  id: string
}

/**
 * Category reference
 */
export interface CategoryRef {
  id: string
}

/**
 * Tag reference
 */
export interface TagRef {
  id: string
}

/**
 * Attributes details for product
 */
export interface AttributesDetails {
  badges: BadgeRef[]
  categories: CategoryRef[]
  tags: TagRef[]
}

/**
 * Media item
 */
export interface MediaItem {
  id: string
  path: string
  type: string
  altText: string | null
  position: number
}

/**
 * Gemstone sub-media for a specific gemstone color
 */
export interface GemstoneSubMedia {
  gemstoneColorId: string
  items: MediaItem[]
}

/**
 * Color media for a specific metal color
 */
export interface ColorMedia {
  metalColorId: string
  items: MediaItem[]
  gemstoneSubMedia: GemstoneSubMedia[]
}

/**
 * Media details for product
 */
export interface MediaDetails {
  colorMedia: ColorMedia[]
}

/**
 * Variant metal type reference
 */
export interface VariantMetalType {
  id: string
}

/**
 * Variant metal color reference
 */
export interface VariantMetalColor {
  id: string
}

/**
 * Variant metal purity with weight
 */
export interface VariantMetalPurity {
  id: string
  weight: number
}

/**
 * Variant diamond clarity/color reference
 */
export interface VariantDiamondClarityColor {
  id: string
}

/**
 * Variant gemstone color reference
 */
export interface VariantGemstoneColor {
  id: string
}

/**
 * Generated variant
 */
export interface GeneratedVariant {
  id: string
  metalType: VariantMetalType
  metalColor: VariantMetalColor
  metalPurity: VariantMetalPurity
  diamondClarityColor: VariantDiamondClarityColor | null
  gemstoneColor: VariantGemstoneColor | null
  isDefault: boolean
}

/**
 * Variants details for product
 */
export interface VariantsDetails {
  defaultVariantId: string
  generatedVariants: GeneratedVariant[]
}

/**
 * Full create request for jewellery-default product
 */
export interface JewelleryDefaultCreateRequest {
  productType: 'JEWELLERY_DEFAULT'
  basic: BasicDetails
  metal: MetalDetails
  stone: StoneDetails
  seo: SeoDetails
  attributes: AttributesDetails
  media: MediaDetails
  variants: VariantsDetails
}
