import { db } from '../../../lib/db'
import { AppError } from '../../../utils/app-error'
import { HTTP_STATUS } from '../../../config/constants'
import { CURRENCY_CONFIG } from '../../../config/currency'
import { PRODUCT_TYPES } from '../../../config/product.config'
import { storefrontMessages } from '../config/storefront.messages'
import type {
  StorefrontProductsParams,
  StorefrontProductsResponse,
  StorefrontProductCard,
  StorefrontProductVariant,
  StorefrontProductDetailParams,
  StorefrontProductDetail,
  StorefrontDetailVariant,
  StorefrontVariantPricing,
  StorefrontStoneDetails,
  StorefrontDetailSeo,
  StorefrontVariantConfig,
  PricingMasterData,
} from '../types/storefront.types'

class StorefrontProductsService {
  private static readonly DEFAULT_LIMIT = 24
  private static readonly MAX_LIMIT = 48
  private static readonly DEFAULT_SORT_KEY = 'newest'

  /**
   * Get paginated product listings with filters + sorting
   */
  async getProducts(params: StorefrontProductsParams): Promise<StorefrontProductsResponse> {
    const categories = params.categories || []
    const tags = params.tags || []
    const priceRanges = params.price_ranges || []
    const page = Math.max(1, params.page || 1)
    const limit = Math.min(
      StorefrontProductsService.MAX_LIMIT,
      Math.max(1, params.limit || StorefrontProductsService.DEFAULT_LIMIT)
    )
    const offset = (page - 1) * limit
    const sortKey = params.sort_by || StorefrontProductsService.DEFAULT_SORT_KEY

    // 1. Look up sort config, resolve price ranges, and group tags by tag group — in parallel
    const [sortConfig, priceRangeFilters, tagsByGroup] = await Promise.all([
      this.getSortConfig(sortKey),
      priceRanges.length > 0 ? this.getPriceRangeValues(priceRanges) : Promise.resolve([]),
      tags.length > 0 ? this.groupTagsByTagGroup(tags) : Promise.resolve(new Map<string, string[]>()),
    ])

    // 2. Build WHERE conditions
    const values: unknown[] = []
    let paramIndex = 1
    const whereConditions: string[] = [`p.status = 'active'`]

    // Category filter (WHERE EXISTS — prevents duplicate rows)
    if (categories.length > 0) {
      whereConditions.push(
        `EXISTS (SELECT 1 FROM product_categories pc WHERE pc.product_id = p.id AND pc.category_id = ANY($${paramIndex}))`
      )
      values.push(categories)
      paramIndex++
    }

    // Tag filter — AND between groups, OR within group
    // Each tag group gets its own EXISTS clause
    for (const [, groupTagIds] of tagsByGroup) {
      whereConditions.push(
        `EXISTS (SELECT 1 FROM product_tags pt WHERE pt.product_id = p.id AND pt.tag_id = ANY($${paramIndex}))`
      )
      values.push(groupTagIds)
      paramIndex++
    }

    // Price range filter (OR across ranges)
    if (priceRangeFilters.length > 0) {
      const priceConditions: string[] = []
      for (const range of priceRangeFilters) {
        priceConditions.push(
          `(p.min_price <= $${paramIndex} AND p.max_price >= $${paramIndex + 1})`
        )
        values.push(range.max_price, range.min_price)
        paramIndex += 2
      }
      whereConditions.push(`(${priceConditions.join(' OR ')})`)
    }

    const whereClause = whereConditions.join(' AND ')

    // 3. Build ORDER BY from sort config
    let orderBy = `${sortConfig.sort_column} ${sortConfig.sort_direction}`
    if (sortConfig.tiebreaker_column && sortConfig.tiebreaker_direction) {
      orderBy += `, ${sortConfig.tiebreaker_column} ${sortConfig.tiebreaker_direction}`
    }

    // 4. Run count + product queries in parallel
    const limitParam = `$${paramIndex}`
    const offsetParam = `$${paramIndex + 1}`

    const countQuery = `
      SELECT COUNT(p.id) AS total
      FROM products p
      WHERE ${whereClause}
    `

    const productQuery = `
      SELECT
        p.id, p.name, p.slug, p.base_sku,
        p.default_variant_id,
        p.metadata -> 'optionConfig' AS option_config,
        p.metadata -> 'availabilityMap' AS availability_map,
        p.metadata -> 'media' AS media,
        p.created_at,

        (
          SELECT COALESCE(json_agg(
            json_build_object(
              'id', pv.id,
              'sku', pv.sku,
              'price', pv.price,
              'compare_at_price', pv.compare_at_price,
              'is_available', pv.is_available,
              'metadata', pv.metadata
            )
          ), '[]'::json)
          FROM product_variants pv
          WHERE pv.product_id = p.id
        ) AS variants,

        (
          SELECT COALESCE(json_agg(
            json_build_object(
              'id', b.id,
              'name', b.name,
              'slug', b.slug,
              'bg_color', b.bg_color,
              'font_color', b.font_color,
              'position', b.position
            )
          ), '[]'::json)
          FROM product_badges pb
          JOIN badges b ON b.id = pb.badge_id AND b.status = TRUE
          WHERE pb.product_id = p.id
        ) AS badges

      FROM products p
      WHERE ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ${limitParam} OFFSET ${offsetParam}
    `

    const productValues = [...values, limit, offset]

    const [countResult, productResult] = await Promise.all([
      db.query(countQuery, values),
      db.query(productQuery, productValues),
    ])

    const total = Number(countResult.rows[0].total)
    const totalPages = Math.ceil(total / limit)

    // 5. Transform rows — extract metadata fields
    const products: StorefrontProductCard[] = productResult.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      base_sku: row.base_sku,
      default_variant_id: row.default_variant_id,
      option_config: row.option_config || null,
      availability_map: row.availability_map || null,
      variants: this.transformVariants(row.variants),
      media: row.media || null,
      badges: row.badges || [],
      created_at: row.created_at,
    }))

    return {
      products,
      pagination: {
        page,
        limit,
        total,
        total_pages: totalPages,
      },
    }
  }

  /**
   * Get product detail by slug or productSku.
   * Returns single variant (by variantSku or default).
   */
  async getProductDetail(params: StorefrontProductDetailParams): Promise<StorefrontProductDetail> {
    const identifier = params.slug || params.productSku
    const lookupCondition = params.slug ? `p.slug = $1` : `p.base_sku = $1`

    // 1. Main query — product + related data
    const productResult = await db.query(
      `
      SELECT
        p.id, p.name, p.slug, p.base_sku, p.style_sku,
        p.short_description, p.description, p.product_type,
        p.default_variant_id,
        p.seo,
        p.metadata,

        -- All variant configs (lightweight)
        (
          SELECT COALESCE(json_agg(
            json_build_object(
              'id', pv.id,
              'sku', pv.sku,
              'is_default', pv.is_default,
              'is_available', pv.is_available,
              'metalTypeId', pv.metadata ->> 'metalType',
              'metalColorId', pv.metadata ->> 'metalColor',
              'metalPurityId', pv.metadata ->> 'metalPurity',
              'diamondClarityColorId', pv.metadata ->> 'diamondClarityColor',
              'gemstoneColorId', pv.metadata ->> 'gemstoneColor'
            ) ORDER BY pv.is_default DESC, pv.created_at
          ), '[]'::json)
          FROM product_variants pv
          WHERE pv.product_id = p.id
        ) AS variant_configs,

        -- Categories
        (
          SELECT COALESCE(json_agg(
            json_build_object(
              'id', c.id,
              'name', c.name,
              'slug', c.slug,
              'isPrimary', pc.is_primary
            ) ORDER BY pc.is_primary DESC
          ), '[]'::json)
          FROM product_categories pc
          JOIN categories c ON pc.category_id = c.id
          WHERE pc.product_id = p.id
        ) AS categories,

        -- Tags (non-system only)
        (
          SELECT COALESCE(json_agg(
            json_build_object(
              'id', t.id,
              'name', t.name,
              'slug', t.slug,
              'groupName', tg.name,
              'groupSlug', tg.slug
            ) ORDER BY tg.rank, t.rank
          ), '[]'::json)
          FROM product_tags pt
          JOIN tags t ON pt.tag_id = t.id
          JOIN tag_groups tg ON t.tag_group_id = tg.id
          WHERE pt.product_id = p.id
            AND t.is_system_generated = false
            AND tg.is_system_generated = false
        ) AS tags,

        -- Badges
        (
          SELECT COALESCE(json_agg(
            json_build_object(
              'id', b.id,
              'name', b.name,
              'slug', b.slug,
              'bg_color', b.bg_color,
              'font_color', b.font_color,
              'position', b.position
            ) ORDER BY b.position
          ), '[]'::json)
          FROM product_badges pb
          JOIN badges b ON pb.badge_id = b.id AND b.status = true
          WHERE pb.product_id = p.id
        ) AS badges,

        -- Size chart values (only if product has size chart)
        (
          SELECT COALESCE(json_agg(
            json_build_object(
              'id', scv.id,
              'name', scv.name,
              'description', scv.description,
              'difference', scv.difference,
              'isDefault', scv.is_default
            ) ORDER BY scv.name
          ), '[]'::json)
          FROM size_chart_values scv
          WHERE scv.size_chart_group_id = (p.metadata -> 'sizeChart' ->> 'sizeChartGroupId')
            AND (p.metadata -> 'sizeChart' ->> 'hasSizeChart')::boolean = true
        ) AS size_chart_values

      FROM products p
      WHERE ${lookupCondition}
        AND p.status = 'active'
      `,
      [identifier]
    )

    if (productResult.rows.length === 0) {
      throw new AppError(storefrontMessages.PRODUCT_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    const product = productResult.rows[0]
    const metadata = product.metadata || {}

    // 2. Resolve selected variant
    let variantRow = null

    if (params.variantSku) {
      const variantResult = await db.query(
        `SELECT id, sku, variant_name, is_default, is_available,
                stock_quantity, price_components, metadata
         FROM product_variants
         WHERE product_id = $1 AND sku = $2`,
        [product.id, params.variantSku]
      )
      if (variantResult.rows.length > 0) {
        variantRow = variantResult.rows[0]
      }
    }

    // Fallback to default variant
    if (!variantRow) {
      const defaultResult = await db.query(
        `SELECT id, sku, variant_name, is_default, is_available,
                stock_quantity, price_components, metadata
         FROM product_variants
         WHERE product_id = $1 AND is_default = true`,
        [product.id]
      )
      variantRow = defaultResult.rows[0]
    }

    // 3. Transform variant
    const variantMeta = variantRow.metadata || {}
    const priceComponents = variantRow.price_components || {}

    const variant: StorefrontDetailVariant = {
      id: variantRow.id,
      sku: variantRow.sku,
      variantName: variantRow.variant_name,
      isDefault: variantRow.is_default,
      isAvailable: variantRow.is_available,
      stockQuantity: variantRow.stock_quantity || 0,
      options: {
        metalType: variantMeta.metalType || null,
        metalColor: variantMeta.metalColor || null,
        metalPurity: variantMeta.metalPurity || null,
        diamondClarityColor: variantMeta.diamondClarityColor || null,
        gemstoneColor: variantMeta.gemstoneColor || null,
      },
      metalWeight: variantMeta.metalWeight || 0,
      pricing: {
        sellingPrice: priceComponents.sellingPrice || {},
        compareAtPrice: priceComponents.compareAtPrice || {},
      },
      weights: variantMeta.weights || {
        metal: { grams: 0 },
        diamond: null,
        gemstone: null,
        pearl: null,
        total: { grams: 0 },
      },
    }

    // 4. Resolve stone details (names from master data)
    const stoneDetails = await this.resolveStoneDetails(metadata.stone, metadata.stoneWeights)

    // 5. Size chart — recalculate pricing if non-default value selected
    let isSizeChartSelected = false
    let sizeChartValueId: string | null = null
    const sizeChartValues = product.size_chart_values || []

    if (params.sizeChartValueId && metadata.sizeChart?.hasSizeChart) {
      const matchingValue = sizeChartValues.find(
        (v: any) => v.id === params.sizeChartValueId
      )
      if (matchingValue) {
        isSizeChartSelected = true
        sizeChartValueId = matchingValue.id

        // Recalculate only if non-default size selected
        if (!matchingValue.isDefault) {
          const difference = parseFloat(matchingValue.difference) || 0
          const adjustedMetalWeight = (variantMeta.metalWeight || 0) + difference

          // Fetch master data for full pricing recalculation
          const pricingMasterData = await this.fetchPricingMasterData()

          // Create adjusted variant metadata with new weight
          const adjustedVariantMeta = { ...variantMeta, metalWeight: adjustedMetalWeight }

          // Full recalculation from zero (same logic as price-recalculation service)
          const recalculated = this.recalculateFullPricing(
            adjustedVariantMeta, metadata, pricingMasterData
          )

          // Update variant with recalculated values
          variant.metalWeight = adjustedMetalWeight
          variant.pricing = recalculated
          variant.weights = {
            ...variant.weights,
            metal: { grams: adjustedMetalWeight },
            total: {
              grams: adjustedMetalWeight
                + (variant.weights.diamond?.grams || 0)
                + (variant.weights.gemstone?.grams || 0)
                + (variant.weights.pearl?.grams || 0),
            },
          }
        }
      }
    }

    // 6. Transform SEO
    const seo = this.transformSeo(product.seo)

    // 7. Transform variant configs
    const variantConfigs: StorefrontVariantConfig[] = (product.variant_configs || []).map((vc: any) => ({
      id: vc.id,
      sku: vc.sku,
      isDefault: vc.is_default,
      isAvailable: vc.is_available,
      metalTypeId: vc.metalTypeId,
      metalColorId: vc.metalColorId,
      metalPurityId: vc.metalPurityId,
      diamondClarityColorId: vc.diamondClarityColorId || null,
      gemstoneColorId: vc.gemstoneColorId || null,
    }))

    // 8. Build response
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      baseSku: product.base_sku,
      styleSku: product.style_sku,
      shortDescription: product.short_description,
      description: product.description,
      productType: product.product_type,
      engraving: metadata.engraving || { hasEngraving: false, maxChars: null },
      sizeChart: {
        hasSizeChart: metadata.sizeChart?.hasSizeChart || false,
        sizeChartGroupId: metadata.sizeChart?.sizeChartGroupId || null,
        values: metadata.sizeChart?.hasSizeChart ? sizeChartValues : null,
      },
      isSizeChartSelected,
      sizeChartValueId,
      media: metadata.media || null,
      optionConfig: metadata.optionConfig || null,
      availabilityMap: metadata.availabilityMap || null,
      variantConfigs,
      stoneDetails,
      badges: product.badges || [],
      categories: product.categories || [],
      tags: product.tags || [],
      seo,
      variant,
    }
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  /**
   * Resolve stone entry names from master data tables.
   * Only queries tables needed based on what stones the product has.
   */
  private async resolveStoneDetails(
    stone: any,
    stoneWeights: any
  ): Promise<StorefrontStoneDetails> {
    const result: StorefrontStoneDetails = {
      diamond: null,
      gemstone: null,
      pearl: null,
    }

    if (!stone) return result

    // Collect all IDs that need name resolution
    const shapeIds = new Set<string>()
    const typeIds = new Set<string>()
    const qualityIds = new Set<string>()

    if (stone.hasDiamond && stone.diamond) {
      for (const entry of stone.diamond.entries) {
        shapeIds.add(entry.shapeId)
      }
    }

    if (stone.hasGemstone && stone.gemstone) {
      qualityIds.add(stone.gemstone.qualityId)
      for (const entry of stone.gemstone.entries) {
        typeIds.add(entry.typeId)
        shapeIds.add(entry.shapeId)
      }
    }

    if (stone.hasPearl && stone.pearl) {
      for (const entry of stone.pearl.entries) {
        typeIds.add(entry.typeId)
        qualityIds.add(entry.qualityId)
      }
    }

    // Query master data in parallel (only what's needed)
    const [shapes, types, qualities] = await Promise.all([
      shapeIds.size > 0
        ? db.query(
            `SELECT id, name, slug FROM stone_shapes WHERE id = ANY($1)`,
            [Array.from(shapeIds)]
          ).then(r => r.rows)
        : Promise.resolve([]),
      typeIds.size > 0
        ? db.query(
            `SELECT id, name, slug FROM stone_types WHERE id = ANY($1)`,
            [Array.from(typeIds)]
          ).then(r => r.rows)
        : Promise.resolve([]),
      qualityIds.size > 0
        ? db.query(
            `SELECT id, name, slug FROM stone_qualities WHERE id = ANY($1)`,
            [Array.from(qualityIds)]
          ).then(r => r.rows)
        : Promise.resolve([]),
    ])

    // Build lookup maps
    const shapeMap = new Map(shapes.map((s: any) => [s.id, s]))
    const typeMap = new Map(types.map((t: any) => [t.id, t]))
    const qualityMap = new Map(qualities.map((q: any) => [q.id, q]))

    // Diamond
    if (stone.hasDiamond && stone.diamond && stoneWeights?.diamond) {
      result.diamond = {
        totalCarat: stoneWeights.diamond.carat,
        totalGrams: stoneWeights.diamond.grams,
        stoneCount: stoneWeights.diamond.stoneCount,
        entries: stone.diamond.entries.map((entry: any) => {
          const shape = shapeMap.get(entry.shapeId)
          return {
            shapeName: shape?.name || '',
            shapeSlug: shape?.slug || '',
            totalCarat: entry.totalCarat,
            noOfStones: entry.noOfStones,
          }
        }),
      }
    }

    // Gemstone
    if (stone.hasGemstone && stone.gemstone && stoneWeights?.gemstone) {
      const quality = qualityMap.get(stone.gemstone.qualityId)
      result.gemstone = {
        totalCarat: stoneWeights.gemstone.carat,
        totalGrams: stoneWeights.gemstone.grams,
        stoneCount: stoneWeights.gemstone.stoneCount,
        qualityName: quality?.name || '',
        entries: stone.gemstone.entries.map((entry: any) => {
          const type = typeMap.get(entry.typeId)
          const shape = shapeMap.get(entry.shapeId)
          return {
            typeName: type?.name || '',
            typeSlug: type?.slug || '',
            shapeName: shape?.name || '',
            shapeSlug: shape?.slug || '',
            totalCarat: entry.totalCarat,
            noOfStones: entry.noOfStones,
          }
        }),
      }
    }

    // Pearl
    if (stone.hasPearl && stone.pearl && stoneWeights?.pearl) {
      result.pearl = {
        totalGrams: stoneWeights.pearl.grams,
        totalCount: stoneWeights.pearl.count,
        entries: stone.pearl.entries.map((entry: any) => {
          const type = typeMap.get(entry.typeId)
          const quality = qualityMap.get(entry.qualityId)
          return {
            typeName: type?.name || '',
            typeSlug: type?.slug || '',
            qualityName: quality?.name || '',
            qualitySlug: quality?.slug || '',
            noOfPearls: entry.noOfPearls,
            totalGrams: entry.totalGrams,
          }
        }),
      }
    }

    return result
  }

  /**
   * Transform SEO JSONB to structured response
   */
  private transformSeo(seo: any): StorefrontDetailSeo {
    const s = seo || {}
    return {
      meta: {
        title: s.meta_title || null,
        keywords: s.meta_keywords || null,
        description: s.meta_description || null,
        robots: s.meta_robots || null,
        canonical: s.meta_canonical || null,
      },
      openGraph: {
        title: s.og_title || null,
        siteName: s.og_site_name || null,
        description: s.og_description || null,
        url: s.og_url || null,
        imageUrl: s.og_image_url || null,
      },
      twitter: {
        cardTitle: s.twitter_card_title || null,
        siteName: s.twitter_card_site_name || null,
        description: s.twitter_card_description || null,
        url: s.twitter_url || null,
        media: s.twitter_media || null,
      },
    }
  }

  /**
   * Fetch master data for pricing recalculation (size chart).
   * Same tables as price-recalculation.service.ts:fetchMasterData()
   */
  private async fetchPricingMasterData(): Promise<PricingMasterData> {
    const [metalPurities, stonePricings, makingCharges, otherCharges, mrpMarkup, pricingRules] =
      await Promise.all([
        db.query('SELECT id, metal_type_id, price FROM metal_purities WHERE status = true'),
        db.query('SELECT id, price FROM stone_prices WHERE status = true'),
        db.query(`SELECT id, metal_type_id, "from", "to", is_fixed_pricing, amount FROM making_charges WHERE status = true`),
        db.query('SELECT id, name, amount FROM other_charges WHERE status = true'),
        db.query('SELECT id, diamond, gemstone, pearl, making_charge FROM mrp_markup LIMIT 1'),
        db.query('SELECT id, name, conditions, actions, product_type FROM pricing_rules'),
      ])

    return {
      metalPurities: metalPurities.rows,
      stonePricings: stonePricings.rows,
      makingCharges: makingCharges.rows,
      otherCharges: otherCharges.rows,
      mrpMarkup: mrpMarkup.rows[0] || { diamond: 0, gemstone: 0, pearl: 0, making_charge: 0 },
      pricingRules: pricingRules.rows,
    }
  }

  /**
   * Full pricing recalculation from zero.
   * Same logic as calculateJewelleryDefaultPricing in price-recalculation.service.ts
   * Returns sellingPrice + compareAtPrice (no costPrice — not exposed in storefront)
   */
  private recalculateFullPricing(
    variantMeta: any,
    productMeta: any,
    masterData: PricingMasterData
  ): StorefrontVariantPricing {
    const metalPurityId = variantMeta.metalPurity
    const metalTypeId = variantMeta.metalType
    const metalWeight = variantMeta.metalWeight || 0
    const diamondClarityColorId = variantMeta.diamondClarityColor || null
    const gemstoneColorId = variantMeta.gemstoneColor || null
    const mrp = masterData.mrpMarkup

    // 1. Metal price
    const metalPurity = masterData.metalPurities.find(mp => mp.id === metalPurityId)
    const metalCostPrice = metalPurity ? Math.round(metalPurity.price * metalWeight) : 0

    // 2. Making charge
    const mc = masterData.makingCharges.find(
      m => m.metal_type_id === metalTypeId && metalWeight >= m.from && metalWeight <= m.to
    )
    let baseMakingCharge = 0
    if (mc) {
      baseMakingCharge = mc.is_fixed_pricing
        ? Math.round((metalWeight * mc.amount) * CURRENCY_CONFIG.subunits)
        : Math.round((mc.amount / 100) * metalCostPrice)
    }

    let totalOtherCharges = 0
    for (const oc of masterData.otherCharges) totalOtherCharges += oc.amount
    const makingChargeCost = baseMakingCharge + totalOtherCharges

    // 3. Diamond price
    let diamondCost = 0
    const diamondEntries = productMeta?.stone?.diamond?.entries || []
    if (diamondClarityColorId && diamondEntries.length > 0) {
      for (const entry of diamondEntries) {
        const match = entry.pricings?.find((p: any) => p.clarityColorId === diamondClarityColorId)
        if (match) {
          const sp = masterData.stonePricings.find(s => s.id === match.pricingId)
          if (sp) diamondCost += Math.round(sp.price * entry.totalCarat)
        }
      }
    }

    // 4. Gemstone price
    let gemstoneCost = 0
    const gemstoneEntries = productMeta?.stone?.gemstone?.entries || []
    if (gemstoneColorId && gemstoneEntries.length > 0) {
      for (const entry of gemstoneEntries) {
        const match = entry.pricings?.find((p: any) => p.colorId === gemstoneColorId)
        if (match) {
          const sp = masterData.stonePricings.find(s => s.id === match.pricingId)
          if (sp) gemstoneCost += Math.round(sp.price * entry.totalCarat)
        }
      }
    }

    // 5. Pearl price
    let pearlCost = 0
    if (productMeta?.stone?.hasPearl) {
      for (const entry of (productMeta.stone.pearl?.entries || [])) {
        if (entry.amount) pearlCost += entry.amount * CURRENCY_CONFIG.subunits
      }
    }

    // 6. Pricing rule markups
    let mcMarkup = 0, diaMarkup = 0, gemMarkup = 0, pearlMarkup = 0
    for (const rule of masterData.pricingRules) {
      if (rule.product_type !== PRODUCT_TYPES.JEWELLERY_DEFAULT.code) continue
      if (!this.matchesPricingRuleConditions(rule.conditions, variantMeta, productMeta)) continue

      if (rule.actions.makingChargeMarkup > 0)
        mcMarkup += Math.round(makingChargeCost * (rule.actions.makingChargeMarkup / 100))
      if (rule.actions.diamondMarkup > 0)
        diaMarkup += Math.round(diamondCost * (rule.actions.diamondMarkup / 100))
      if (rule.actions.gemstoneMarkup > 0)
        gemMarkup += Math.round(gemstoneCost * (rule.actions.gemstoneMarkup / 100))
      if (rule.actions.pearlMarkup > 0)
        pearlMarkup += Math.round(pearlCost * (rule.actions.pearlMarkup / 100))
    }

    // 7. Selling prices
    const mcSelling = makingChargeCost + mcMarkup
    const diaSelling = diamondCost + diaMarkup
    const gemSelling = gemstoneCost + gemMarkup
    const pearlSelling = pearlCost + pearlMarkup

    // 8. CompareAt prices (MRP markup on selling)
    const mcCompareAt = Math.round(mcSelling * (1 + (mrp.making_charge / 100)))
    const diaCompareAt = Math.round(diaSelling * (1 + (mrp.diamond / 100)))
    const gemCompareAt = Math.round(gemSelling * (1 + (mrp.gemstone / 100)))
    const pearlCompareAt = Math.round(pearlSelling * (1 + (mrp.pearl / 100)))

    // 9. Totals
    const sellingTotal = metalCostPrice + mcSelling + diaSelling + gemSelling + pearlSelling
    const compareAtTotal = metalCostPrice + mcCompareAt + diaCompareAt + gemCompareAt + pearlCompareAt

    // 10. Tax
    const taxRate = CURRENCY_CONFIG.includeTax ? CURRENCY_CONFIG.taxRatePercent / 100 : 0
    const sellingTax = Math.round(sellingTotal * taxRate)
    const compareAtTax = Math.round(compareAtTotal * taxRate)
    const includeTax = CURRENCY_CONFIG.includeTax

    return {
      sellingPrice: {
        metalPrice: metalCostPrice,
        makingCharge: mcSelling,
        diamondPrice: diaSelling,
        gemstonePrice: gemSelling,
        pearlPrice: pearlSelling,
        finalPriceWithoutTax: sellingTotal,
        taxAmount: sellingTax,
        finalPriceWithTax: sellingTotal + sellingTax,
        taxIncluded: includeTax,
        finalPrice: includeTax ? sellingTotal + sellingTax : sellingTotal,
      },
      compareAtPrice: {
        metalPrice: metalCostPrice,
        makingCharge: mcCompareAt,
        diamondPrice: diaCompareAt,
        gemstonePrice: gemCompareAt,
        pearlPrice: pearlCompareAt,
        finalPriceWithoutTax: compareAtTotal,
        taxAmount: compareAtTax,
        finalPriceWithTax: compareAtTotal + compareAtTax,
        taxIncluded: includeTax,
        finalPrice: includeTax ? compareAtTotal + compareAtTax : compareAtTotal,
      },
    }
  }

  /**
   * Evaluate pricing rule conditions against variant/product metadata.
   * Same logic as matchesConditions in price-recalculation.service.ts
   */
  private matchesPricingRuleConditions(conditions: any[], variantMeta: any, productMeta: any): boolean {
    if (!conditions || conditions.length === 0) return false

    for (const cond of conditions) {
      let matched = false

      if (cond.type === 'category') {
        const ids = productMeta?.attributes?.categories?.map((c: any) => c.id) || []
        matched = cond.value.matchType === 'any'
          ? cond.value.categoryIds.some((id: string) => ids.includes(id))
          : cond.value.categoryIds.every((id: string) => ids.includes(id))
      } else if (cond.type === 'tags') {
        const ids = productMeta?.attributes?.tags?.map((t: any) => t.id) || []
        matched = cond.value.matchType === 'any'
          ? cond.value.tagIds.some((id: string) => ids.includes(id))
          : cond.value.tagIds.every((id: string) => ids.includes(id))
      } else if (cond.type === 'badges') {
        const ids = productMeta?.attributes?.badges?.map((b: any) => b.id) || []
        matched = cond.value.matchType === 'any'
          ? cond.value.badgeIds.some((id: string) => ids.includes(id))
          : cond.value.badgeIds.every((id: string) => ids.includes(id))
      } else if (cond.type === 'metal_type') {
        matched = cond.value.metalTypeIds.includes(variantMeta.metalType)
      } else if (cond.type === 'metal_color') {
        matched = cond.value.metalColorIds.includes(variantMeta.metalColor)
      } else if (cond.type === 'metal_purity') {
        matched = cond.value.metalPurityIds.includes(variantMeta.metalPurity)
      } else if (cond.type === 'diamond_clarity_color') {
        matched = productMeta?.stone?.hasDiamond && variantMeta.diamondClarityColor
          ? cond.value.diamondClarityColorIds.includes(variantMeta.diamondClarityColor) : false
      } else if (cond.type === 'diamond_carat') {
        if (!productMeta?.stone?.hasDiamond) { matched = false } else {
          let total = 0
          for (const e of (productMeta.stone.diamond?.entries || [])) total += e.totalCarat
          matched = total >= cond.value.from && total <= cond.value.to
        }
      } else if (cond.type === 'metal_weight') {
        const w = variantMeta.metalWeight || variantMeta.weights?.metal?.grams || 0
        matched = w >= cond.value.from && w <= cond.value.to
      } else if (cond.type === 'gemstone_carat') {
        if (!productMeta?.stone?.hasGemstone) { matched = false } else {
          let total = 0
          for (const e of (productMeta.stone.gemstone?.entries || [])) total += e.totalCarat
          matched = total >= cond.value.from && total <= cond.value.to
        }
      } else if (cond.type === 'pearl_gram') {
        if (!productMeta?.stone?.hasPearl) { matched = false } else {
          let total = 0
          for (const e of (productMeta.stone.pearl?.entries || [])) total += e.totalGrams
          matched = total >= cond.value.from && total <= cond.value.to
        }
      }

      if (!matched) return false
    }
    return true
  }

  /**
   * Transform variant rows — extract master data IDs from variant metadata
   */
  private transformVariants(variants: any[]): StorefrontProductVariant[] {
    return variants.map((v: any) => ({
      id: v.id,
      sku: v.sku,
      price: v.price,
      compare_at_price: v.compare_at_price,
      is_available: v.is_available,
      options: {
        metalType: v.metadata?.metalType || null,
        metalColor: v.metadata?.metalColor || null,
        metalPurity: v.metadata?.metalPurity || null,
        diamondClarityColor: v.metadata?.diamondClarityColor || null,
        gemstoneColor: v.metadata?.gemstoneColor || null,
      },
    }))
  }

  /**
   * Look up sort config from sort_by_options table.
   * Falls back to 'newest' if the given key is invalid/inactive.
   */
  private async getSortConfig(sortKey: string) {
    const result = await db.query(
      `SELECT sort_column, sort_direction, tiebreaker_column, tiebreaker_direction
       FROM sort_by_options
       WHERE key = $1 AND is_active = TRUE`,
      [sortKey]
    )

    if (result.rows.length > 0) {
      return result.rows[0] as {
        sort_column: string
        sort_direction: string
        tiebreaker_column: string | null
        tiebreaker_direction: string | null
      }
    }

    // Fallback to newest
    const fallback = await db.query(
      `SELECT sort_column, sort_direction, tiebreaker_column, tiebreaker_direction
       FROM sort_by_options
       WHERE key = 'newest'`
    )

    return fallback.rows[0] as {
      sort_column: string
      sort_direction: string
      tiebreaker_column: string | null
      tiebreaker_direction: string | null
    }
  }

  /**
   * Group selected tag IDs by their tag group.
   * Returns Map<tagGroupId, tagIds[]> so each group gets a separate EXISTS clause.
   */
  private async groupTagsByTagGroup(tagIds: string[]): Promise<Map<string, string[]>> {
    const result = await db.query(
      `SELECT id, tag_group_id FROM tags WHERE id = ANY($1)`,
      [tagIds]
    )

    const grouped = new Map<string, string[]>()
    for (const row of result.rows) {
      if (!grouped.has(row.tag_group_id)) {
        grouped.set(row.tag_group_id, [])
      }
      grouped.get(row.tag_group_id)!.push(row.id)
    }
    return grouped
  }

  /**
   * Get min/max values for selected price range IDs
   */
  private async getPriceRangeValues(priceRangeIds: string[]) {
    const result = await db.query(
      `SELECT min_price, max_price FROM price_filter_ranges WHERE id = ANY($1)`,
      [priceRangeIds]
    )
    return result.rows as { min_price: number; max_price: number }[]
  }
}

export const storefrontProductsService = new StorefrontProductsService()
