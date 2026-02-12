import type { ProductTypeCode } from '../../../config/product.config'

// Condition Types
export type ConditionType =
  | 'category'
  | 'diamond_carat'
  | 'tags'
  | 'metal_weight'
  | 'badges'
  | 'metal_type'
  | 'metal_color'
  | 'metal_purity'
  | 'diamond_clarity_color'
  | 'gemstone_carat'
  | 'pearl_gram'

// Category Condition Value
export interface CategoryConditionValue {
  matchType: 'any' | 'all'
  categoryIds: string[]
}

// Diamond Carat Condition Value
export interface DiamondCaratConditionValue {
  from: number
  to: number
}

// Tags Condition Value
export interface TagsConditionValue {
  matchType: 'any' | 'all'
  tagIds: string[]
}

// Metal Weight Condition Value
export interface MetalWeightConditionValue {
  from: number
  to: number
}

// Badges Condition Value
export interface BadgesConditionValue {
  matchType: 'any' | 'all'
  badgeIds: string[]
}

// Metal Type Condition Value
export interface MetalTypeConditionValue {
  metalTypeIds: string[]
}

// Metal Color Condition Value
export interface MetalColorConditionValue {
  metalColorIds: string[]
}

// Metal Purity Condition Value
export interface MetalPurityConditionValue {
  metalPurityIds: string[]
}

// Diamond Clarity Color Condition Value
export interface DiamondClarityColorConditionValue {
  diamondClarityColorIds: string[]
}

// Gemstone Carat Condition Value
export interface GemstoneCaratConditionValue {
  from: number
  to: number
}

// Pearl Gram Condition Value
export interface PearlGramConditionValue {
  from: number
  to: number
}

// Condition Value Union
export type ConditionValue =
  | CategoryConditionValue
  | DiamondCaratConditionValue
  | TagsConditionValue
  | MetalWeightConditionValue
  | BadgesConditionValue
  | MetalTypeConditionValue
  | MetalColorConditionValue
  | MetalPurityConditionValue
  | DiamondClarityColorConditionValue
  | GemstoneCaratConditionValue
  | PearlGramConditionValue

// Single Condition
export interface PricingRuleCondition {
  type: ConditionType
  value: ConditionValue
}

// Actions (Markup Percentages)
export interface PricingRuleActions {
  diamondMarkup: number
  makingChargeMarkup: number
  gemstoneMarkup: number
  pearlMarkup: number
}

// Full Pricing Rule (from DB)
export interface PricingRule {
  id: string
  name: string
  product_type: ProductTypeCode
  conditions: PricingRuleCondition[]
  actions: PricingRuleActions
  is_active: boolean
  created_at: string
  updated_at: string
}

// Create Input
export interface CreatePricingRuleRequest {
  name: string
  product_type?: ProductTypeCode
  conditions: PricingRuleCondition[]
  actions: PricingRuleActions
  is_active?: boolean
}

// Update Input
export interface UpdatePricingRuleRequest {
  name?: string
  product_type?: ProductTypeCode
  conditions?: PricingRuleCondition[]
  actions?: PricingRuleActions
  is_active?: boolean
}
