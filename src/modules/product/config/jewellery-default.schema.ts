// Jewellery Default - Product type specific schema
import { z } from 'zod'

/**
 * Slug validation: only lowercase letters, numbers, and dashes allowed
 */
const slugSchema = z
  .string()
  .min(1, 'Slug is required')
  .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and dashes')

/**
 * Dimensions schema
 */
const dimensionsSchema = z.object({
  width: z.number({ message: 'Width is required' }),
  height: z.number({ message: 'Height is required' }),
  length: z.number({ message: 'Length is required' }),
})

/**
 * Engraving schema with conditional validation
 */
const engravingSchema = z
  .object({
    hasEngraving: z.boolean({ message: 'Has engraving field is required' }),
    maxChars: z.number().nullable(),
  })
  .refine(
    (data) => {
      if (data.hasEngraving && (data.maxChars === null || data.maxChars === undefined)) {
        return false
      }
      return true
    },
    { message: 'Max characters is required when engraving is enabled', path: ['maxChars'] }
  )

/**
 * Size chart schema with conditional validation
 */
const sizeChartSchema = z
  .object({
    hasSizeChart: z.boolean({ message: 'Has size chart field is required' }),
    sizeChartGroupId: z.string().nullable(),
  })
  .refine(
    (data) => {
      if (data.hasSizeChart && (!data.sizeChartGroupId || data.sizeChartGroupId.trim() === '')) {
        return false
      }
      return true
    },
    { message: 'Size chart group ID is required when size chart is enabled', path: ['sizeChartGroupId'] }
  )

/**
 * Basic details schema
 */
const basicDetailsSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: slugSchema,
  productSku: z.string().min(1, 'Product SKU is required'),
  styleSku: z.string().nullable().optional(),
  shortDescription: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  dimensions: dimensionsSchema,
  engraving: engravingSchema,
  sizeChart: sizeChartSchema,
})

/**
 * Round weight to 3 decimal places
 */
const roundWeight = (value: number): number => {
  return Math.round(value * 1000) / 1000
}

/**
 * Metal color schema
 */
const metalColorSchema = z.object({
  colorId: z.string().min(1, 'Color ID is required'),
})

/**
 * Metal purity schema with weight validation
 */
const metalPuritySchema = z.object({
  purityId: z.string().min(1, 'Purity ID is required'),
  weight: z
    .number({ message: 'Weight is required' })
    .positive('Weight must be greater than zero')
    .transform(roundWeight),
})

/**
 * Selected metal schema
 */
const selectedMetalSchema = z.object({
  metalTypeId: z.string().min(1, 'Metal type ID is required'),
  purities: z.array(metalPuritySchema).min(1, 'At least one purity must be selected'),
})

/**
 * Metal details schema
 */
const metalDetailsSchema = z.object({
  colors: z.array(metalColorSchema).min(1, 'At least one color must be selected'),
  selectedMetals: z.array(selectedMetalSchema).min(1, 'At least one metal must be selected'),
})

// ==================== STONE DETAILS ====================

/**
 * Diamond clarity/color schema
 */
const diamondClarityColorSchema = z.object({
  id: z.string().min(1, 'Clarity/Color ID is required'),
})

/**
 * Diamond pricing schema
 */
const diamondPricingSchema = z.object({
  clarityColorId: z.string().min(1, 'Clarity/Color ID is required'),
  pricingId: z.string().min(1, 'Pricing ID is required'),
})

/**
 * Diamond entry schema
 */
const diamondEntrySchema = z.object({
  shapeId: z.string().min(1, 'Shape is required'),
  totalCarat: z.number({ message: 'Total carat is required' }).positive('Total carat must be greater than zero'),
  noOfStones: z
    .number({ message: 'Number of stones is required' })
    .int('Number of stones must be a whole number')
    .positive('Number of stones must be greater than zero'),
  pricings: z.array(diamondPricingSchema).min(1, 'At least one pricing is required'),
})

/**
 * Diamond details schema
 */
const diamondDetailsSchema = z.object({
  clarityColors: z.array(diamondClarityColorSchema).min(1, 'At least one clarity/color must be selected'),
  entries: z.array(diamondEntrySchema).min(1, 'At least one diamond entry is required'),
})

/**
 * Gemstone color schema
 */
const gemstoneColorSchema = z.object({
  id: z.string().min(1, 'Color ID is required'),
})

/**
 * Gemstone pricing schema
 */
const gemstonePricingSchema = z.object({
  colorId: z.string().min(1, 'Color ID is required'),
  pricingId: z.string().min(1, 'Pricing ID is required'),
})

/**
 * Gemstone entry schema
 */
const gemstoneEntrySchema = z.object({
  typeId: z.string().min(1, 'Gemstone type is required'),
  shapeId: z.string().min(1, 'Shape is required'),
  totalCarat: z.number({ message: 'Total carat is required' }).positive('Total carat must be greater than zero'),
  noOfStones: z
    .number({ message: 'Number of stones is required' })
    .int('Number of stones must be a whole number')
    .positive('Number of stones must be greater than zero'),
  pricings: z.array(gemstonePricingSchema).min(1, 'At least one pricing is required'),
})

/**
 * Gemstone details schema
 */
const gemstoneDetailsSchema = z.object({
  qualityId: z.string().min(1, 'Quality is required'),
  colors: z.array(gemstoneColorSchema).min(1, 'At least one color must be selected'),
  entries: z.array(gemstoneEntrySchema).min(1, 'At least one gemstone entry is required'),
})

/**
 * Pearl entry schema
 */
const pearlEntrySchema = z.object({
  typeId: z.string().min(1, 'Pearl type is required'),
  qualityId: z.string().min(1, 'Pearl quality is required'),
  noOfPearls: z
    .number({ message: 'Number of pearls is required' })
    .int('Number of pearls must be a whole number')
    .positive('Number of pearls must be greater than zero'),
  totalGrams: z
    .number({ message: 'Total grams is required' })
    .positive('Total grams must be greater than zero'),
  amount: z
    .number({ message: 'Amount is required' })
    .nonnegative('Amount cannot be negative'),
})

/**
 * Pearl details schema
 */
const pearlDetailsSchema = z.object({
  entries: z.array(pearlEntrySchema).min(1, 'At least one pearl entry is required'),
})

/**
 * Stone details schema with conditional validation
 */
const stoneDetailsSchema = z
  .object({
    hasDiamond: z.boolean({ message: 'Has diamond field is required' }),
    diamond: diamondDetailsSchema.nullable(),
    hasGemstone: z.boolean({ message: 'Has gemstone field is required' }),
    gemstone: gemstoneDetailsSchema.nullable(),
    hasPearl: z.boolean({ message: 'Has pearl field is required' }),
    pearl: pearlDetailsSchema.nullable(),
  })
  .refine(
    (data) => {
      if (data.hasDiamond && !data.diamond) {
        return false
      }
      return true
    },
    { message: 'Diamond details are required when has diamond is true', path: ['diamond'] }
  )
  .refine(
    (data) => {
      if (data.hasGemstone && !data.gemstone) {
        return false
      }
      return true
    },
    { message: 'Gemstone details are required when has gemstone is true', path: ['gemstone'] }
  )
  .refine(
    (data) => {
      if (data.hasPearl && !data.pearl) {
        return false
      }
      return true
    },
    { message: 'Pearl details are required when has pearl is true', path: ['pearl'] }
  )

// ==================== SEO DETAILS ====================

/**
 * SEO meta schema
 */
const seoMetaSchema = z.object({
  title: z.string().nullable(),
  keywords: z.string().nullable(),
  description: z.string().nullable(),
  robots: z.string().nullable(),
  canonical: z.string().nullable(),
})

/**
 * SEO Open Graph schema
 */
const seoOpenGraphSchema = z.object({
  title: z.string().nullable(),
  siteName: z.string().nullable(),
  description: z.string().nullable(),
  url: z.string().nullable(),
  imageUrl: z.string().nullable(),
})

/**
 * SEO Twitter schema
 */
const seoTwitterSchema = z.object({
  cardTitle: z.string().nullable(),
  siteName: z.string().nullable(),
  description: z.string().nullable(),
  url: z.string().nullable(),
  media: z.string().nullable(),
})

/**
 * SEO details schema
 */
const seoDetailsSchema = z.object({
  meta: seoMetaSchema,
  openGraph: seoOpenGraphSchema,
  twitter: seoTwitterSchema,
})

// ==================== ATTRIBUTES DETAILS ====================

/**
 * Badge reference schema
 */
const badgeRefSchema = z.object({
  id: z.string().min(1, 'Badge ID is required'),
})

/**
 * Category reference schema
 */
const categoryRefSchema = z.object({
  id: z.string().min(1, 'Category ID is required'),
})

/**
 * Tag reference schema
 */
const tagRefSchema = z.object({
  id: z.string().min(1, 'Tag ID is required'),
})

/**
 * Attributes details schema
 */
const attributesDetailsSchema = z.object({
  badges: z.array(badgeRefSchema).default([]),
  categories: z.array(categoryRefSchema).min(1, 'At least one category must be selected'),
  tags: z.array(tagRefSchema).default([]),
})

// ==================== MEDIA DETAILS ====================

/**
 * Media item schema
 */
const mediaItemSchema = z.object({
  id: z.string().min(1, 'Media ID is required'),
  path: z.string().min(1, 'Path is required'),
  type: z.string().min(1, 'Type is required'),
  altText: z.string().nullable(),
  position: z.number().int().nonnegative(),
})

/**
 * Gemstone sub-media schema
 */
const gemstoneSubMediaSchema = z.object({
  gemstoneColorId: z.string().min(1, 'Gemstone color ID is required'),
  items: z.array(mediaItemSchema).default([]),
})

/**
 * Color media schema
 */
const colorMediaSchema = z.object({
  metalColorId: z.string().min(1, 'Metal color ID is required'),
  items: z.array(mediaItemSchema).default([]),
  gemstoneSubMedia: z.array(gemstoneSubMediaSchema).default([]),
})

/**
 * Media details schema
 */
const mediaDetailsSchema = z.object({
  colorMedia: z.array(colorMediaSchema).default([]),
})

// ==================== VARIANTS DETAILS ====================

/**
 * Variant metal type schema
 */
const variantMetalTypeSchema = z.object({
  id: z.string().min(1, 'Metal type ID is required'),
})

/**
 * Variant metal color schema
 */
const variantMetalColorSchema = z.object({
  id: z.string().min(1, 'Metal color ID is required'),
})

/**
 * Variant metal purity schema
 */
const variantMetalPuritySchema = z.object({
  id: z.string().min(1, 'Metal purity ID is required'),
  weight: z.number().positive('Weight must be greater than zero'),
})

/**
 * Variant diamond clarity/color schema
 */
const variantDiamondClarityColorSchema = z.object({
  id: z.string().min(1, 'Diamond clarity/color ID is required'),
})

/**
 * Variant gemstone color schema
 */
const variantGemstoneColorSchema = z.object({
  id: z.string().min(1, 'Gemstone color ID is required'),
})

/**
 * Generated variant schema
 */
const generatedVariantSchema = z.object({
  id: z.string().min(1, 'Variant ID is required'),
  metalType: variantMetalTypeSchema,
  metalColor: variantMetalColorSchema,
  metalPurity: variantMetalPuritySchema,
  diamondClarityColor: variantDiamondClarityColorSchema.nullable(),
  gemstoneColor: variantGemstoneColorSchema.nullable(),
  isDefault: z.boolean(),
})

/**
 * Variants details schema
 */
const variantsDetailsSchema = z.object({
  defaultVariantId: z.string().min(1, 'Default variant ID is required'),
  generatedVariants: z.array(generatedVariantSchema).min(1, 'At least one variant is required'),
})

/**
 * Full jewellery-default create schema
 */
export const jewelleryDefaultCreateSchema = z.object({
  productType: z.literal('JEWELLERY_DEFAULT'),
  basic: basicDetailsSchema,
  metal: metalDetailsSchema,
  stone: stoneDetailsSchema,
  seo: seoDetailsSchema,
  attributes: attributesDetailsSchema,
  media: mediaDetailsSchema,
  variants: variantsDetailsSchema,
})

export type JewelleryDefaultCreateInput = z.infer<typeof jewelleryDefaultCreateSchema>

// ==================== UPDATE SCHEMAS ====================

/**
 * Update basic details schema (for editing)
 * Reuses the same validation as create
 */
export const jewelleryDefaultUpdateBasicSchema = basicDetailsSchema

export type JewelleryDefaultUpdateBasicInput = z.infer<typeof jewelleryDefaultUpdateBasicSchema>

/**
 * Update attributes schema (for editing categories, tags, badges)
 */
export const jewelleryDefaultUpdateAttributesSchema = z.object({
  // Categories - array with one marked as primary
  categories: z
    .array(
      z.object({
        categoryId: z.string().min(1, 'Category ID is required'),
        isPrimary: z.boolean(),
      })
    )
    .min(1, 'At least one category is required')
    .refine(
      (cats) => cats.filter((c) => c.isPrimary).length === 1,
      'Exactly one category must be marked as primary'
    ),

  // Tags - array of tag IDs (user-selected, non-system tags)
  tagIds: z.array(z.string()).default([]),

  // Badges - array of badge IDs
  badgeIds: z.array(z.string()).default([]),
})

export type JewelleryDefaultUpdateAttributesInput = z.infer<typeof jewelleryDefaultUpdateAttributesSchema>

/**
 * Update SEO schema (for editing SEO fields)
 */
export const jewelleryDefaultUpdateSeoSchema = z.object({
  meta_title: z.string().max(200).nullable().optional(),
  meta_keywords: z.string().max(500).nullable().optional(),
  meta_description: z.string().max(500).nullable().optional(),
  meta_robots: z.string().max(100).nullable().optional(),
  meta_canonical: z.string().url().nullable().optional(),
  og_title: z.string().max(200).nullable().optional(),
  og_site_name: z.string().max(200).nullable().optional(),
  og_description: z.string().max(500).nullable().optional(),
  og_url: z.string().url().nullable().optional(),
  og_image_url: z.string().url().nullable().optional(),
  twitter_card_title: z.string().max(200).nullable().optional(),
  twitter_card_site_name: z.string().max(200).nullable().optional(),
  twitter_card_description: z.string().max(500).nullable().optional(),
  twitter_url: z.string().url().nullable().optional(),
  twitter_media: z.string().url().nullable().optional(),
})

export type JewelleryDefaultUpdateSeoInput = z.infer<typeof jewelleryDefaultUpdateSeoSchema>

/**
 * Update media schema (for editing product media)
 * Reuses the same validation as create
 */
export const jewelleryDefaultUpdateMediaSchema = mediaDetailsSchema

export type JewelleryDefaultUpdateMediaInput = z.infer<typeof jewelleryDefaultUpdateMediaSchema>

/**
 * Update options schema (for editing product options - metal, stone, variants, media)
 * Uses full regeneration approach: deletes all existing and recreates
 */
export const jewelleryDefaultUpdateOptionsSchema = z.object({
  metal: metalDetailsSchema,
  stone: stoneDetailsSchema,
  variants: variantsDetailsSchema,
  media: mediaDetailsSchema,
})

export type JewelleryDefaultUpdateOptionsInput = z.infer<typeof jewelleryDefaultUpdateOptionsSchema>
