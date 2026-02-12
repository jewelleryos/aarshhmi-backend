import { z } from 'zod'
import { PRODUCT_TYPES, type ProductTypeCode } from '../../../config/product.config'
import { pricingRuleMessages } from './pricing-rule.messages'

// Get valid product type codes with proper typing
const productTypeCodes = Object.keys(PRODUCT_TYPES) as [ProductTypeCode, ...ProductTypeCode[]]

// Category Condition Value Schema
const categoryConditionValueSchema = z.object({
  matchType: z.enum(['any', 'all']),
  categoryIds: z.array(z.string()).min(1, pricingRuleMessages.INVALID_CATEGORY_CONDITION),
})

// Diamond Carat Condition Value Schema
const diamondCaratConditionValueSchema = z
  .object({
    from: z.number().min(0, 'From must be >= 0'),
    to: z.number().min(0, 'To must be >= 0'),
  })
  .refine((data) => data.to > data.from, {
    message: pricingRuleMessages.INVALID_CARAT_RANGE,
  })

// Tags Condition Value Schema
const tagsConditionValueSchema = z.object({
  matchType: z.enum(['any', 'all']),
  tagIds: z.array(z.string()).min(1, pricingRuleMessages.INVALID_TAGS_CONDITION),
})

// Badges Condition Value Schema
const badgesConditionValueSchema = z.object({
  matchType: z.enum(['any', 'all']),
  badgeIds: z.array(z.string()).min(1, pricingRuleMessages.INVALID_BADGES_CONDITION),
})

// Metal Weight Condition Value Schema
const metalWeightConditionValueSchema = z
  .object({
    from: z.number().min(0, 'From must be >= 0'),
    to: z.number().min(0, 'To must be >= 0'),
  })
  .refine((data) => data.to > data.from, {
    message: pricingRuleMessages.INVALID_METAL_WEIGHT_RANGE,
  })

// Metal Type Condition Value Schema (no matchType - always "any")
const metalTypeConditionValueSchema = z.object({
  metalTypeIds: z.array(z.string()).min(1, pricingRuleMessages.INVALID_METAL_TYPE_CONDITION),
})

// Metal Color Condition Value Schema (no matchType - always "any")
const metalColorConditionValueSchema = z.object({
  metalColorIds: z.array(z.string()).min(1, pricingRuleMessages.INVALID_METAL_COLOR_CONDITION),
})

// Metal Purity Condition Value Schema (no matchType - always "any")
const metalPurityConditionValueSchema = z.object({
  metalPurityIds: z.array(z.string()).min(1, pricingRuleMessages.INVALID_METAL_PURITY_CONDITION),
})

// Diamond Clarity Color Condition Value Schema (no matchType - always "any")
const diamondClarityColorConditionValueSchema = z.object({
  diamondClarityColorIds: z.array(z.string()).min(1, pricingRuleMessages.INVALID_DIAMOND_CLARITY_COLOR_CONDITION),
})

// Gemstone Carat Condition Value Schema
const gemstoneCaratConditionValueSchema = z
  .object({
    from: z.number().min(0, 'From must be >= 0'),
    to: z.number().min(0, 'To must be >= 0'),
  })
  .refine((data) => data.to > data.from, {
    message: pricingRuleMessages.INVALID_GEMSTONE_CARAT_RANGE,
  })

// Pearl Gram Condition Value Schema
const pearlGramConditionValueSchema = z
  .object({
    from: z.number().min(0, 'From must be >= 0'),
    to: z.number().min(0, 'To must be >= 0'),
  })
  .refine((data) => data.to > data.from, {
    message: pricingRuleMessages.INVALID_PEARL_GRAM_RANGE,
  })

// Condition Schema (discriminated union)
const conditionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('category'),
    value: categoryConditionValueSchema,
  }),
  z.object({
    type: z.literal('diamond_carat'),
    value: diamondCaratConditionValueSchema,
  }),
  z.object({
    type: z.literal('tags'),
    value: tagsConditionValueSchema,
  }),
  z.object({
    type: z.literal('metal_weight'),
    value: metalWeightConditionValueSchema,
  }),
  z.object({
    type: z.literal('badges'),
    value: badgesConditionValueSchema,
  }),
  z.object({
    type: z.literal('metal_type'),
    value: metalTypeConditionValueSchema,
  }),
  z.object({
    type: z.literal('metal_color'),
    value: metalColorConditionValueSchema,
  }),
  z.object({
    type: z.literal('metal_purity'),
    value: metalPurityConditionValueSchema,
  }),
  z.object({
    type: z.literal('diamond_clarity_color'),
    value: diamondClarityColorConditionValueSchema,
  }),
  z.object({
    type: z.literal('gemstone_carat'),
    value: gemstoneCaratConditionValueSchema,
  }),
  z.object({
    type: z.literal('pearl_gram'),
    value: pearlGramConditionValueSchema,
  }),
])

// Actions Schema
const actionsSchema = z.object({
  diamondMarkup: z.number().min(0).max(100).default(0),
  makingChargeMarkup: z.number().min(0).max(100).default(0),
  gemstoneMarkup: z.number().min(0).max(100).default(0),
  pearlMarkup: z.number().min(0).max(100).default(0),
})

// Create Schema
export const createPricingRuleSchema = z.object({
  name: z.string().min(1, pricingRuleMessages.NAME_REQUIRED).max(255),
  product_type: z.enum(productTypeCodes).default('JEWELLERY_DEFAULT'),
  conditions: z.array(conditionSchema).min(1, pricingRuleMessages.CONDITIONS_REQUIRED),
  actions: actionsSchema,
  is_active: z.boolean().default(true),
})

// Update Schema
export const updatePricingRuleSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  product_type: z.enum(productTypeCodes).optional(),
  conditions: z.array(conditionSchema).min(1).optional(),
  actions: actionsSchema.optional(),
  is_active: z.boolean().optional(),
})

