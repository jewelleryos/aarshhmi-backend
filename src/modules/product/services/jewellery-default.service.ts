// Jewellery Default - Product type specific service
import { PRODUCT_TYPES } from '../../../config/product.config'
import { CURRENCY_CONFIG } from '../../../config/currency'
import { db } from '../../../lib/db'
import { AppError } from '../../../utils/app-error'
import { productMessages } from '../config/product.messages'
import type {
  JewelleryDefaultCreateInput,
  JewelleryDefaultUpdateBasicInput,
  JewelleryDefaultUpdateAttributesInput,
  JewelleryDefaultUpdateSeoInput,
  JewelleryDefaultUpdateMediaInput,
  JewelleryDefaultUpdateOptionsInput,
} from '../config/jewellery-default.schema'
import type { MetalDetails, StoneDetails, VariantsDetails, GeneratedVariant } from '../types/jewellery-default.types'

class JewelleryDefaultService {
  /**
   * Create a new jewellery-default product
   *
   * Transaction steps:
   * 1. Insert into products table
   * 2. Create product_options and product_option_values
   * 3. Create product_variants and variant_option_values
   * 4. Link categories, tags, badges
   * 5. Set default_variant_id on product
   */
  async create(data: JewelleryDefaultCreateInput) {
    try {

      // Validating the variants against metal and stone details
      const { validatedVariants, defaultVariantId } = this.validateVariants(
        data.metal,
        data.stone,
        data.variants
      )

      const finalProductData: any = {}

      const masterData = await this.fetchMasterData()

      // We will parse the basic details and prepare finalProductData here
      finalProductData.title = data.basic.title
      finalProductData.slug = data.basic.slug
      finalProductData.description = data.basic.description || null
      finalProductData.type = PRODUCT_TYPES.JEWELLERY_DEFAULT
      finalProductData.shortDescription = data.basic.shortDescription || null
      finalProductData.productSku = data.basic.productSku
      finalProductData.styleSku = data.basic.styleSku
      finalProductData.dimensions = data.basic.dimensions

      if(data.basic.sizeChart.hasSizeChart){
      
        finalProductData.sizeChart = {
          hasSizeChart: true,
          sizeChartGroupId: data.basic.sizeChart.sizeChartGroupId
        } 
      }
      
      if(data.basic.engraving.hasEngraving){
        finalProductData.engraving = {
          hasEngraving: true,
          maxCharacters: data.basic.engraving.maxChars
        }
      }
      // ======================== //
      // Validate metal data
      for (const selectedMetal of data.metal.selectedMetals) {
        // Validate metal type exists
        const metalType = masterData.metalTypes.find(m => m.id === selectedMetal.metalTypeId)
        if (!metalType) {
          throw new AppError(`Invalid metal type ID: ${selectedMetal.metalTypeId}`, 400)
        }

        // Validate colors exist and belong to this metal type
        for (const color of selectedMetal.colors) {
          const metalColor = masterData.metalColors.find(c => c.id === color.colorId)
          if (!metalColor) {
            throw new AppError(`Invalid metal color ID: ${color.colorId}`, 400)
          }
          if (metalColor.metal_type_id !== selectedMetal.metalTypeId) {
            throw new AppError(
              `Metal color ${color.colorId} does not belong to metal type ${selectedMetal.metalTypeId}`,
              400
            )
          }
        }

        // Validate purities exist and belong to this metal type
        for (const purity of selectedMetal.purities) {
          const metalPurity = masterData.metalPurities.find(p => p.id === purity.purityId)
          if (!metalPurity) {
            throw new AppError(`Invalid metal purity ID: ${purity.purityId}`, 400)
          }
          if (metalPurity.metal_type_id !== selectedMetal.metalTypeId) {
            throw new AppError(
              `Metal purity ${purity.purityId} does not belong to metal type ${selectedMetal.metalTypeId}`,
              400
            )
          }
        }
      }

      // Store metal data directly
      finalProductData.availableMetals = data.metal.selectedMetals

      // ======================== //
      // Validate stone data
      if (data.stone.hasDiamond && data.stone.diamond) {
        // Validate diamond clarity/colors
        for (const clarityColor of data.stone.diamond.clarityColors) {
          const diamondClarityColor = masterData.diamondClarityColors.find(d => d.id === clarityColor.id)
          if (!diamondClarityColor) {
            throw new AppError(`Invalid diamond clarity/color ID: ${clarityColor.id}`, 400)
          }
        }

        // Validate diamond entries
        for (const entry of data.stone.diamond.entries) {
          // Validate shape
          const stoneShape = masterData.stoneShapes.find(s => s.id === entry.shapeId)
          if (!stoneShape) {
            throw new AppError(`Invalid stone shape ID: ${entry.shapeId}`, 400)
          }

          // Validate pricings
          for (const pricing of entry.pricings) {
            const stonePricing = masterData.stonePricings.find(p => p.id === pricing.pricingId)
            if (!stonePricing) {
              throw new AppError(`Invalid diamond pricing ID: ${pricing.pricingId}`, 400)
            }
          }
        }
      }

      if (data.stone.hasGemstone && data.stone.gemstone) {
        // Validate gemstone quality
        const gemstoneQuality = masterData.gemstoneQualities.find(q => q.id === data.stone.gemstone!.qualityId)
        if (!gemstoneQuality) {
          throw new AppError(`Invalid gemstone quality ID: ${data.stone.gemstone.qualityId}`, 400)
        }

        // Validate gemstone colors
        for (const color of data.stone.gemstone.colors) {
          const gemstoneColor = masterData.gemstoneColors.find(c => c.id === color.id)
          if (!gemstoneColor) {
            throw new AppError(`Invalid gemstone color ID: ${color.id}`, 400)
          }
        }

        // Validate gemstone entries
        for (const entry of data.stone.gemstone.entries) {
          // Validate type
          const gemstoneType = masterData.gemstoneTypes.find(t => t.id === entry.typeId)
          if (!gemstoneType) {
            throw new AppError(`Invalid gemstone type ID: ${entry.typeId}`, 400)
          }

          // Validate shape
          const stoneShape = masterData.stoneShapes.find(s => s.id === entry.shapeId)
          if (!stoneShape) {
            throw new AppError(`Invalid stone shape ID: ${entry.shapeId}`, 400)
          }

          // Validate pricings
          for (const pricing of entry.pricings) {
            const stonePricing = masterData.stonePricings.find(p => p.id === pricing.pricingId)
            if (!stonePricing) {
              throw new AppError(`Invalid gemstone pricing ID: ${pricing.pricingId}`, 400)
            }
          }
        }
      }

      if (data.stone.hasPearl && data.stone.pearl) {
        // Validate pearl entries
        for (const entry of data.stone.pearl.entries) {
          // Validate type
          const pearlType = masterData.pearlTypes.find(t => t.id === entry.typeId)
          if (!pearlType) {
            throw new AppError(`Invalid pearl type ID: ${entry.typeId}`, 400)
          }

          // Validate quality
          const pearlQuality = masterData.pearlQualities.find(q => q.id === entry.qualityId)
          if (!pearlQuality) {
            throw new AppError(`Invalid pearl quality ID: ${entry.qualityId}`, 400)
          }
        }
      }

      // Store stone data directly
      finalProductData.stone = data.stone

      // ======================== //
      // Calculate variant pricing and generate SKU

      // Process each variant
      const processedVariants = validatedVariants.map(variant => {

        const pricingComponents: any = {
          costPrice : {
          },
          sellingPrice : {
          },
          compareAtPrice : {
          }
        }

        // Extract variant components
        const metalTypeId = variant.metalType.id
        const metalColorId = variant.metalColor.id
        const metalPurityId = variant.metalPurity.id
        const metalWeight = variant.metalPurity.weight

        // Get master data for this variant
        const metalType = masterData.metalTypes.find(m => m.id === metalTypeId)!
        const metalColor = masterData.metalColors.find(c => c.id === metalColorId)!
        const metalPurity = masterData.metalPurities.find(p => p.id === metalPurityId)!

        // MRP Markup percentages
        const mrpMarkup = masterData.mrpMarkup 
        if(!mrpMarkup) {
          throw new AppError('MRP Markup master data not found', 500)
        }

        // 1. Calculate Metal Price (cost, selling, compareAt)
        const metalCostPrice = Math.round(metalPurity.price * metalWeight)
        const metalSellingPrice = metalCostPrice // Same as cost for now
        const metalCompareAtPrice = metalCostPrice // No markup on metal

        pricingComponents.costPrice.metalPrice = metalCostPrice
        pricingComponents.sellingPrice.metalPrice = metalSellingPrice
        pricingComponents.compareAtPrice.metalPrice = metalCompareAtPrice

        // 2. Calculate Making Charge (cost, selling, compareAt)
        const makingCharge = masterData.makingCharges.find(
          mc => mc.metal_type_id === metalTypeId && metalWeight >= mc.from && metalWeight <= mc.to
        )
        if (!makingCharge) {
          throw new AppError(`No making charge found for metal type ${metalTypeId} and weight ${metalWeight}`, 400)
        }

        let baseMakingCharge = 0
        if (makingCharge.is_fixed_pricing) {
          // Fixed: metalWeight * amount
          baseMakingCharge = Math.round((metalWeight * makingCharge.amount) * CURRENCY_CONFIG.subunits)
        } else {
          // Percentage: percentage of metal cost price
          baseMakingCharge = Math.round((makingCharge.amount / 100) * metalCostPrice)
        }

        // Add other charges to making charge (already in subunits)
        let totalOtherCharges = 0
        for (const otherCharge of masterData.otherCharges) {
          totalOtherCharges += otherCharge.amount
        }

        const makingChargeCostPrice = baseMakingCharge + totalOtherCharges

        // Apply pricing rule markup for making charge
        let makingChargeRuleMarkupAmount = 0
        for (const rule of masterData.pricingRules) {
          if (rule.actions.makingChargeMarkup && rule.actions.makingChargeMarkup > 0 && rule.product_type === PRODUCT_TYPES.JEWELLERY_DEFAULT.code) {
            // Check if variant matches all conditions of this rule
            if (this.matchesPricingRuleConditions(rule.conditions, data, variant)) {
              // Calculate actual markup amount for this rule (in paise)
              const ruleMarkupAmount = Math.round(makingChargeCostPrice * (rule.actions.makingChargeMarkup / 100))
              makingChargeRuleMarkupAmount += ruleMarkupAmount
            }
          }
        }

        // Calculate selling price by adding accumulated markup amount
        const makingChargeSellingPrice = makingChargeCostPrice + makingChargeRuleMarkupAmount
        // Compare at price is MRP markup on selling price (not cost price)
        const makingChargeCompareAtPrice = Math.round(makingChargeSellingPrice * (1 + (mrpMarkup.making_charge / 100)))

        pricingComponents.costPrice.makingCharge = makingChargeCostPrice
        pricingComponents.sellingPrice.makingCharge = makingChargeSellingPrice
        pricingComponents.compareAtPrice.makingCharge = makingChargeCompareAtPrice

        // 3. Calculate Diamond Price (cost, selling, compareAt)
        let diamondCostPrice = 0
        if (data.stone.hasDiamond && data.stone.diamond) {
          const variantDiamondClarityColorId = variant.diamondClarityColor?.id
          if (variantDiamondClarityColorId) {
            const diamondEntries = data.stone.diamond.entries
            for (let i = 0; i < diamondEntries.length; i++) {
              const entry = diamondEntries[i]
              const pricingIndex = entry.pricings.findIndex(p => p.clarityColorId === variantDiamondClarityColorId)
              if (pricingIndex !== -1) {
                const pricingId = entry.pricings[pricingIndex].pricingId
                const diamondStonePricing = masterData.stonePricings.find(sp => sp.id === pricingId)
                if (diamondStonePricing) {
                  // Validate shape and clarity/color match
                  if (diamondStonePricing.stone_shape_id !== entry.shapeId) {
                    throw new AppError(`Diamond pricing ${pricingId} shape mismatch`, 400)
                  }
                  if (diamondStonePricing.stone_quality_id !== variantDiamondClarityColorId) {
                    throw new AppError(`Diamond pricing ${pricingId} clarity/color mismatch`, 400)
                  }
                  diamondCostPrice += Math.round(diamondStonePricing.price * entry.totalCarat)
                }else{
                  throw new AppError(`Diamond stone pricing not found for ID: ${pricingId}`, 400)
                }
              }
            }
          }
        }

        // Apply pricing rule markup for diamond
        let diamondRuleMarkupAmount = 0
        for (const rule of masterData.pricingRules) {
          if (rule.actions.diamondMarkup && rule.actions.diamondMarkup > 0 && rule.product_type === PRODUCT_TYPES.JEWELLERY_DEFAULT.code) {
            // Check if variant matches all conditions of this rule
            if (this.matchesPricingRuleConditions(rule.conditions, data, variant)) {
              // Calculate actual markup amount for this rule (in paise)
              const ruleMarkupAmount = Math.round(diamondCostPrice * (rule.actions.diamondMarkup / 100))
              diamondRuleMarkupAmount += ruleMarkupAmount
            }
          }
        }

        // Calculate selling price by adding accumulated markup amount
        const diamondSellingPrice = diamondCostPrice + diamondRuleMarkupAmount
        // Compare at price is MRP markup on selling price
        const diamondCompareAtPrice = Math.round(diamondSellingPrice * (1 + (mrpMarkup.diamond / 100)))

        pricingComponents.costPrice.diamondPrice = diamondCostPrice
        pricingComponents.sellingPrice.diamondPrice = diamondSellingPrice
        pricingComponents.compareAtPrice.diamondPrice = diamondCompareAtPrice

        // 4. Calculate Gemstone Price (cost, selling, compareAt)
        let gemstoneCostPrice = 0
        if (data.stone.hasGemstone && data.stone.gemstone) {
          const variantGemstoneColorId = variant.gemstoneColor?.id
          if (variantGemstoneColorId) {
            const gemstoneEntries = data.stone.gemstone.entries
            const gemstoneQualityId = data.stone.gemstone.qualityId
            for (let i = 0; i < gemstoneEntries.length; i++) {
              const entry = gemstoneEntries[i]
              const pricingIndex = entry.pricings.findIndex(p => p.colorId === variantGemstoneColorId)
              if (pricingIndex !== -1) {
                const pricingId = entry.pricings[pricingIndex].pricingId
                const gemstoneStonePricing = masterData.stonePricings.find(sp => sp.id === pricingId)
                if (gemstoneStonePricing) {
                  // Validate type, shape, quality, color match
                  if (gemstoneStonePricing.stone_type_id !== entry.typeId) {
                    throw new AppError(`Gemstone pricing ${pricingId} type mismatch`, 400)
                  }
                  if (gemstoneStonePricing.stone_shape_id !== entry.shapeId) {
                    throw new AppError(`Gemstone pricing ${pricingId} shape mismatch`, 400)
                  }
                  if (gemstoneStonePricing.stone_quality_id !== gemstoneQualityId) {
                    throw new AppError(`Gemstone pricing ${pricingId} quality mismatch`, 400)
                  }
                  if (gemstoneStonePricing.stone_color_id !== variantGemstoneColorId) {
                    throw new AppError(`Gemstone pricing ${pricingId} color mismatch`, 400)
                  }
                  gemstoneCostPrice += Math.round(gemstoneStonePricing.price * entry.totalCarat)
                } else {
                  throw new AppError(`Gemstone stone pricing not found for ID: ${pricingId}`, 400)
                }
              }
            }
          }
        }

        // Apply pricing rule markup for gemstone
        let gemstoneRuleMarkupAmount = 0
        for (const rule of masterData.pricingRules) {
          if (rule.actions.gemstoneMarkup && rule.actions.gemstoneMarkup > 0 && rule.product_type === PRODUCT_TYPES.JEWELLERY_DEFAULT.code) {
            // Check if variant matches all conditions of this rule
            if (this.matchesPricingRuleConditions(rule.conditions, data, variant)) {
              // Calculate actual markup amount for this rule (in paise)
              const ruleMarkupAmount = Math.round(gemstoneCostPrice * (rule.actions.gemstoneMarkup / 100))
              gemstoneRuleMarkupAmount += ruleMarkupAmount
            }
          }
        }

        // Calculate selling price by adding accumulated markup amount
        const gemstoneSellingPrice = gemstoneCostPrice + gemstoneRuleMarkupAmount
        // Compare at price is MRP markup on selling price
        const gemstoneCompareAtPrice = Math.round(gemstoneSellingPrice * (1 + (mrpMarkup.gemstone / 100)))

        pricingComponents.costPrice.gemstonePrice = gemstoneCostPrice
        pricingComponents.sellingPrice.gemstonePrice = gemstoneSellingPrice
        pricingComponents.compareAtPrice.gemstonePrice = gemstoneCompareAtPrice

        // 5. Calculate Pearl Price (cost, selling, compareAt)
        // Pearl price is same for all variants (not variant-specific)
        let pearlCostPrice = 0
        if (data.stone.hasPearl && data.stone.pearl) {
          const pearlEntries = data.stone.pearl.entries
          for (let i = 0; i < pearlEntries.length; i++) {
            // User provides amount directly, convert to smallest unit
            pearlCostPrice += pearlEntries[i].amount * CURRENCY_CONFIG.subunits
          }
        }

        // Apply pricing rule markup for pearl
        let pearlRuleMarkupAmount = 0
        for (const rule of masterData.pricingRules) {
          if (rule.actions.pearlMarkup && rule.actions.pearlMarkup > 0 && rule.product_type === PRODUCT_TYPES.JEWELLERY_DEFAULT.code) {
            // Check if variant matches all conditions of this rule
            if (this.matchesPricingRuleConditions(rule.conditions, data, variant)) {
              // Calculate actual markup amount for this rule (in paise)
              const ruleMarkupAmount = Math.round(pearlCostPrice * (rule.actions.pearlMarkup / 100))
              pearlRuleMarkupAmount += ruleMarkupAmount
            }
          }
        }

        // Calculate selling price by adding accumulated markup amount
        const pearlSellingPrice = pearlCostPrice + pearlRuleMarkupAmount
        // Compare at price is MRP markup on selling price
        const pearlCompareAtPrice = Math.round(pearlSellingPrice * (1 + (mrpMarkup.pearl / 100)))

        pricingComponents.costPrice.pearlPrice = pearlCostPrice
        pricingComponents.sellingPrice.pearlPrice = pearlSellingPrice
        pricingComponents.compareAtPrice.pearlPrice = pearlCompareAtPrice

        // 6. Calculate Final Price Without Tax (cost, selling, compareAt)
        const costFinalWithoutTax = metalCostPrice + makingChargeCostPrice + diamondCostPrice + gemstoneCostPrice + pearlCostPrice
        const sellingFinalWithoutTax = metalSellingPrice + makingChargeSellingPrice + diamondSellingPrice + gemstoneSellingPrice + pearlSellingPrice
        const compareAtFinalWithoutTax = metalCompareAtPrice + makingChargeCompareAtPrice + diamondCompareAtPrice + gemstoneCompareAtPrice + pearlCompareAtPrice

        pricingComponents.costPrice.finalPriceWithoutTax = costFinalWithoutTax
        pricingComponents.sellingPrice.finalPriceWithoutTax = sellingFinalWithoutTax
        pricingComponents.compareAtPrice.finalPriceWithoutTax = compareAtFinalWithoutTax

        // 7. Calculate Tax and Final Price With Tax
        if (CURRENCY_CONFIG.includeTax) {
          const costTaxAmount = Math.round(costFinalWithoutTax * (CURRENCY_CONFIG.taxRatePercent / 100))
          const sellingTaxAmount = Math.round(sellingFinalWithoutTax * (CURRENCY_CONFIG.taxRatePercent / 100))
          const compareAtTaxAmount = Math.round(compareAtFinalWithoutTax * (CURRENCY_CONFIG.taxRatePercent / 100))

          pricingComponents.costPrice.taxAmount = costTaxAmount
          pricingComponents.costPrice.finalPriceWithTax = costFinalWithoutTax + costTaxAmount
          pricingComponents.costPrice.taxIncluded = true
          pricingComponents.costPrice.finalPrice = costFinalWithoutTax + costTaxAmount

          pricingComponents.sellingPrice.taxAmount = sellingTaxAmount
          pricingComponents.sellingPrice.finalPriceWithTax = sellingFinalWithoutTax + sellingTaxAmount
          pricingComponents.sellingPrice.taxIncluded = true
          pricingComponents.sellingPrice.finalPrice = sellingFinalWithoutTax + sellingTaxAmount

          pricingComponents.compareAtPrice.taxAmount = compareAtTaxAmount
          pricingComponents.compareAtPrice.finalPriceWithTax = compareAtFinalWithoutTax + compareAtTaxAmount
          pricingComponents.compareAtPrice.taxIncluded = true
          pricingComponents.compareAtPrice.finalPrice = compareAtFinalWithoutTax + compareAtTaxAmount
        } else {
          pricingComponents.costPrice.taxAmount = 0
          pricingComponents.costPrice.finalPriceWithTax = 0
          pricingComponents.costPrice.taxIncluded = false
          pricingComponents.costPrice.finalPrice = costFinalWithoutTax

          pricingComponents.sellingPrice.taxAmount = 0
          pricingComponents.sellingPrice.finalPriceWithTax = 0
          pricingComponents.sellingPrice.taxIncluded = false
          pricingComponents.sellingPrice.finalPrice = sellingFinalWithoutTax

          pricingComponents.compareAtPrice.taxAmount = 0
          pricingComponents.compareAtPrice.finalPriceWithTax = 0
          pricingComponents.compareAtPrice.taxIncluded = false
          pricingComponents.compareAtPrice.finalPrice = compareAtFinalWithoutTax
        }

        // 7. Generate Variant SKU
        const skuConfig = PRODUCT_TYPES.JEWELLERY_DEFAULT.variantSkuConfig
        const variantDiamondId = variant.diamondClarityColor?.id
        const variantGemstoneId = variant.gemstoneColor?.id
        const diamondClarityColor = variantDiamondId
          ? masterData.diamondClarityColors.find(d => d.id === variantDiamondId)
          : null
        const gemstoneColor = variantGemstoneId
          ? masterData.gemstoneColors.find(g => g.id === variantGemstoneId)
          : null

        const skuComponents: Record<string, string | null> = {
          productSku: data.basic.productSku,
          metalType: metalType.slug,
          metalColor: metalColor.slug,
          metalPurity: metalPurity.slug,
          diamondClarityColor: diamondClarityColor?.slug || null,
          gemstoneColor: gemstoneColor?.slug || null,
        }

        let variantSku = ''
        for (const component of skuConfig.components) {
          const value = skuComponents[component.key]
          if (value) {
            variantSku += component.separator + value
          }
        }

        return {
          sku: variantSku,
          metalType:  metalTypeId ,
          metalColor:   metalColorId ,
          metalPurity:  metalPurityId ,
          metalWeight:  metalWeight ,
          diamondClarityColor: data.stone.hasDiamond ? variantDiamondId : null,
          gemstoneColor: data.stone.hasGemstone ? variantGemstoneId  : null,
          isDefault: variant.isDefault,
          pricingComponents: pricingComponents,
        }
      })

      // Store processed variants
      finalProductData.variants = processedVariants

      // ------------------------- //
      // Store media, seo, and attributes
      finalProductData.media = data.media
      finalProductData.seo = data.seo
      finalProductData.attributes = data.attributes

      // ------------------------- //
      // Collect all source IDs for system-generated tags
      const sourceIds: string[] = []

      // Metal IDs (types, colors, purities)
      for (const selectedMetal of data.metal.selectedMetals) {
        sourceIds.push(selectedMetal.metalTypeId)
        for (const color of selectedMetal.colors) {
          sourceIds.push(color.colorId)
        }
        for (const purity of selectedMetal.purities) {
          sourceIds.push(purity.purityId)
        }
      }

      // Diamond IDs (clarity/colors, shapes)
      if (data.stone.hasDiamond && data.stone.diamond) {
        for (const clarityColor of data.stone.diamond.clarityColors) {
          sourceIds.push(clarityColor.id)
        }
        for (const entry of data.stone.diamond.entries) {
          sourceIds.push(entry.shapeId)
        }
      }

      // Gemstone IDs (types, colors, quality, shapes)
      if (data.stone.hasGemstone && data.stone.gemstone) {
        sourceIds.push(data.stone.gemstone.qualityId)
        for (const color of data.stone.gemstone.colors) {
          sourceIds.push(color.id)
        }
        for (const entry of data.stone.gemstone.entries) {
          sourceIds.push(entry.typeId)
          sourceIds.push(entry.shapeId)
        }
      }

      // Pearl IDs (types, qualities)
      if (data.stone.hasPearl && data.stone.pearl) {
        for (const entry of data.stone.pearl.entries) {
          sourceIds.push(entry.typeId)
          sourceIds.push(entry.qualityId)
        }
      }

      // Find system tags where source_id matches collected IDs
      const systemTagIds: string[] = []
      for (const tag of masterData.tags) {
        if (tag.source_id && sourceIds.includes(tag.source_id)) {
          systemTagIds.push(tag.id)
        }
      }

      // Store system tags separately
      finalProductData.systemTags = systemTagIds

      // Calculate stone weights (constant across all variants)
      const stoneWeights = this.calculateStoneWeights(data.stone)

      // Build optionConfig and availabilityMap for frontend variant selection
      const optionConfig = this.buildOptionConfig(masterData, data)
      const availabilityMap = this.buildAvailabilityMap(
        finalProductData.variants,
        data.stone.hasDiamond,
        data.stone.hasGemstone
      )
      console.log('optionConfig and availabilityMap built successfully')

      // Step 1: Insert into products table
      const productMetadata = {
        // Existing fields (unchanged)
        dimensions: finalProductData.dimensions,
        sizeChart: finalProductData.sizeChart || null,
        engraving: finalProductData.engraving || null,
        availableMetals: finalProductData.availableMetals,
        stone: finalProductData.stone,
        media: finalProductData.media,
        stoneWeights: stoneWeights,  // Diamond, Gemstone, Pearl weights

        // NEW: Option config and availability map for frontend variant selection
        optionConfig: optionConfig,
        availabilityMap: availabilityMap,
      }

      const productResult = await db.query(
        `INSERT INTO products (
          name,
          slug,
          short_description,
          description,
          product_type,
          base_sku,
          style_sku,
          seo,
          metadata,
          status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'draft')
        RETURNING id`,
        [
          finalProductData.title,
          finalProductData.slug,
          finalProductData.shortDescription,
          finalProductData.description,
          finalProductData.type.code,
          finalProductData.productSku,
          finalProductData.styleSku,
          JSON.stringify(finalProductData.seo),
          JSON.stringify(productMetadata),
        ]
      )

      const productId = productResult.rows[0].id
      console.log('Step 1 complete: Product inserted', productId)

      // Step 2: Insert product_options
      const optionIds: Record<string, string> = {}

      // Metal Type option (always)
      const metalTypeOptionResult = await db.query(
        `INSERT INTO product_options (product_id, name, rank)
        VALUES ($1, $2, $3)
        RETURNING id`,
        [productId, 'metal_type', 1]
      )
      optionIds['metal_type'] = metalTypeOptionResult.rows[0].id

      // Metal Color option (always)
      const metalColorOptionResult = await db.query(
        `INSERT INTO product_options (product_id, name, rank)
        VALUES ($1, $2, $3)
        RETURNING id`,
        [productId, 'metal_color', 2]
      )
      optionIds['metal_color'] = metalColorOptionResult.rows[0].id

      // Metal Purity option (always)
      const metalPurityOptionResult = await db.query(
        `INSERT INTO product_options (product_id, name, rank)
        VALUES ($1, $2, $3)
        RETURNING id`,
        [productId, 'metal_purity', 3]
      )
      optionIds['metal_purity'] = metalPurityOptionResult.rows[0].id

      // Diamond Clarity/Color option (only if hasDiamond)
      if (data.stone.hasDiamond) {
        const diamondOptionResult = await db.query(
          `INSERT INTO product_options (product_id, name, rank)
          VALUES ($1, $2, $3)
          RETURNING id`,
          [productId, 'diamond_clarity_color', 4]
        )
        optionIds['diamond_clarity_color'] = diamondOptionResult.rows[0].id
      }

      // Gemstone Color option (only if hasGemstone)
      if (data.stone.hasGemstone) {
        const gemstoneOptionResult = await db.query(
          `INSERT INTO product_options (product_id, name, rank)
          VALUES ($1, $2, $3)
          RETURNING id`,
          [productId, 'gemstone_color', 5]
        )
        optionIds['gemstone_color'] = gemstoneOptionResult.rows[0].id
      }
      console.log('Step 2 complete: Product options inserted', optionIds)

      // Step 3: Insert product_option_values (batch insert)
      const optionValueMap: Record<string, string> = {}
      const optionValuesToInsert: { optionId: string; value: string }[] = []

      // From selectedMetals - metal types, colors, purities
      for (const metal of data.metal.selectedMetals) {
        optionValuesToInsert.push({ optionId: optionIds['metal_type'], value: metal.metalTypeId })
        for (const color of metal.colors) {
          optionValuesToInsert.push({ optionId: optionIds['metal_color'], value: color.colorId })
        }
        for (const purity of metal.purities) {
          optionValuesToInsert.push({ optionId: optionIds['metal_purity'], value: purity.purityId })
        }
      }

      // From diamond - clarity/colors
      if (data.stone.hasDiamond && data.stone.diamond) {
        for (const clarityColor of data.stone.diamond.clarityColors) {
          optionValuesToInsert.push({ optionId: optionIds['diamond_clarity_color'], value: clarityColor.id })
        }
      }

      // From gemstone - colors
      if (data.stone.hasGemstone && data.stone.gemstone) {
        for (const color of data.stone.gemstone.colors) {
          optionValuesToInsert.push({ optionId: optionIds['gemstone_color'], value: color.id })
        }
      }

      // Batch insert
      if (optionValuesToInsert.length > 0) {
        const placeholders: string[] = []
        const values: string[] = []

        for (let i = 0; i < optionValuesToInsert.length; i++) {
          const item = optionValuesToInsert[i]
          const idx = i * 2
          placeholders.push(`($${idx + 1}, $${idx + 2})`)
          values.push(item.optionId, item.value)
        }

        const result = await db.query(
          `INSERT INTO product_option_values (option_id, value)
          VALUES ${placeholders.join(', ')}
          RETURNING id, value`,
          values
        )

        for (const row of result.rows) {
          optionValueMap[row.value] = row.id
        }
      }
      console.log('Step 3 complete: Product option values inserted', Object.keys(optionValueMap).length)

      // Step 4: Insert product_variants (batch insert)
      const variantDbIds: { dbId: string; variant: any }[] = []

      if (finalProductData.variants.length > 0) {
        const placeholders: string[] = []
        const values: (string | number | boolean)[] = []

        for (let i = 0; i < finalProductData.variants.length; i++) {
          const variant = finalProductData.variants[i]
          const idx = i * 8

          // Calculate variant weights (metal varies, stones are constant)
          const metalGrams = variant.metalWeight
          const variantWeights: VariantWeights = {
            metal: {
              grams: metalGrams,
            },
            diamond: stoneWeights.diamond,
            gemstone: stoneWeights.gemstone,
            pearl: stoneWeights.pearl,
            total: {
              grams: metalGrams
                + (stoneWeights.diamond?.grams || 0)
                + (stoneWeights.gemstone?.grams || 0)
                + (stoneWeights.pearl?.grams || 0),
            },
          }

          const variantMetadata = {
            metalType: variant.metalType,
            metalColor: variant.metalColor,
            metalPurity: variant.metalPurity,
            metalWeight: variant.metalWeight,
            diamondClarityColor: variant.diamondClarityColor,
            gemstoneColor: variant.gemstoneColor,
            weights: variantWeights,
          }

          placeholders.push(`($${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4}, $${idx + 5}, $${idx + 6}, $${idx + 7}, $${idx + 8})`)
          values.push(
            productId,
            variant.sku,
            variant.pricingComponents.sellingPrice.finalPrice,
            variant.pricingComponents.compareAtPrice.finalPrice,
            variant.pricingComponents.costPrice.finalPrice,
            JSON.stringify(variant.pricingComponents),
            variant.isDefault,
            JSON.stringify(variantMetadata)
          )
        }

        const variantResult = await db.query(
          `INSERT INTO product_variants (product_id, sku, price, compare_at_price, cost_price, price_components, is_default, metadata)
          VALUES ${placeholders.join(', ')}
          RETURNING id`,
          values
        )

        // Map variant DB IDs to original variants (for Step 5)
        for (let i = 0; i < variantResult.rows.length; i++) {
          variantDbIds.push({
            dbId: variantResult.rows[i].id,
            variant: finalProductData.variants[i]
          })
        }
      }
      console.log('Step 4 complete: Product variants inserted', variantDbIds.length)

      // Step 5: Insert variant_option_values (junction - batch insert)
      const variantOptionValuesToInsert: { variantId: string; optionValueId: string }[] = []

      for (const { dbId, variant } of variantDbIds) {
        // Metal Type
        variantOptionValuesToInsert.push({ variantId: dbId, optionValueId: optionValueMap[variant.metalType] })

        // Metal Color
        variantOptionValuesToInsert.push({ variantId: dbId, optionValueId: optionValueMap[variant.metalColor] })

        // Metal Purity
        variantOptionValuesToInsert.push({ variantId: dbId, optionValueId: optionValueMap[variant.metalPurity] })

        // Diamond Clarity/Color (if applicable)
        if (variant.diamondClarityColor) {
          variantOptionValuesToInsert.push({ variantId: dbId, optionValueId: optionValueMap[variant.diamondClarityColor] })
        }

        // Gemstone Color (if applicable)
        if (variant.gemstoneColor) {
          variantOptionValuesToInsert.push({ variantId: dbId, optionValueId: optionValueMap[variant.gemstoneColor] })
        }
      }

      // Batch insert
      if (variantOptionValuesToInsert.length > 0) {
        const placeholders: string[] = []
        const values: string[] = []

        for (let i = 0; i < variantOptionValuesToInsert.length; i++) {
          const item = variantOptionValuesToInsert[i]
          const idx = i * 2
          placeholders.push(`($${idx + 1}, $${idx + 2})`)
          values.push(item.variantId, item.optionValueId)
        }

        await db.query(
          `INSERT INTO variant_option_values (variant_id, option_value_id)
          VALUES ${placeholders.join(', ')}`,
          values
        )
      }
      console.log('Step 5 complete: Variant option values inserted')

      // Step 6: Insert product_categories (junction - batch insert)
      if (finalProductData.attributes.categories.length > 0) {
        const placeholders: string[] = []
        const values: (string | boolean)[] = []

        for (let i = 0; i < finalProductData.attributes.categories.length; i++) {
          const category = finalProductData.attributes.categories[i]
          const idx = i * 3
          placeholders.push(`($${idx + 1}, $${idx + 2}, $${idx + 3})`)
          values.push(productId, category.id, i === 0) // First category is primary
        }

        await db.query(
          `INSERT INTO product_categories (product_id, category_id, is_primary)
          VALUES ${placeholders.join(', ')}`,
          values
        )
      }
      console.log('Step 6 complete: Product categories inserted')

      // Step 7: Insert product_tags (junction - batch insert)
      // Combine user tags and system tags
      const userTagIds = finalProductData.attributes.tags.map((t: { id: string }) => t.id)
      const allTagIds = [...userTagIds, ...finalProductData.systemTags]

      if (allTagIds.length > 0) {
        const placeholders: string[] = []
        const values: string[] = []

        for (let i = 0; i < allTagIds.length; i++) {
          const idx = i * 2
          placeholders.push(`($${idx + 1}, $${idx + 2})`)
          values.push(productId, allTagIds[i])
        }

        await db.query(
          `INSERT INTO product_tags (product_id, tag_id)
          VALUES ${placeholders.join(', ')}`,
          values
        )
      }
      console.log('Step 7 complete: Product tags inserted')

      // Step 8: Insert product_badges (junction - batch insert)
      if (finalProductData.attributes.badges.length > 0) {
        const placeholders: string[] = []
        const values: string[] = []

        for (let i = 0; i < finalProductData.attributes.badges.length; i++) {
          const badge = finalProductData.attributes.badges[i]
          const idx = i * 2
          placeholders.push(`($${idx + 1}, $${idx + 2})`)
          values.push(productId, badge.id)
        }

        await db.query(
          `INSERT INTO product_badges (product_id, badge_id)
          VALUES ${placeholders.join(', ')}`,
          values
        )
      }
      console.log('Step 8 complete: Product badges inserted')

      // Step 9: Update product with variant info
      const defaultVariant = variantDbIds.find(v => v.variant.isDefault)
      const variantPrices = finalProductData.variants.map((v: any) => v.pricingComponents.sellingPrice.finalPrice)
      const minPrice = Math.min(...variantPrices)
      const maxPrice = Math.max(...variantPrices)

      await db.query(
        `UPDATE products
        SET default_variant_id = $1, min_price = $2, max_price = $3, variant_count = $4
        WHERE id = $5`,
        [defaultVariant?.dbId || null, minPrice, maxPrice, variantDbIds.length, productId]
      )
      console.log('Step 9 complete: Product updated with variant info')

      return { productId }
    } catch (error) {
      throw error
    }
  }

  /**
   * Update basic details for a jewellery-default product
   *
   * Updates:
   * - products table: name, slug, short_description, description, base_sku, style_sku
   * - products.metadata: dimensions, sizeChart, engraving
   * - product_variants.sku: if base_sku changed, update all variant SKUs
   */
  async updateBasicDetails(productId: string, data: JewelleryDefaultUpdateBasicInput) {
    try {
      // Get existing product with current values
      const productResult = await db.query(
        'SELECT id, slug, base_sku, metadata FROM products WHERE id = $1',
        [productId]
      )

      if (productResult.rows.length === 0) {
        throw new AppError(productMessages.NOT_FOUND, 404)
      }

      const existingProduct = productResult.rows[0]
      const existingMetadata = existingProduct.metadata || {}
      const slugChanged = existingProduct.slug !== data.slug
      const skuChanged = existingProduct.base_sku !== data.productSku

      // Check slug uniqueness only if slug changed
      if (slugChanged) {
        const slugCheck = await db.query(
          'SELECT id FROM products WHERE slug = $1 AND id != $2',
          [data.slug, productId]
        )

        if (slugCheck.rows.length > 0) {
          throw new AppError(productMessages.SLUG_EXISTS, 409)
        }
      }

      // Check SKU uniqueness only if SKU changed
      if (skuChanged) {
        const skuCheck = await db.query(
          'SELECT id FROM products WHERE base_sku = $1 AND id != $2',
          [data.productSku, productId]
        )

        if (skuCheck.rows.length > 0) {
          throw new AppError(productMessages.SKU_EXISTS, 409)
        }
      }

      // Build updated metadata (preserve existing fields, update basic details fields)
      const updatedMetadata = {
        ...existingMetadata,
        dimensions: data.dimensions,
        sizeChart: data.sizeChart.hasSizeChart
          ? {
              hasSizeChart: true,
              sizeChartGroupId: data.sizeChart.sizeChartGroupId,
            }
          : null,
        engraving: data.engraving.hasEngraving
          ? {
              hasEngraving: true,
              maxCharacters: data.engraving.maxChars,
            }
          : null,
      }

      // Update product
      const updateResult = await db.query(
        `UPDATE products
        SET
          name = $1,
          slug = $2,
          short_description = $3,
          description = $4,
          base_sku = $5,
          style_sku = $6,
          metadata = $7,
          updated_at = NOW()
        WHERE id = $8
        RETURNING id, name, slug, base_sku, style_sku, updated_at`,
        [
          data.title,
          data.slug,
          data.shortDescription || null,
          data.description || null,
          data.productSku,
          data.styleSku || null,
          JSON.stringify(updatedMetadata),
          productId,
        ]
      )

      if (updateResult.rows.length === 0) {
        throw new AppError(productMessages.NOT_FOUND, 404)
      }

      // If base_sku changed, update all variant SKUs
      // Variant SKU pattern: base_sku-metalType-metalColor-metalPurity[-diamondClarityColor][-gemstoneColor]
      if (skuChanged && existingProduct.base_sku && data.productSku) {
        const oldSku = existingProduct.base_sku
        const newSku = data.productSku

        // Update variant SKUs by replacing the old base_sku prefix with new one
        // Only update variants whose SKU starts with the old base_sku
        await db.query(
          `UPDATE product_variants
          SET sku = $1 || SUBSTRING(sku, LENGTH($2) + 1)
          WHERE product_id = $3 AND sku LIKE $2 || '%'`,
          [newSku, oldSku, productId]
        )
      }

      return {
        id: updateResult.rows[0].id,
        title: updateResult.rows[0].name,
        slug: updateResult.rows[0].slug,
        productSku: updateResult.rows[0].base_sku,
        styleSku: updateResult.rows[0].style_sku,
        updatedAt: updateResult.rows[0].updated_at,
      }
    } catch (error) {
      throw error
    }
  }

  /**
   * Update product attributes (categories, tags, badges)
   * Simple approach: Delete all and re-insert
   * Preserves system-generated tags
   */
  async updateAttributes(productId: string, data: JewelleryDefaultUpdateAttributesInput) {
    try {
      // 1. Verify product exists
      const productResult = await db.query(
        'SELECT id FROM products WHERE id = $1',
        [productId]
      )

      if (productResult.rows.length === 0) {
        throw new AppError(productMessages.NOT_FOUND, 404)
      }

      // 2. Update categories (delete all and re-insert)
      await db.query('DELETE FROM product_categories WHERE product_id = $1', [productId])

      if (data.categories.length > 0) {
        const categoryValues = data.categories
          .map((_, i) => `($1, $${i * 2 + 2}, $${i * 2 + 3})`)
          .join(', ')
        const categoryParams: (string | boolean)[] = [productId]
        data.categories.forEach((cat) => {
          categoryParams.push(cat.categoryId, cat.isPrimary)
        })

        await db.query(
          `INSERT INTO product_categories (product_id, category_id, is_primary)
           VALUES ${categoryValues}`,
          categoryParams
        )
      }

      // 3. Update tags (only user-selected tags, preserve system-generated)
      // Delete only user-selected (non-system) tags
      await db.query(
        `DELETE FROM product_tags
         WHERE product_id = $1
         AND tag_id IN (
           SELECT t.id FROM tags t WHERE t.is_system_generated = false
         )`,
        [productId]
      )

      // Insert new user-selected tags
      if (data.tagIds.length > 0) {
        const tagValues = data.tagIds.map((_, i) => `($1, $${i + 2})`).join(', ')
        await db.query(
          `INSERT INTO product_tags (product_id, tag_id)
           VALUES ${tagValues}`,
          [productId, ...data.tagIds]
        )
      }

      // 4. Update badges (delete all and re-insert)
      await db.query('DELETE FROM product_badges WHERE product_id = $1', [productId])

      if (data.badgeIds.length > 0) {
        const badgeValues = data.badgeIds.map((_, i) => `($1, $${i + 2})`).join(', ')
        await db.query(
          `INSERT INTO product_badges (product_id, badge_id)
           VALUES ${badgeValues}`,
          [productId, ...data.badgeIds]
        )
      }

      // 5. Update product's updated_at timestamp
      await db.query('UPDATE products SET updated_at = NOW() WHERE id = $1', [productId])

      return {
        id: productId,
        categoriesCount: data.categories.length,
        tagsCount: data.tagIds.length,
        badgesCount: data.badgeIds.length,
      }
    } catch (error) {
      throw error
    }
  }

  /**
   * Update product SEO fields
   */
  async updateSeo(productId: string, data: JewelleryDefaultUpdateSeoInput) {
    try {
      // 1. Verify product exists and get current SEO
      const productResult = await db.query(
        'SELECT id, seo FROM products WHERE id = $1',
        [productId]
      )

      if (productResult.rows.length === 0) {
        throw new AppError(productMessages.NOT_FOUND, 404)
      }

      const existingSeo = productResult.rows[0].seo || {}

      // 2. Merge with existing SEO data
      const seo = { ...existingSeo, ...data }

      // 3. Remove null values to clean up the SEO object
      Object.keys(seo).forEach((key) => {
        if (seo[key as keyof typeof seo] === null) {
          delete seo[key as keyof typeof seo]
        }
      })

      // 4. Update SEO and updated_at timestamp
      await db.query(
        'UPDATE products SET seo = $1, updated_at = NOW() WHERE id = $2',
        [seo, productId]
      )

      return { id: productId, seo }
    } catch (error) {
      throw error
    }
  }

  /**
   * Update product media
   * Updates the media field in product.metadata
   */
  async updateMedia(productId: string, data: JewelleryDefaultUpdateMediaInput) {
    try {
      // 1. Verify product exists and get current metadata
      const productResult = await db.query(
        'SELECT id, metadata FROM products WHERE id = $1',
        [productId]
      )

      if (productResult.rows.length === 0) {
        throw new AppError(productMessages.NOT_FOUND, 404)
      }

      const existingMetadata = productResult.rows[0].metadata || {}

      // 2. Update metadata with new media data
      const updatedMetadata = {
        ...existingMetadata,
        media: data,
      }

      // 3. Update product metadata and updated_at timestamp
      const updateResult = await db.query(
        `UPDATE products
         SET metadata = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING id, updated_at`,
        [JSON.stringify(updatedMetadata), productId]
      )

      return {
        id: updateResult.rows[0].id,
        updated_at: updateResult.rows[0].updated_at,
      }
    } catch (error) {
      throw error
    }
  }

  /**
   * Update product options (metal, stone, variants, media)
   * Uses full regeneration: delete all existing options/variants and recreate
   */
  async updateOptions(productId: string, data: JewelleryDefaultUpdateOptionsInput) {
    try {
      // 1. Verify product exists and get current data
      const productResult = await db.query(
        'SELECT id, base_sku, metadata, status FROM products WHERE id = $1',
        [productId]
      )

      if (productResult.rows.length === 0) {
        throw new AppError(productMessages.NOT_FOUND, 404)
      }

      const existingProduct = productResult.rows[0]
      const existingMetadata = existingProduct.metadata || {}

      // 2. Validate variants against metal and stone
      const { validatedVariants } = this.validateVariants(
        data.metal,
        data.stone,
        data.variants
      )

      // 3. Fetch master data
      const masterData = await this.fetchMasterData()

      // 4. Validate metal data (same as create)
      for (const selectedMetal of data.metal.selectedMetals) {
        const metalType = masterData.metalTypes.find(m => m.id === selectedMetal.metalTypeId)
        if (!metalType) {
          throw new AppError(`Invalid metal type ID: ${selectedMetal.metalTypeId}`, 400)
        }

        for (const color of selectedMetal.colors) {
          const metalColor = masterData.metalColors.find(c => c.id === color.colorId)
          if (!metalColor) {
            throw new AppError(`Invalid metal color ID: ${color.colorId}`, 400)
          }
          if (metalColor.metal_type_id !== selectedMetal.metalTypeId) {
            throw new AppError(
              `Metal color ${color.colorId} does not belong to metal type ${selectedMetal.metalTypeId}`,
              400
            )
          }
        }

        for (const purity of selectedMetal.purities) {
          const metalPurity = masterData.metalPurities.find(p => p.id === purity.purityId)
          if (!metalPurity) {
            throw new AppError(`Invalid metal purity ID: ${purity.purityId}`, 400)
          }
          if (metalPurity.metal_type_id !== selectedMetal.metalTypeId) {
            throw new AppError(
              `Metal purity ${purity.purityId} does not belong to metal type ${selectedMetal.metalTypeId}`,
              400
            )
          }
        }
      }

      // 5. Validate stone data (same as create)
      if (data.stone.hasDiamond && data.stone.diamond) {
        for (const clarityColor of data.stone.diamond.clarityColors) {
          const diamondClarityColor = masterData.diamondClarityColors.find(d => d.id === clarityColor.id)
          if (!diamondClarityColor) {
            throw new AppError(`Invalid diamond clarity/color ID: ${clarityColor.id}`, 400)
          }
        }

        for (const entry of data.stone.diamond.entries) {
          const stoneShape = masterData.stoneShapes.find(s => s.id === entry.shapeId)
          if (!stoneShape) {
            throw new AppError(`Invalid stone shape ID: ${entry.shapeId}`, 400)
          }

          for (const pricing of entry.pricings) {
            const stonePricing = masterData.stonePricings.find(p => p.id === pricing.pricingId)
            if (!stonePricing) {
              throw new AppError(`Invalid diamond pricing ID: ${pricing.pricingId}`, 400)
            }
          }
        }
      }

      if (data.stone.hasGemstone && data.stone.gemstone) {
        const gemstoneQuality = masterData.gemstoneQualities.find(q => q.id === data.stone.gemstone!.qualityId)
        if (!gemstoneQuality) {
          throw new AppError(`Invalid gemstone quality ID: ${data.stone.gemstone.qualityId}`, 400)
        }

        for (const color of data.stone.gemstone.colors) {
          const gemstoneColor = masterData.gemstoneColors.find(c => c.id === color.id)
          if (!gemstoneColor) {
            throw new AppError(`Invalid gemstone color ID: ${color.id}`, 400)
          }
        }

        for (const entry of data.stone.gemstone.entries) {
          const gemstoneType = masterData.gemstoneTypes.find(t => t.id === entry.typeId)
          if (!gemstoneType) {
            throw new AppError(`Invalid gemstone type ID: ${entry.typeId}`, 400)
          }

          const stoneShape = masterData.stoneShapes.find(s => s.id === entry.shapeId)
          if (!stoneShape) {
            throw new AppError(`Invalid stone shape ID: ${entry.shapeId}`, 400)
          }

          for (const pricing of entry.pricings) {
            const stonePricing = masterData.stonePricings.find(p => p.id === pricing.pricingId)
            if (!stonePricing) {
              throw new AppError(`Invalid gemstone pricing ID: ${pricing.pricingId}`, 400)
            }
          }
        }
      }

      if (data.stone.hasPearl && data.stone.pearl) {
        for (const entry of data.stone.pearl.entries) {
          const pearlType = masterData.pearlTypes.find(t => t.id === entry.typeId)
          if (!pearlType) {
            throw new AppError(`Invalid pearl type ID: ${entry.typeId}`, 400)
          }

          const pearlQuality = masterData.pearlQualities.find(q => q.id === entry.qualityId)
          if (!pearlQuality) {
            throw new AppError(`Invalid pearl quality ID: ${entry.qualityId}`, 400)
          }
        }
      }

      // 6. Process variants and calculate prices (reuse logic from create)
      const processedVariants = this.processVariantsForUpdate(
        validatedVariants,
        data,
        masterData,
        existingProduct.base_sku
      )

      // 7. Calculate stone weights
      const stoneWeights = this.calculateStoneWeights(data.stone)

      // 8. Build optionConfig and availabilityMap
      const optionConfig = this.buildOptionConfig(masterData, {
        ...data,
        productType: 'JEWELLERY_DEFAULT',
        basic: existingMetadata.basic || {},
        seo: existingMetadata.seo || {},
        attributes: existingMetadata.attributes || { badges: [], categories: [], tags: [] },
      } as JewelleryDefaultCreateInput)

      const availabilityMap = this.buildAvailabilityMap(
        processedVariants,
        data.stone.hasDiamond,
        data.stone.hasGemstone
      )

      // 9. Collect system tag IDs
      const sourceIds: string[] = []

      for (const selectedMetal of data.metal.selectedMetals) {
        sourceIds.push(selectedMetal.metalTypeId)
        for (const color of selectedMetal.colors) {
          sourceIds.push(color.colorId)
        }
        for (const purity of selectedMetal.purities) {
          sourceIds.push(purity.purityId)
        }
      }

      if (data.stone.hasDiamond && data.stone.diamond) {
        for (const clarityColor of data.stone.diamond.clarityColors) {
          sourceIds.push(clarityColor.id)
        }
        for (const entry of data.stone.diamond.entries) {
          sourceIds.push(entry.shapeId)
        }
      }

      if (data.stone.hasGemstone && data.stone.gemstone) {
        sourceIds.push(data.stone.gemstone.qualityId)
        for (const color of data.stone.gemstone.colors) {
          sourceIds.push(color.id)
        }
        for (const entry of data.stone.gemstone.entries) {
          sourceIds.push(entry.typeId)
          sourceIds.push(entry.shapeId)
        }
      }

      if (data.stone.hasPearl && data.stone.pearl) {
        for (const entry of data.stone.pearl.entries) {
          sourceIds.push(entry.typeId)
          sourceIds.push(entry.qualityId)
        }
      }

      const systemTagIds: string[] = []
      for (const tag of masterData.tags) {
        if (tag.source_id && sourceIds.includes(tag.source_id)) {
          systemTagIds.push(tag.id)
        }
      }

      // ===== DELETE EXISTING DATA =====
      console.log('Deleting existing options/variants for product:', productId)

      // Delete variant_option_values
      await db.query(
        `DELETE FROM variant_option_values
         WHERE variant_id IN (SELECT id FROM product_variants WHERE product_id = $1)`,
        [productId]
      )

      // Delete product_variants
      await db.query(
        'DELETE FROM product_variants WHERE product_id = $1',
        [productId]
      )

      // Delete product_option_values
      await db.query(
        `DELETE FROM product_option_values
         WHERE option_id IN (SELECT id FROM product_options WHERE product_id = $1)`,
        [productId]
      )

      // Delete product_options
      await db.query(
        'DELETE FROM product_options WHERE product_id = $1',
        [productId]
      )

      // Delete system-generated tags from product_tags
      await db.query(
        `DELETE FROM product_tags
         WHERE product_id = $1
         AND tag_id IN (SELECT id FROM tags WHERE is_system_generated = true)`,
        [productId]
      )

      console.log('Deleted existing data, now inserting new data')

      // ===== INSERT NEW DATA =====

      // Insert product_options
      const optionIds: Record<string, string> = {}

      const metalTypeOptionResult = await db.query(
        `INSERT INTO product_options (product_id, name, rank)
        VALUES ($1, $2, $3)
        RETURNING id`,
        [productId, 'metal_type', 1]
      )
      optionIds['metal_type'] = metalTypeOptionResult.rows[0].id

      const metalColorOptionResult = await db.query(
        `INSERT INTO product_options (product_id, name, rank)
        VALUES ($1, $2, $3)
        RETURNING id`,
        [productId, 'metal_color', 2]
      )
      optionIds['metal_color'] = metalColorOptionResult.rows[0].id

      const metalPurityOptionResult = await db.query(
        `INSERT INTO product_options (product_id, name, rank)
        VALUES ($1, $2, $3)
        RETURNING id`,
        [productId, 'metal_purity', 3]
      )
      optionIds['metal_purity'] = metalPurityOptionResult.rows[0].id

      if (data.stone.hasDiamond) {
        const diamondOptionResult = await db.query(
          `INSERT INTO product_options (product_id, name, rank)
          VALUES ($1, $2, $3)
          RETURNING id`,
          [productId, 'diamond_clarity_color', 4]
        )
        optionIds['diamond_clarity_color'] = diamondOptionResult.rows[0].id
      }

      if (data.stone.hasGemstone) {
        const gemstoneOptionResult = await db.query(
          `INSERT INTO product_options (product_id, name, rank)
          VALUES ($1, $2, $3)
          RETURNING id`,
          [productId, 'gemstone_color', 5]
        )
        optionIds['gemstone_color'] = gemstoneOptionResult.rows[0].id
      }

      // Insert product_option_values
      const optionValueMap: Record<string, string> = {}
      const optionValuesToInsert: { optionId: string; value: string }[] = []

      for (const metal of data.metal.selectedMetals) {
        optionValuesToInsert.push({ optionId: optionIds['metal_type'], value: metal.metalTypeId })
        for (const color of metal.colors) {
          optionValuesToInsert.push({ optionId: optionIds['metal_color'], value: color.colorId })
        }
        for (const purity of metal.purities) {
          optionValuesToInsert.push({ optionId: optionIds['metal_purity'], value: purity.purityId })
        }
      }

      if (data.stone.hasDiamond && data.stone.diamond) {
        for (const clarityColor of data.stone.diamond.clarityColors) {
          optionValuesToInsert.push({ optionId: optionIds['diamond_clarity_color'], value: clarityColor.id })
        }
      }

      if (data.stone.hasGemstone && data.stone.gemstone) {
        for (const color of data.stone.gemstone.colors) {
          optionValuesToInsert.push({ optionId: optionIds['gemstone_color'], value: color.id })
        }
      }

      if (optionValuesToInsert.length > 0) {
        const placeholders: string[] = []
        const values: string[] = []

        for (let i = 0; i < optionValuesToInsert.length; i++) {
          const item = optionValuesToInsert[i]
          const idx = i * 2
          placeholders.push(`($${idx + 1}, $${idx + 2})`)
          values.push(item.optionId, item.value)
        }

        const result = await db.query(
          `INSERT INTO product_option_values (option_id, value)
          VALUES ${placeholders.join(', ')}
          RETURNING id, value`,
          values
        )

        for (const row of result.rows) {
          optionValueMap[row.value] = row.id
        }
      }

      // Insert product_variants
      const variantDbIds: { dbId: string; variant: any }[] = []

      if (processedVariants.length > 0) {
        const placeholders: string[] = []
        const values: (string | number | boolean)[] = []

        for (let i = 0; i < processedVariants.length; i++) {
          const variant = processedVariants[i]
          const idx = i * 8

          const metalGrams = variant.metalWeight
          const variantWeights: VariantWeights = {
            metal: { grams: metalGrams },
            diamond: stoneWeights.diamond,
            gemstone: stoneWeights.gemstone,
            pearl: stoneWeights.pearl,
            total: {
              grams: metalGrams
                + (stoneWeights.diamond?.grams || 0)
                + (stoneWeights.gemstone?.grams || 0)
                + (stoneWeights.pearl?.grams || 0),
            },
          }

          const variantMetadata = {
            metalType: variant.metalType,
            metalColor: variant.metalColor,
            metalPurity: variant.metalPurity,
            metalWeight: variant.metalWeight,
            diamondClarityColor: variant.diamondClarityColor,
            gemstoneColor: variant.gemstoneColor,
            weights: variantWeights,
          }

          placeholders.push(`($${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4}, $${idx + 5}, $${idx + 6}, $${idx + 7}, $${idx + 8})`)
          values.push(
            productId,
            variant.sku,
            variant.pricingComponents.sellingPrice.finalPrice,
            variant.pricingComponents.compareAtPrice.finalPrice,
            variant.pricingComponents.costPrice.finalPrice,
            JSON.stringify(variant.pricingComponents),
            variant.isDefault,
            JSON.stringify(variantMetadata)
          )
        }

        const variantResult = await db.query(
          `INSERT INTO product_variants (product_id, sku, price, compare_at_price, cost_price, price_components, is_default, metadata)
          VALUES ${placeholders.join(', ')}
          RETURNING id`,
          values
        )

        for (let i = 0; i < variantResult.rows.length; i++) {
          variantDbIds.push({
            dbId: variantResult.rows[i].id,
            variant: processedVariants[i]
          })
        }
      }

      // Insert variant_option_values
      const variantOptionValuesToInsert: { variantId: string; optionValueId: string }[] = []

      for (const { dbId, variant } of variantDbIds) {
        variantOptionValuesToInsert.push({ variantId: dbId, optionValueId: optionValueMap[variant.metalType] })
        variantOptionValuesToInsert.push({ variantId: dbId, optionValueId: optionValueMap[variant.metalColor] })
        variantOptionValuesToInsert.push({ variantId: dbId, optionValueId: optionValueMap[variant.metalPurity] })

        if (variant.diamondClarityColor) {
          variantOptionValuesToInsert.push({ variantId: dbId, optionValueId: optionValueMap[variant.diamondClarityColor] })
        }

        if (variant.gemstoneColor) {
          variantOptionValuesToInsert.push({ variantId: dbId, optionValueId: optionValueMap[variant.gemstoneColor] })
        }
      }

      if (variantOptionValuesToInsert.length > 0) {
        const placeholders: string[] = []
        const values: string[] = []

        for (let i = 0; i < variantOptionValuesToInsert.length; i++) {
          const item = variantOptionValuesToInsert[i]
          const idx = i * 2
          placeholders.push(`($${idx + 1}, $${idx + 2})`)
          values.push(item.variantId, item.optionValueId)
        }

        await db.query(
          `INSERT INTO variant_option_values (variant_id, option_value_id)
          VALUES ${placeholders.join(', ')}`,
          values
        )
      }

      // Insert system tags
      if (systemTagIds.length > 0) {
        const tagPlaceholders: string[] = []
        const tagValues: string[] = []

        for (let i = 0; i < systemTagIds.length; i++) {
          const idx = i * 2
          tagPlaceholders.push(`($${idx + 1}, $${idx + 2})`)
          tagValues.push(productId, systemTagIds[i])
        }

        await db.query(
          `INSERT INTO product_tags (product_id, tag_id)
          VALUES ${tagPlaceholders.join(', ')}`,
          tagValues
        )
      }

      // ===== UPDATE PRODUCT =====

      // Build updated metadata
      const updatedMetadata = {
        ...existingMetadata,
        availableMetals: data.metal.selectedMetals,
        stone: data.stone,
        stoneWeights,
        optionConfig,
        availabilityMap,
        media: data.media,
      }

      // Calculate min/max prices
      const variantPrices = processedVariants.map((v: any) => v.pricingComponents.sellingPrice.finalPrice)
      const minPrice = Math.min(...variantPrices)
      const maxPrice = Math.max(...variantPrices)

      // Get new default variant ID
      const defaultVariant = variantDbIds.find(v => v.variant.isDefault)

      // Update product (status remains unchanged)
      await db.query(
        `UPDATE products
         SET metadata = $1,
             min_price = $2,
             max_price = $3,
             variant_count = $4,
             default_variant_id = $5,
             updated_at = NOW()
         WHERE id = $6`,
        [
          JSON.stringify(updatedMetadata),
          minPrice,
          maxPrice,
          variantDbIds.length,
          defaultVariant?.dbId || null,
          productId
        ]
      )

      console.log('Product options updated successfully:', productId)

      return {
        id: productId,
        variantCount: variantDbIds.length,
        minPrice,
        maxPrice,
      }
    } catch (error) {
      throw error
    }
  }

  /**
   * Process variants for update (calculate prices)
   * Similar to the logic in create() but extracted for reuse
   */
  private processVariantsForUpdate(
    validatedVariants: GeneratedVariant[],
    data: JewelleryDefaultUpdateOptionsInput,
    masterData: MasterData,
    baseSku: string
  ) {
    const mrpMarkup = masterData.mrpMarkup
    if (!mrpMarkup) {
      throw new AppError('MRP Markup master data not found', 500)
    }

    return validatedVariants.map(variant => {
      const pricingComponents: any = {
        costPrice: {},
        sellingPrice: {},
        compareAtPrice: {}
      }

      const metalTypeId = variant.metalType.id
      const metalColorId = variant.metalColor.id
      const metalPurityId = variant.metalPurity.id
      const metalWeight = variant.metalPurity.weight

      const metalType = masterData.metalTypes.find(m => m.id === metalTypeId)!
      const metalColor = masterData.metalColors.find(c => c.id === metalColorId)!
      const metalPurity = masterData.metalPurities.find(p => p.id === metalPurityId)!

      // 1. Metal Price
      const metalCostPrice = Math.round(metalPurity.price * metalWeight)
      const metalSellingPrice = metalCostPrice
      const metalCompareAtPrice = metalCostPrice

      pricingComponents.costPrice.metalPrice = metalCostPrice
      pricingComponents.sellingPrice.metalPrice = metalSellingPrice
      pricingComponents.compareAtPrice.metalPrice = metalCompareAtPrice

      // 2. Making Charge
      const makingCharge = masterData.makingCharges.find(
        mc => mc.metal_type_id === metalTypeId && metalWeight >= mc.from && metalWeight <= mc.to
      )
      if (!makingCharge) {
        throw new AppError(`No making charge found for metal type ${metalTypeId} and weight ${metalWeight}`, 400)
      }

      let baseMakingCharge = 0
      if (makingCharge.is_fixed_pricing) {
        baseMakingCharge = Math.round((metalWeight * makingCharge.amount) * CURRENCY_CONFIG.subunits)
      } else {
        baseMakingCharge = Math.round((makingCharge.amount / 100) * metalCostPrice)
      }

      let totalOtherCharges = 0
      for (const otherCharge of masterData.otherCharges) {
        totalOtherCharges += otherCharge.amount
      }

      const makingChargeCostPrice = baseMakingCharge + totalOtherCharges

      // Apply pricing rule markup for making charge
      let makingChargeRuleMarkupAmount = 0
      for (const rule of masterData.pricingRules) {
        if (rule.actions.makingChargeMarkup && rule.actions.makingChargeMarkup > 0 && rule.product_type === PRODUCT_TYPES.JEWELLERY_DEFAULT.code) {
          if (this.matchesPricingRuleConditionsForUpdate(rule.conditions, data, variant)) {
            const ruleMarkupAmount = Math.round(makingChargeCostPrice * (rule.actions.makingChargeMarkup / 100))
            makingChargeRuleMarkupAmount += ruleMarkupAmount
          }
        }
      }

      const makingChargeSellingPrice = makingChargeCostPrice + makingChargeRuleMarkupAmount
      const makingChargeCompareAtPrice = Math.round(makingChargeSellingPrice * (1 + (mrpMarkup.making_charge / 100)))

      pricingComponents.costPrice.makingCharge = makingChargeCostPrice
      pricingComponents.sellingPrice.makingCharge = makingChargeSellingPrice
      pricingComponents.compareAtPrice.makingCharge = makingChargeCompareAtPrice

      // 3. Diamond Price
      let diamondCostPrice = 0
      if (data.stone.hasDiamond && data.stone.diamond) {
        const variantDiamondClarityColorId = variant.diamondClarityColor?.id
        if (variantDiamondClarityColorId) {
          for (const entry of data.stone.diamond.entries) {
            const pricingIndex = entry.pricings.findIndex(p => p.clarityColorId === variantDiamondClarityColorId)
            if (pricingIndex !== -1) {
              const pricingId = entry.pricings[pricingIndex].pricingId
              const diamondStonePricing = masterData.stonePricings.find(sp => sp.id === pricingId)
              if (diamondStonePricing) {
                diamondCostPrice += Math.round(diamondStonePricing.price * entry.totalCarat)
              }
            }
          }
        }
      }

      let diamondRuleMarkupAmount = 0
      for (const rule of masterData.pricingRules) {
        if (rule.actions.diamondMarkup && rule.actions.diamondMarkup > 0 && rule.product_type === PRODUCT_TYPES.JEWELLERY_DEFAULT.code) {
          if (this.matchesPricingRuleConditionsForUpdate(rule.conditions, data, variant)) {
            const ruleMarkupAmount = Math.round(diamondCostPrice * (rule.actions.diamondMarkup / 100))
            diamondRuleMarkupAmount += ruleMarkupAmount
          }
        }
      }

      const diamondSellingPrice = diamondCostPrice + diamondRuleMarkupAmount
      const diamondCompareAtPrice = Math.round(diamondSellingPrice * (1 + (mrpMarkup.diamond / 100)))

      pricingComponents.costPrice.diamondPrice = diamondCostPrice
      pricingComponents.sellingPrice.diamondPrice = diamondSellingPrice
      pricingComponents.compareAtPrice.diamondPrice = diamondCompareAtPrice

      // 4. Gemstone Price
      let gemstoneCostPrice = 0
      if (data.stone.hasGemstone && data.stone.gemstone) {
        const variantGemstoneColorId = variant.gemstoneColor?.id
        if (variantGemstoneColorId) {
          const gemstoneQualityId = data.stone.gemstone.qualityId
          for (const entry of data.stone.gemstone.entries) {
            const pricingIndex = entry.pricings.findIndex(p => p.colorId === variantGemstoneColorId)
            if (pricingIndex !== -1) {
              const pricingId = entry.pricings[pricingIndex].pricingId
              const gemstoneStonePricing = masterData.stonePricings.find(sp => sp.id === pricingId)
              if (gemstoneStonePricing) {
                gemstoneCostPrice += Math.round(gemstoneStonePricing.price * entry.totalCarat)
              }
            }
          }
        }
      }

      let gemstoneRuleMarkupAmount = 0
      for (const rule of masterData.pricingRules) {
        if (rule.actions.gemstoneMarkup && rule.actions.gemstoneMarkup > 0 && rule.product_type === PRODUCT_TYPES.JEWELLERY_DEFAULT.code) {
          if (this.matchesPricingRuleConditionsForUpdate(rule.conditions, data, variant)) {
            const ruleMarkupAmount = Math.round(gemstoneCostPrice * (rule.actions.gemstoneMarkup / 100))
            gemstoneRuleMarkupAmount += ruleMarkupAmount
          }
        }
      }

      const gemstoneSellingPrice = gemstoneCostPrice + gemstoneRuleMarkupAmount
      const gemstoneCompareAtPrice = Math.round(gemstoneSellingPrice * (1 + (mrpMarkup.gemstone / 100)))

      pricingComponents.costPrice.gemstonePrice = gemstoneCostPrice
      pricingComponents.sellingPrice.gemstonePrice = gemstoneSellingPrice
      pricingComponents.compareAtPrice.gemstonePrice = gemstoneCompareAtPrice

      // 5. Pearl Price
      let pearlCostPrice = 0
      if (data.stone.hasPearl && data.stone.pearl) {
        for (const entry of data.stone.pearl.entries) {
          pearlCostPrice += entry.amount * CURRENCY_CONFIG.subunits
        }
      }

      let pearlRuleMarkupAmount = 0
      for (const rule of masterData.pricingRules) {
        if (rule.actions.pearlMarkup && rule.actions.pearlMarkup > 0 && rule.product_type === PRODUCT_TYPES.JEWELLERY_DEFAULT.code) {
          if (this.matchesPricingRuleConditionsForUpdate(rule.conditions, data, variant)) {
            const ruleMarkupAmount = Math.round(pearlCostPrice * (rule.actions.pearlMarkup / 100))
            pearlRuleMarkupAmount += ruleMarkupAmount
          }
        }
      }

      const pearlSellingPrice = pearlCostPrice + pearlRuleMarkupAmount
      const pearlCompareAtPrice = Math.round(pearlSellingPrice * (1 + (mrpMarkup.pearl / 100)))

      pricingComponents.costPrice.pearlPrice = pearlCostPrice
      pricingComponents.sellingPrice.pearlPrice = pearlSellingPrice
      pricingComponents.compareAtPrice.pearlPrice = pearlCompareAtPrice

      // 6. Final Price Without Tax
      const costFinalWithoutTax = metalCostPrice + makingChargeCostPrice + diamondCostPrice + gemstoneCostPrice + pearlCostPrice
      const sellingFinalWithoutTax = metalSellingPrice + makingChargeSellingPrice + diamondSellingPrice + gemstoneSellingPrice + pearlSellingPrice
      const compareAtFinalWithoutTax = metalCompareAtPrice + makingChargeCompareAtPrice + diamondCompareAtPrice + gemstoneCompareAtPrice + pearlCompareAtPrice

      pricingComponents.costPrice.finalPriceWithoutTax = costFinalWithoutTax
      pricingComponents.sellingPrice.finalPriceWithoutTax = sellingFinalWithoutTax
      pricingComponents.compareAtPrice.finalPriceWithoutTax = compareAtFinalWithoutTax

      // 7. Tax and Final Price
      if (CURRENCY_CONFIG.includeTax) {
        const costTaxAmount = Math.round(costFinalWithoutTax * (CURRENCY_CONFIG.taxRatePercent / 100))
        const sellingTaxAmount = Math.round(sellingFinalWithoutTax * (CURRENCY_CONFIG.taxRatePercent / 100))
        const compareAtTaxAmount = Math.round(compareAtFinalWithoutTax * (CURRENCY_CONFIG.taxRatePercent / 100))

        pricingComponents.costPrice.taxAmount = costTaxAmount
        pricingComponents.costPrice.finalPriceWithTax = costFinalWithoutTax + costTaxAmount
        pricingComponents.costPrice.taxIncluded = true
        pricingComponents.costPrice.finalPrice = costFinalWithoutTax + costTaxAmount

        pricingComponents.sellingPrice.taxAmount = sellingTaxAmount
        pricingComponents.sellingPrice.finalPriceWithTax = sellingFinalWithoutTax + sellingTaxAmount
        pricingComponents.sellingPrice.taxIncluded = true
        pricingComponents.sellingPrice.finalPrice = sellingFinalWithoutTax + sellingTaxAmount

        pricingComponents.compareAtPrice.taxAmount = compareAtTaxAmount
        pricingComponents.compareAtPrice.finalPriceWithTax = compareAtFinalWithoutTax + compareAtTaxAmount
        pricingComponents.compareAtPrice.taxIncluded = true
        pricingComponents.compareAtPrice.finalPrice = compareAtFinalWithoutTax + compareAtTaxAmount
      } else {
        pricingComponents.costPrice.taxAmount = 0
        pricingComponents.costPrice.finalPriceWithTax = 0
        pricingComponents.costPrice.taxIncluded = false
        pricingComponents.costPrice.finalPrice = costFinalWithoutTax

        pricingComponents.sellingPrice.taxAmount = 0
        pricingComponents.sellingPrice.finalPriceWithTax = 0
        pricingComponents.sellingPrice.taxIncluded = false
        pricingComponents.sellingPrice.finalPrice = sellingFinalWithoutTax

        pricingComponents.compareAtPrice.taxAmount = 0
        pricingComponents.compareAtPrice.finalPriceWithTax = 0
        pricingComponents.compareAtPrice.taxIncluded = false
        pricingComponents.compareAtPrice.finalPrice = compareAtFinalWithoutTax
      }

      // 8. Generate Variant SKU
      const skuConfig = PRODUCT_TYPES.JEWELLERY_DEFAULT.variantSkuConfig
      const variantDiamondId = variant.diamondClarityColor?.id
      const variantGemstoneId = variant.gemstoneColor?.id
      const diamondClarityColor = variantDiamondId
        ? masterData.diamondClarityColors.find(d => d.id === variantDiamondId)
        : null
      const gemstoneColor = variantGemstoneId
        ? masterData.gemstoneColors.find(g => g.id === variantGemstoneId)
        : null

      const skuComponents: Record<string, string | null> = {
        productSku: baseSku,
        metalType: metalType.slug,
        metalColor: metalColor.slug,
        metalPurity: metalPurity.slug,
        diamondClarityColor: diamondClarityColor?.slug || null,
        gemstoneColor: gemstoneColor?.slug || null,
      }

      let variantSku = ''
      for (const component of skuConfig.components) {
        const value = skuComponents[component.key]
        if (value) {
          variantSku += component.separator + value
        }
      }

      return {
        sku: variantSku,
        metalType: metalTypeId,
        metalColor: metalColorId,
        metalPurity: metalPurityId,
        metalWeight: metalWeight,
        diamondClarityColor: data.stone.hasDiamond ? (variantDiamondId ?? null) : null,
        gemstoneColor: data.stone.hasGemstone ? (variantGemstoneId ?? null) : null,
        isDefault: variant.isDefault,
        pricingComponents: pricingComponents,
      }
    })
  }

  /**
   * Check if a variant matches pricing rule conditions (for update)
   * Simplified version that doesn't need attributes (categories, tags, badges)
   * since those don't change during options update
   */
  private matchesPricingRuleConditionsForUpdate(
    conditions: PricingRuleCondition[],
    data: JewelleryDefaultUpdateOptionsInput,
    variant: GeneratedVariant
  ): boolean {
    if (!conditions || conditions.length === 0) {
      return false
    }

    for (const condition of conditions) {
      let conditionMatched = false

      // Skip category, tags, badges conditions for update (they don't change)
      if (condition.type === 'category' || condition.type === 'tags' || condition.type === 'badges') {
        // For update, we can't check these without fetching product's current attributes
        // For simplicity, we'll skip these conditions (return false to not apply markup)
        // A more complete solution would fetch current product categories/tags/badges
        continue
      } else if (condition.type === 'metal_type') {
        const value = condition.value as { metalTypeIds: string[] }
        conditionMatched = value.metalTypeIds.includes(variant.metalType.id)
      } else if (condition.type === 'metal_color') {
        const value = condition.value as { metalColorIds: string[] }
        conditionMatched = value.metalColorIds.includes(variant.metalColor.id)
      } else if (condition.type === 'metal_purity') {
        const value = condition.value as { metalPurityIds: string[] }
        conditionMatched = value.metalPurityIds.includes(variant.metalPurity.id)
      } else if (condition.type === 'diamond_clarity_color') {
        const value = condition.value as { diamondClarityColorIds: string[] }
        if (!data.stone.hasDiamond) {
          conditionMatched = false
        } else {
          const variantDiamondClarityColorId = variant.diamondClarityColor?.id
          conditionMatched = variantDiamondClarityColorId ? value.diamondClarityColorIds.includes(variantDiamondClarityColorId) : false
        }
      } else if (condition.type === 'diamond_carat') {
        const value = condition.value as { from: number; to: number }
        if (!data.stone.hasDiamond || !data.stone.diamond) {
          conditionMatched = false
        } else {
          let totalDiamondCarat = 0
          for (const entry of data.stone.diamond.entries) {
            totalDiamondCarat += entry.totalCarat
          }
          conditionMatched = (totalDiamondCarat >= value.from) && (totalDiamondCarat <= value.to)
        }
      } else if (condition.type === 'metal_weight') {
        const value = condition.value as { from: number; to: number }
        const variantMetalWeight = variant.metalPurity.weight
        conditionMatched = (variantMetalWeight >= value.from) && (variantMetalWeight <= value.to)
      } else if (condition.type === 'gemstone_carat') {
        const value = condition.value as { from: number; to: number }
        if (!data.stone.hasGemstone || !data.stone.gemstone) {
          conditionMatched = false
        } else {
          let totalGemstoneCarat = 0
          for (const entry of data.stone.gemstone.entries) {
            totalGemstoneCarat += entry.totalCarat
          }
          conditionMatched = (totalGemstoneCarat >= value.from) && (totalGemstoneCarat <= value.to)
        }
      } else if (condition.type === 'pearl_gram') {
        const value = condition.value as { from: number; to: number }
        if (!data.stone.hasPearl || !data.stone.pearl) {
          conditionMatched = false
        } else {
          let totalPearlGrams = 0
          for (const entry of data.stone.pearl.entries) {
            totalPearlGrams += entry.totalGrams
          }
          conditionMatched = (totalPearlGrams >= value.from) && (totalPearlGrams <= value.to)
        }
      }

      if (!conditionMatched) {
        return false
      }
    }

    return true
  }

  private generateExpectedVariants(metal: MetalDetails, stone: StoneDetails): string[] {
    const variantIds: string[] = []

    // Diamond options: clarity/color IDs or [null] if no diamond
    const diamondOptions: (string | null)[] =
      stone.hasDiamond && stone.diamond && stone.diamond.clarityColors.length > 0
        ? stone.diamond.clarityColors.map((cc) => cc.id)
        : [null]

    // Gemstone options: color IDs or [null] if no gemstone
    const gemstoneOptions: (string | null)[] =
      stone.hasGemstone && stone.gemstone && stone.gemstone.colors.length > 0
        ? stone.gemstone.colors.map((c) => c.id)
        : [null]

    // Generate all combinations
    for (const selectedMetal of metal.selectedMetals) {
      for (const color of selectedMetal.colors) {
        for (const purity of selectedMetal.purities) {
          // Skip if weight is invalid (should not happen after schema validation)
          if (!purity.weight || purity.weight <= 0) continue

          for (const diamondClarityColorId of diamondOptions) {
            for (const gemstoneColorId of gemstoneOptions) {
              // Build variant ID: metalTypeId-colorId-purityId-diamondId-gemstoneId
              const variantId = [
                selectedMetal.metalTypeId,
                color.colorId,
                purity.purityId,
                diamondClarityColorId,
                gemstoneColorId,
              ]
                .filter(Boolean)
                .join('-')

              variantIds.push(variantId)
            }
          }
        }
      }
    }

    return variantIds
  }


  validateVariants(
    metal: MetalDetails,
    stone: StoneDetails,
    variants: VariantsDetails
  ): { validatedVariants: GeneratedVariant[]; defaultVariantId: string } {
    // Generate expected variant IDs
    const expectedVariantIds = this.generateExpectedVariants(metal, stone)
    const expectedSet = new Set(expectedVariantIds)

    // Get user's variant IDs
    const userVariantIds = variants.generatedVariants.map((v) => v.id)
    const userSet = new Set(userVariantIds)

    // Check for count mismatch
    if (expectedVariantIds.length !== userVariantIds.length) {
      throw new AppError(
        `Variant count mismatch. Expected ${expectedVariantIds.length}, received ${userVariantIds.length}`,
        400
      )
    }

    // Check for missing variants (expected but not sent by user)
    const missingVariants = expectedVariantIds.filter((id) => !userSet.has(id))
    if (missingVariants.length > 0) {
      throw new AppError(
        `Missing variants: ${missingVariants.slice(0, 3).join(', ')}${missingVariants.length > 3 ? '...' : ''}`,
        400
      )
    }

    // Check for extra variants (sent by user but not expected)
    const extraVariants = userVariantIds.filter((id) => !expectedSet.has(id))
    if (extraVariants.length > 0) {
      throw new AppError(
        `Invalid variants: ${extraVariants.slice(0, 3).join(', ')}${extraVariants.length > 3 ? '...' : ''}`,
        400
      )
    }

    // Validate default variant exists
    if (!userSet.has(variants.defaultVariantId)) {
      throw new AppError('Default variant ID does not match any generated variant', 400)
    }

    // Validate only one variant has isDefault: true
    const defaultVariants = variants.generatedVariants.filter((v) => v.isDefault)
    if (defaultVariants.length !== 1) {
      throw new AppError('Exactly one variant must be marked as default', 400)
    }

    // Validate the isDefault variant matches defaultVariantId
    if (defaultVariants[0].id !== variants.defaultVariantId) {
      throw new AppError('Default variant ID does not match the variant marked as default', 400)
    }

    return {
      validatedVariants: variants.generatedVariants,
      defaultVariantId: variants.defaultVariantId,
    }
  }

  /**
   * Calculate stone weights (constant across all variants)
   * Diamond/Gemstone: carat / 5 = grams
   * Pearl: already in grams (no conversion)
   */
  private calculateStoneWeights(stone: StoneDetails): StoneWeights {
    let diamond: DiamondWeight | null = null
    let gemstone: GemstoneWeight | null = null
    let pearl: PearlWeight | null = null

    // Diamond
    if (stone.hasDiamond && stone.diamond) {
      let totalCarat = 0
      let stoneCount = 0
      for (const entry of stone.diamond.entries) {
        totalCarat += entry.totalCarat
        stoneCount += entry.noOfStones
      }
      diamond = {
        carat: totalCarat,
        grams: totalCarat / 5,  // carat / 5 = grams
        stoneCount,
      }
    }

    // Gemstone
    if (stone.hasGemstone && stone.gemstone) {
      let totalCarat = 0
      let stoneCount = 0
      for (const entry of stone.gemstone.entries) {
        totalCarat += entry.totalCarat
        stoneCount += entry.noOfStones
      }
      gemstone = {
        carat: totalCarat,
        grams: totalCarat / 5,  // carat / 5 = grams
        stoneCount,
      }
    }

    // Pearl (already in grams - no conversion)
    if (stone.hasPearl && stone.pearl) {
      let totalGrams = 0
      let count = 0
      for (const entry of stone.pearl.entries) {
        totalGrams += entry.totalGrams
        count += entry.noOfPearls
      }
      pearl = {
        grams: totalGrams,
        count,
      }
    }

    return { diamond, gemstone, pearl }
  }

  /**
   * Build optionConfig from master data and user selections
   * Contains full details (id, name, slug, images, parent relationships) for frontend
   */
  private buildOptionConfig(
    masterData: MasterData,
    data: JewelleryDefaultCreateInput
  ): OptionConfig {
    // Collect unique IDs from user selections
    const metalTypeIds = new Set<string>()
    const metalColorIds = new Set<string>()
    const metalPurityIds = new Set<string>()

    for (const metal of data.metal.selectedMetals) {
      metalTypeIds.add(metal.metalTypeId)
      for (const color of metal.colors) {
        metalColorIds.add(color.colorId)
      }
      for (const purity of metal.purities) {
        metalPurityIds.add(purity.purityId)
      }
    }

    // Build metalTypes with full details including images
    const metalTypes: OptionConfigMetalType[] = []
    for (const id of metalTypeIds) {
      const mt = masterData.metalTypes.find(m => m.id === id)
      if (mt) {
        metalTypes.push({
          id: mt.id,
          name: mt.name,
          slug: mt.slug,
          imageUrl: mt.image_url,
          imageAltText: mt.image_alt_text,
        })
      }
    }

    // Build metalColors with full details including images
    const metalColors: OptionConfigMetalColor[] = []
    for (const id of metalColorIds) {
      const mc = masterData.metalColors.find(c => c.id === id)
      if (mc) {
        metalColors.push({
          id: mc.id,
          name: mc.name,
          slug: mc.slug,
          metalTypeId: mc.metal_type_id,
          imageUrl: mc.image_url,
          imageAltText: mc.image_alt_text,
        })
      }
    }

    // Build metalPurities with full details including images
    const metalPurities: OptionConfigMetalPurity[] = []
    for (const id of metalPurityIds) {
      const mp = masterData.metalPurities.find(p => p.id === id)
      if (mp) {
        metalPurities.push({
          id: mp.id,
          name: mp.name,
          slug: mp.slug,
          metalTypeId: mp.metal_type_id,
          imageUrl: mp.image_url,
          imageAltText: mp.image_alt_text,
        })
      }
    }

    // Build diamondClarityColors (if product has diamond)
    let diamondClarityColors: OptionConfigDiamondClarityColor[] | null = null
    if (data.stone.hasDiamond && data.stone.diamond) {
      diamondClarityColors = []
      for (const cc of data.stone.diamond.clarityColors) {
        const dcc = masterData.diamondClarityColors.find(d => d.id === cc.id)
        if (dcc) {
          diamondClarityColors.push({
            id: dcc.id,
            name: dcc.name,
            slug: dcc.slug,
            imageUrl: dcc.image_url,
            imageAltText: dcc.image_alt_text,
          })
        }
      }
    }

    // Build gemstoneColors (if product has gemstone)
    let gemstoneColors: OptionConfigGemstoneColor[] | null = null
    if (data.stone.hasGemstone && data.stone.gemstone) {
      gemstoneColors = []
      for (const gc of data.stone.gemstone.colors) {
        const gsc = masterData.gemstoneColors.find(g => g.id === gc.id)
        if (gsc) {
          gemstoneColors.push({
            id: gsc.id,
            name: gsc.name,
            slug: gsc.slug,
            imageUrl: gsc.image_url,
            imageAltText: gsc.image_alt_text,
          })
        }
      }
    }

    return {
      metalTypes,
      metalColors,
      metalPurities,
      diamondClarityColors,
      gemstoneColors,
    }
  }

  /**
   * Build fully symmetric availabilityMap from processed variants
   * Each "by" section contains ALL other option types (except itself)
   * This allows frontend to filter from any starting point
   */
  private buildAvailabilityMap(
    variants: Array<{
      metalType: string
      metalColor: string
      metalPurity: string
      diamondClarityColor: string | null
      gemstoneColor: string | null
    }>,
    hasDiamond: boolean,
    hasGemstone: boolean
  ): AvailabilityMap {
    const byMetalType: Record<string, AvailabilityByMetalType> = {}
    const byMetalColor: Record<string, AvailabilityByMetalColor> = {}
    const byMetalPurity: Record<string, AvailabilityByMetalPurity> = {}
    const byDiamondClarityColor: Record<string, AvailabilityByDiamondClarityColor> = {}
    const byGemstoneColor: Record<string, AvailabilityByGemstoneColor> = {}

    for (const variant of variants) {
      const { metalType, metalColor, metalPurity, diamondClarityColor, gemstoneColor } = variant

      // ========== byMetalType ==========
      if (!byMetalType[metalType]) {
        byMetalType[metalType] = {
          metalColorIds: [],
          metalPurityIds: [],
          diamondClarityColorIds: [],
          gemstoneColorIds: [],
        }
      }
      if (!byMetalType[metalType].metalColorIds.includes(metalColor)) {
        byMetalType[metalType].metalColorIds.push(metalColor)
      }
      if (!byMetalType[metalType].metalPurityIds.includes(metalPurity)) {
        byMetalType[metalType].metalPurityIds.push(metalPurity)
      }
      if (diamondClarityColor && !byMetalType[metalType].diamondClarityColorIds.includes(diamondClarityColor)) {
        byMetalType[metalType].diamondClarityColorIds.push(diamondClarityColor)
      }
      if (gemstoneColor && !byMetalType[metalType].gemstoneColorIds.includes(gemstoneColor)) {
        byMetalType[metalType].gemstoneColorIds.push(gemstoneColor)
      }

      // ========== byMetalColor ==========
      if (!byMetalColor[metalColor]) {
        byMetalColor[metalColor] = {
          metalTypeIds: [],
          metalPurityIds: [],
          diamondClarityColorIds: [],
          gemstoneColorIds: [],
        }
      }
      if (!byMetalColor[metalColor].metalTypeIds.includes(metalType)) {
        byMetalColor[metalColor].metalTypeIds.push(metalType)
      }
      if (!byMetalColor[metalColor].metalPurityIds.includes(metalPurity)) {
        byMetalColor[metalColor].metalPurityIds.push(metalPurity)
      }
      if (diamondClarityColor && !byMetalColor[metalColor].diamondClarityColorIds.includes(diamondClarityColor)) {
        byMetalColor[metalColor].diamondClarityColorIds.push(diamondClarityColor)
      }
      if (gemstoneColor && !byMetalColor[metalColor].gemstoneColorIds.includes(gemstoneColor)) {
        byMetalColor[metalColor].gemstoneColorIds.push(gemstoneColor)
      }

      // ========== byMetalPurity ==========
      if (!byMetalPurity[metalPurity]) {
        byMetalPurity[metalPurity] = {
          metalTypeIds: [],
          metalColorIds: [],
          diamondClarityColorIds: [],
          gemstoneColorIds: [],
        }
      }
      if (!byMetalPurity[metalPurity].metalTypeIds.includes(metalType)) {
        byMetalPurity[metalPurity].metalTypeIds.push(metalType)
      }
      if (!byMetalPurity[metalPurity].metalColorIds.includes(metalColor)) {
        byMetalPurity[metalPurity].metalColorIds.push(metalColor)
      }
      if (diamondClarityColor && !byMetalPurity[metalPurity].diamondClarityColorIds.includes(diamondClarityColor)) {
        byMetalPurity[metalPurity].diamondClarityColorIds.push(diamondClarityColor)
      }
      if (gemstoneColor && !byMetalPurity[metalPurity].gemstoneColorIds.includes(gemstoneColor)) {
        byMetalPurity[metalPurity].gemstoneColorIds.push(gemstoneColor)
      }

      // ========== byDiamondClarityColor ==========
      if (diamondClarityColor) {
        if (!byDiamondClarityColor[diamondClarityColor]) {
          byDiamondClarityColor[diamondClarityColor] = {
            metalTypeIds: [],
            metalColorIds: [],
            metalPurityIds: [],
            gemstoneColorIds: [],
          }
        }
        if (!byDiamondClarityColor[diamondClarityColor].metalTypeIds.includes(metalType)) {
          byDiamondClarityColor[diamondClarityColor].metalTypeIds.push(metalType)
        }
        if (!byDiamondClarityColor[diamondClarityColor].metalColorIds.includes(metalColor)) {
          byDiamondClarityColor[diamondClarityColor].metalColorIds.push(metalColor)
        }
        if (!byDiamondClarityColor[diamondClarityColor].metalPurityIds.includes(metalPurity)) {
          byDiamondClarityColor[diamondClarityColor].metalPurityIds.push(metalPurity)
        }
        if (gemstoneColor && !byDiamondClarityColor[diamondClarityColor].gemstoneColorIds.includes(gemstoneColor)) {
          byDiamondClarityColor[diamondClarityColor].gemstoneColorIds.push(gemstoneColor)
        }
      }

      // ========== byGemstoneColor ==========
      if (gemstoneColor) {
        if (!byGemstoneColor[gemstoneColor]) {
          byGemstoneColor[gemstoneColor] = {
            metalTypeIds: [],
            metalColorIds: [],
            metalPurityIds: [],
            diamondClarityColorIds: [],
          }
        }
        if (!byGemstoneColor[gemstoneColor].metalTypeIds.includes(metalType)) {
          byGemstoneColor[gemstoneColor].metalTypeIds.push(metalType)
        }
        if (!byGemstoneColor[gemstoneColor].metalColorIds.includes(metalColor)) {
          byGemstoneColor[gemstoneColor].metalColorIds.push(metalColor)
        }
        if (!byGemstoneColor[gemstoneColor].metalPurityIds.includes(metalPurity)) {
          byGemstoneColor[gemstoneColor].metalPurityIds.push(metalPurity)
        }
        if (diamondClarityColor && !byGemstoneColor[gemstoneColor].diamondClarityColorIds.includes(diamondClarityColor)) {
          byGemstoneColor[gemstoneColor].diamondClarityColorIds.push(diamondClarityColor)
        }
      }
    }

    return {
      byMetalType,
      byMetalColor,
      byMetalPurity,
      byDiamondClarityColor: hasDiamond ? byDiamondClarityColor : null,
      byGemstoneColor: hasGemstone ? byGemstoneColor : null,
    }
  }

  /**
   * Check if a variant matches all conditions of a pricing rule
   * Returns true if ALL conditions match, false otherwise
   */
  private matchesPricingRuleConditions(
    conditions: PricingRuleCondition[],
    data: JewelleryDefaultCreateInput,
    variant: GeneratedVariant
  ): boolean {
    // Empty conditions = no match
    if (!conditions || conditions.length === 0) {
      return false
    }

    // ALL conditions must match
    for (const condition of conditions) {
      let conditionMatched = false

      if (condition.type === 'category') {
        const value = condition.value as { matchType: 'any' | 'all'; categoryIds: string[] }
        const userCategoryIds = data.attributes.categories.map(c => c.id)

        if (value.matchType === 'any') {
          // Any of the condition categories should be in user's selected categories
          conditionMatched = value.categoryIds.some(id => userCategoryIds.includes(id))
        } else {
          // All of the condition categories should be in user's selected categories
          conditionMatched = value.categoryIds.every(id => userCategoryIds.includes(id))
        }
      } else if (condition.type === 'tags') {
        const value = condition.value as { matchType: 'any' | 'all'; tagIds: string[] }
        const userTagIds = data.attributes.tags.map(t => t.id)

        if (value.matchType === 'any') {
          conditionMatched = value.tagIds.some(id => userTagIds.includes(id))
        } else {
          conditionMatched = value.tagIds.every(id => userTagIds.includes(id))
        }
      } else if (condition.type === 'badges') {
        const value = condition.value as { matchType: 'any' | 'all'; badgeIds: string[] }
        const userBadgeIds = data.attributes.badges.map(b => b.id)

        if (value.matchType === 'any') {
          conditionMatched = value.badgeIds.some(id => userBadgeIds.includes(id))
        } else {
          conditionMatched = value.badgeIds.every(id => userBadgeIds.includes(id))
        }
      } else if (condition.type === 'metal_type') {
        const value = condition.value as { metalTypeIds: string[] }
        const variantMetalTypeId = variant.metalType.id

        // If variant's metal type is in the condition's metal type list, condition matches
        conditionMatched = value.metalTypeIds.includes(variantMetalTypeId)
      } else if (condition.type === 'metal_color') {
        const value = condition.value as { metalColorIds: string[] }
        const variantMetalColorId = variant.metalColor.id

        conditionMatched = value.metalColorIds.includes(variantMetalColorId)
      } else if (condition.type === 'metal_purity') {
        const value = condition.value as { metalPurityIds: string[] }
        const variantMetalPurityId = variant.metalPurity.id

        conditionMatched = value.metalPurityIds.includes(variantMetalPurityId)
      } else if (condition.type === 'diamond_clarity_color') {
        const value = condition.value as { diamondClarityColorIds: string[] }

        // First check if product has diamond
        if (!data.stone.hasDiamond) {
          conditionMatched = false
        } else {
          const variantDiamondClarityColorId = variant.diamondClarityColor?.id
          conditionMatched = variantDiamondClarityColorId ? value.diamondClarityColorIds.includes(variantDiamondClarityColorId) : false
        }
      } else if (condition.type === 'diamond_carat') {
        const value = condition.value as { from: number; to: number }

        // First check if product has diamond
        if (!data.stone.hasDiamond) {
          conditionMatched = false
        } else {
          // Calculate total diamond carat from entries
          let totalDiamondCarat = 0
          for (const entry of data.stone.diamond!.entries) {
            totalDiamondCarat += entry.totalCarat
          }

          conditionMatched = (totalDiamondCarat >= value.from) && (totalDiamondCarat <= value.to)
        }
      } else if (condition.type === 'metal_weight') {
        const value = condition.value as { from: number; to: number }

        // Get metal weight from variant's purity
        const variantMetalWeight = variant.metalPurity.weight

        conditionMatched = (variantMetalWeight >= value.from) && (variantMetalWeight <= value.to)
      } else if (condition.type === 'gemstone_carat') {
        const value = condition.value as { from: number; to: number }

        // First check if product has gemstone
        if (!data.stone.hasGemstone) {
          conditionMatched = false
        } else {
          // Calculate total gemstone carat from entries
          let totalGemstoneCarat = 0
          for (const entry of data.stone.gemstone!.entries) {
            totalGemstoneCarat += entry.totalCarat
          }

          conditionMatched = (totalGemstoneCarat >= value.from) && (totalGemstoneCarat <= value.to)
        }
      } else if (condition.type === 'pearl_gram') {
        const value = condition.value as { from: number; to: number }

        // First check if product has pearl
        if (!data.stone.hasPearl) {
          conditionMatched = false
        } else {
          // Calculate total pearl grams from entries
          let totalPearlGrams = 0
          for (const entry of data.stone.pearl!.entries) {
            totalPearlGrams += entry.totalGrams
          }

          conditionMatched = (totalPearlGrams >= value.from) && (totalPearlGrams <= value.to)
        }
      }

      // If any condition doesn't match, return false
      if (!conditionMatched) {
        return false
      }
    }

    // All conditions matched
    return true
  }

  /**
   * Fetch all master data needed for validation and price calculation
   */
  async fetchMasterData(): Promise<MasterData> {
    const [
      metalTypesResult,
      metalColorsResult,
      metalPuritiesResult,
      stoneShapesResult,
      diamondClarityColorsResult,
      gemstoneTypesResult,
      gemstoneColorsResult,
      gemstoneQualitiesResult,
      pearlTypesResult,
      pearlQualitiesResult,
      stonePricingsResult,
      makingChargesResult,
      otherChargesResult,
      mrpMarkupResult,
      categoriesResult,
      badgesResult,
      tagsResult,
      sizeChartGroupsResult,
      pricingRulesResult,
    ] = await Promise.all([
      db.query<MasterMetalType>('SELECT id, name, slug, image_url, image_alt_text FROM metal_types WHERE status = true'),
      db.query<MasterMetalColor>('SELECT id, name, slug, metal_type_id, image_url, image_alt_text FROM metal_colors WHERE status = true'),
      db.query<MasterMetalPurity>('SELECT id, name, slug, metal_type_id, price, image_url, image_alt_text FROM metal_purities WHERE status = true'),
      db.query<MasterStoneShape>('SELECT id, name, slug FROM stone_shapes WHERE status = true'),
      db.query<MasterDiamondClarityColor>(`
        SELECT sq.id, sq.name, sq.slug, sq.image_url, sq.image_alt_text
        FROM stone_qualities sq
        JOIN stone_groups sg ON sq.stone_group_id = sg.id
        WHERE sg.slug = 'diamond' AND sq.status = true
      `),
      db.query<MasterGemstoneType>(`
        SELECT st.id, st.name, st.slug
        FROM stone_types st
        JOIN stone_groups sg ON st.stone_group_id = sg.id
        WHERE sg.slug = 'gemstone' AND st.status = true
      `),
      db.query<MasterGemstoneColor>(`
        SELECT sc.id, sc.name, sc.slug, sc.image_url, sc.image_alt_text
        FROM stone_colors sc
        JOIN stone_groups sg ON sc.stone_group_id = sg.id
        WHERE sg.slug = 'gemstone' AND sc.status = true
      `),
      db.query<MasterGemstoneQuality>(`
        SELECT sq.id, sq.name, sq.slug
        FROM stone_qualities sq
        JOIN stone_groups sg ON sq.stone_group_id = sg.id
        WHERE sg.slug = 'gemstone' AND sq.status = true
      `),
      db.query<MasterPearlType>(`
        SELECT st.id, st.name, st.slug
        FROM stone_types st
        JOIN stone_groups sg ON st.stone_group_id = sg.id
        WHERE sg.slug = 'pearl' AND st.status = true
      `),
      db.query<MasterPearlQuality>(`
        SELECT sq.id, sq.name, sq.slug
        FROM stone_qualities sq
        JOIN stone_groups sg ON sq.stone_group_id = sg.id
        WHERE sg.slug = 'pearl' AND sq.status = true
      `),
      db.query<MasterStonePricing>(`
        SELECT id, stone_group_id, stone_type_id, stone_shape_id, stone_quality_id, stone_color_id, ct_from, ct_to, price
        FROM stone_prices
        WHERE status = true
      `),
      db.query<MasterMakingCharge>(`
        SELECT id, metal_type_id, "from", "to", is_fixed_pricing, amount
        FROM making_charges
        WHERE status = true
      `),
      db.query<MasterOtherCharge>('SELECT id, name, amount FROM other_charges WHERE status = true'),
      db.query<MasterMrpMarkup>('SELECT id, diamond, gemstone, pearl, making_charge FROM mrp_markup LIMIT 1'),
      db.query<MasterCategory>('SELECT id, name, slug FROM categories WHERE status = true'),
      db.query<MasterBadge>('SELECT id, name, slug FROM badges WHERE status = true'),
      db.query<MasterTag>('SELECT id, name, slug, tag_group_id, source_id FROM tags WHERE status = true'),
      db.query<MasterSizeChartGroup>('SELECT id, name FROM size_chart_groups'),
      db.query<MasterPricingRule>(`
        SELECT id, name, conditions, actions, product_type
        FROM pricing_rules
        WHERE product_type = $1 AND is_active = true
        ORDER BY created_at ASC
      `, [PRODUCT_TYPES.JEWELLERY_DEFAULT.code]),
    ])

    return {
      metalTypes: metalTypesResult.rows,
      metalColors: metalColorsResult.rows,
      metalPurities: metalPuritiesResult.rows,
      stoneShapes: stoneShapesResult.rows,
      diamondClarityColors: diamondClarityColorsResult.rows,
      gemstoneTypes: gemstoneTypesResult.rows,
      gemstoneColors: gemstoneColorsResult.rows,
      gemstoneQualities: gemstoneQualitiesResult.rows,
      pearlTypes: pearlTypesResult.rows,
      pearlQualities: pearlQualitiesResult.rows,
      stonePricings: stonePricingsResult.rows,
      makingCharges: makingChargesResult.rows,
      otherCharges: otherChargesResult.rows,
      mrpMarkup: mrpMarkupResult.rows[0] || null,
      categories: categoriesResult.rows,
      badges: badgesResult.rows,
      tags: tagsResult.rows,
      sizeChartGroups: sizeChartGroupsResult.rows,
      pricingRules: pricingRulesResult.rows,
    }
  }
}

// ==================== MASTER DATA TYPES ====================

interface MasterMetalType {
  id: string
  name: string
  slug: string
  image_url: string | null
  image_alt_text: string | null
}

interface MasterMetalColor {
  id: string
  name: string
  slug: string
  metal_type_id: string
  image_url: string | null
  image_alt_text: string | null
}

interface MasterMetalPurity {
  id: string
  name: string
  slug: string
  metal_type_id: string
  price: number
  image_url: string | null
  image_alt_text: string | null
}

interface MasterStoneShape {
  id: string
  name: string
  slug: string
}

interface MasterDiamondClarityColor {
  id: string
  name: string
  slug: string
  image_url: string | null
  image_alt_text: string | null
}

interface MasterGemstoneType {
  id: string
  name: string
  slug: string
}

interface MasterGemstoneColor {
  id: string
  name: string
  slug: string
  image_url: string | null
  image_alt_text: string | null
}

interface MasterGemstoneQuality {
  id: string
  name: string
  slug: string
}

interface MasterPearlType {
  id: string
  name: string
  slug: string
}

interface MasterPearlQuality {
  id: string
  name: string
  slug: string
}

interface MasterStonePricing {
  id: string
  stone_group_id: string
  stone_type_id: string
  stone_shape_id: string
  stone_quality_id: string
  stone_color_id: string | null
  ct_from: number
  ct_to: number
  price: number
}

interface MasterMakingCharge {
  id: string
  metal_type_id: string
  from: number
  to: number
  is_fixed_pricing: boolean
  amount: number
}

interface MasterOtherCharge {
  id: string
  name: string
  amount: number
}

interface MasterMrpMarkup {
  id: string
  diamond: number
  gemstone: number
  pearl: number
  making_charge: number
}

interface MasterCategory {
  id: string
  name: string
  slug: string
}

interface MasterBadge {
  id: string
  name: string
  slug: string
}

interface MasterTag {
  id: string
  name: string
  slug: string
  tag_group_id: string
  source_id: string | null
}

interface MasterSizeChartGroup {
  id: string
  name: string
}

interface MasterPricingRule {
  id: string
  name: string
  conditions: PricingRuleCondition[]
  actions: PricingRuleActions
  product_type: string
}

// Pricing rule condition types
interface PricingRuleCondition {
  type: string
  value: unknown
}

// Pricing rule actions (markup percentages)
interface PricingRuleActions {
  diamondMarkup: number
  makingChargeMarkup: number
  gemstoneMarkup: number
  pearlMarkup: number
}

// ==================== WEIGHT TYPES ====================

interface DiamondWeight {
  carat: number
  grams: number
  stoneCount: number
}

interface GemstoneWeight {
  carat: number
  grams: number
  stoneCount: number
}

interface PearlWeight {
  grams: number
  count: number
}

interface StoneWeights {
  diamond: DiamondWeight | null
  gemstone: GemstoneWeight | null
  pearl: PearlWeight | null
}

interface VariantWeights {
  metal: {
    grams: number
  }
  diamond: DiamondWeight | null
  gemstone: GemstoneWeight | null
  pearl: PearlWeight | null
  total: {
    grams: number
  }
}

// ==================== OPTION CONFIG TYPES ====================

interface OptionConfigMetalType {
  id: string
  name: string
  slug: string
  imageUrl: string | null
  imageAltText: string | null
}

interface OptionConfigMetalColor {
  id: string
  name: string
  slug: string
  metalTypeId: string
  imageUrl: string | null
  imageAltText: string | null
}

interface OptionConfigMetalPurity {
  id: string
  name: string
  slug: string
  metalTypeId: string
  imageUrl: string | null
  imageAltText: string | null
}

interface OptionConfigDiamondClarityColor {
  id: string
  name: string
  slug: string
  imageUrl: string | null
  imageAltText: string | null
}

interface OptionConfigGemstoneColor {
  id: string
  name: string
  slug: string
  imageUrl: string | null
  imageAltText: string | null
}

interface OptionConfig {
  metalTypes: OptionConfigMetalType[]
  metalColors: OptionConfigMetalColor[]
  metalPurities: OptionConfigMetalPurity[]
  diamondClarityColors: OptionConfigDiamondClarityColor[] | null
  gemstoneColors: OptionConfigGemstoneColor[] | null
}

// ==================== AVAILABILITY MAP TYPES ====================

// Fully symmetric - each contains ALL other option types (except itself)

interface AvailabilityByMetalType {
  metalColorIds: string[]
  metalPurityIds: string[]
  diamondClarityColorIds: string[]
  gemstoneColorIds: string[]
}

interface AvailabilityByMetalColor {
  metalTypeIds: string[]
  metalPurityIds: string[]
  diamondClarityColorIds: string[]
  gemstoneColorIds: string[]
}

interface AvailabilityByMetalPurity {
  metalTypeIds: string[]
  metalColorIds: string[]
  diamondClarityColorIds: string[]
  gemstoneColorIds: string[]
}

interface AvailabilityByDiamondClarityColor {
  metalTypeIds: string[]
  metalColorIds: string[]
  metalPurityIds: string[]
  gemstoneColorIds: string[]
}

interface AvailabilityByGemstoneColor {
  metalTypeIds: string[]
  metalColorIds: string[]
  metalPurityIds: string[]
  diamondClarityColorIds: string[]
}

interface AvailabilityMap {
  byMetalType: Record<string, AvailabilityByMetalType>
  byMetalColor: Record<string, AvailabilityByMetalColor>
  byMetalPurity: Record<string, AvailabilityByMetalPurity>
  byDiamondClarityColor: Record<string, AvailabilityByDiamondClarityColor> | null
  byGemstoneColor: Record<string, AvailabilityByGemstoneColor> | null
}

export interface MasterData {
  metalTypes: MasterMetalType[]
  metalColors: MasterMetalColor[]
  metalPurities: MasterMetalPurity[]
  stoneShapes: MasterStoneShape[]
  diamondClarityColors: MasterDiamondClarityColor[]
  gemstoneTypes: MasterGemstoneType[]
  gemstoneColors: MasterGemstoneColor[]
  gemstoneQualities: MasterGemstoneQuality[]
  pearlTypes: MasterPearlType[]
  pearlQualities: MasterPearlQuality[]
  stonePricings: MasterStonePricing[]
  makingCharges: MasterMakingCharge[]
  otherCharges: MasterOtherCharge[]
  mrpMarkup: MasterMrpMarkup | null
  categories: MasterCategory[]
  badges: MasterBadge[]
  tags: MasterTag[]
  sizeChartGroups: MasterSizeChartGroup[]
  pricingRules: MasterPricingRule[]
}

export const jewelleryDefaultService = new JewelleryDefaultService()
