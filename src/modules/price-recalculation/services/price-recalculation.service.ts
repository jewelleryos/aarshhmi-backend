import { db } from '../../../lib/db'
import { CURRENCY_CONFIG } from '../../../config/currency'
import { PRODUCT_TYPES } from '../../../config/product.config'
import type { TriggerSource, ProductError } from '../types/price-recalculation.types'

const BATCH_SIZE = parseInt(process.env.PRICE_RECALC_BATCH_SIZE || '100')
const CHECK_INTERVAL = parseInt(process.env.PRICE_RECALC_CHECK_INTERVAL || '10')
const VARIANT_UPDATE_BATCH = 50

class PriceRecalculationService {
    trigger(source: TriggerSource, userId?: string): void {
        this.handleTrigger(source, userId).catch(err =>
            console.error('[PriceRecalc] trigger error:', err)
        )
    }

    private async handleTrigger(source: TriggerSource, userId?: string): Promise<void> {
        await db.query(
            `INSERT INTO price_recalculation_jobs (status, trigger_source, triggered_by)
             VALUES ('pending', $1, $2)`,
            [source, userId || null]
        )

        const cancelled = await db.query(
            `UPDATE price_recalculation_jobs SET status = 'cancelled', completed_at = NOW()
             WHERE status = 'running' RETURNING id`
        )

        if (cancelled.rowCount === 0) {
            this.processLoop().catch(err =>
                console.error('[PriceRecalc] processLoop error:', err)
            )
        }
    }

    private async processLoop(): Promise<void> {
        while (true) {
            const pending = await db.query(
                `SELECT id, trigger_source, triggered_by FROM price_recalculation_jobs
                 WHERE status = 'pending' ORDER BY created_at DESC LIMIT 1`
            )
            if (pending.rows.length === 0) return

            const job = pending.rows[0]

            await db.query(
                `UPDATE price_recalculation_jobs SET status = 'cancelled', completed_at = NOW()
                 WHERE status = 'pending' AND id != $1`,
                [job.id]
            )

            const claimed = await db.query(
                `UPDATE price_recalculation_jobs SET status = 'running', started_at = NOW()
                 WHERE id = $1 AND status = 'pending' RETURNING id`,
                [job.id]
            )
            if (claimed.rows.length === 0) continue

            await this.runJob(job.id, job.trigger_source, job.triggered_by)
        }
    }

    private async runJob(jobId: string, source: string, userId?: string): Promise<void> {
        const startTime = Date.now()
        console.log(`[PriceRecalc] Job ${jobId} started (trigger: ${source}, user: ${userId || 'system'})`)

        try {
            await this.processAllProducts(jobId)
        } catch (err: any) {
            console.error(`[PriceRecalc] Job ${jobId} fatal error:`, err)
            await db.query(
                `UPDATE price_recalculation_jobs SET status = 'failed', completed_at = NOW(),
                 error_details = $1 WHERE id = $2`,
                [JSON.stringify([{ productId: 'N/A', productName: 'N/A', error: err.message }]), jobId]
            ).catch(() => { })
        } finally {
            const duration = ((Date.now() - startTime) / 1000).toFixed(2)
            console.log(`[PriceRecalc] Job ${jobId} finished in ${duration}s`)
        }
    }

    private async processAllProducts(jobId: string): Promise<void> {
        const countResult = await db.query(`SELECT COUNT(*)::int as count FROM products`)
        const totalProducts = countResult.rows[0].count

        await db.query(
            `UPDATE price_recalculation_jobs SET total_products = $1 WHERE id = $2`,
            [totalProducts, jobId]
        )

        if (totalProducts === 0) {
            await db.query(
                `UPDATE price_recalculation_jobs SET status = 'completed', completed_at = NOW() WHERE id = $1`,
                [jobId]
            )
            return
        }

        const masterData = await this.fetchMasterData()

        let processedCount = 0
        let failedCount = 0
        const errors: ProductError[] = []
        let offset = 0

        while (offset < totalProducts) {
            const batchResult = await db.query(
                `SELECT p.id, p.name, p.base_sku, p.metadata, p.product_type,
                   COALESCE(
                     json_agg(json_build_object('id', pv.id, 'metadata', pv.metadata))
                     FILTER (WHERE pv.id IS NOT NULL), '[]'::json
                   ) as variants
                 FROM products p
                 LEFT JOIN product_variants pv ON pv.product_id = p.id
                 GROUP BY p.id, p.name, p.base_sku, p.metadata, p.product_type
                 ORDER BY p.created_at
                 LIMIT $1 OFFSET $2`,
                [BATCH_SIZE, offset]
            )

            const products = batchResult.rows
            if (products.length === 0) break

            const allVariantUpdates: VariantUpdate[] = []
            const productPriceUpdates: ProductPriceUpdate[] = []

            for (const product of products) {
                if (processedCount > 0 && processedCount % CHECK_INTERVAL === 0) {
                    const pendingCheck = await db.query(
                        `SELECT id FROM price_recalculation_jobs WHERE status = 'pending' LIMIT 1`
                    )
                    if (pendingCheck.rows.length > 0) {
                        await db.query(
                            `UPDATE price_recalculation_jobs SET status = 'cancelled', completed_at = NOW(),
                             processed_products = $1, failed_products = $2 WHERE id = $3`,
                            [processedCount, failedCount, jobId]
                        )
                        console.log(`[PriceRecalc] Job ${jobId} cancelled at ${processedCount}/${totalProducts} (new trigger pending)`)
                        return
                    }
                    await db.query(
                        `UPDATE price_recalculation_jobs SET processed_products = $1, failed_products = $2 WHERE id = $3`,
                        [processedCount, failedCount, jobId]
                    )
                }

                try {
                    const variants = product.variants || []
                    if (variants.length === 0) { processedCount++; continue }

                    const variantUpdates: VariantUpdate[] = []
                    for (const variant of variants) {
                        const pricing = this.calculatePricingByProductType(
                            product.product_type, variant.metadata || {}, product.metadata || {}, masterData
                        )
                        variantUpdates.push({
                            id: variant.id,
                            price: pricing.sellingPrice.finalPrice,
                            compareAtPrice: pricing.compareAtPrice.finalPrice,
                            costPrice: pricing.costPrice.finalPrice,
                            priceComponents: pricing,
                        })
                    }

                    allVariantUpdates.push(...variantUpdates)

                    const prices = variantUpdates.map(u => u.price)
                    productPriceUpdates.push({
                        id: product.id,
                        minPrice: Math.min(...prices),
                        maxPrice: Math.max(...prices),
                    })
                } catch (err: any) {
                    failedCount++
                    errors.push({
                        productId: product.id,
                        productName: product.name || product.base_sku,
                        error: err.message,
                    })
                }
                processedCount++
            }

            for (let i = 0; i < allVariantUpdates.length; i += VARIANT_UPDATE_BATCH) {
                const batch = allVariantUpdates.slice(i, i + VARIANT_UPDATE_BATCH)
                const values: any[] = []
                const clauses: string[] = []
                batch.forEach((u, idx) => {
                    const b = idx * 5
                    clauses.push(`($${b + 1}, $${b + 2}::int, $${b + 3}::int, $${b + 4}::int, $${b + 5}::jsonb)`)
                    values.push(u.id, u.price, u.compareAtPrice, u.costPrice, JSON.stringify(u.priceComponents))
                })
                await db.query(
                    `UPDATE product_variants AS pv SET
                     price = v.price, compare_at_price = v.compare_at_price,
                     cost_price = v.cost_price, price_components = v.price_components
                   FROM (VALUES ${clauses.join(', ')}) AS v(id, price, compare_at_price, cost_price, price_components)
                   WHERE pv.id = v.id::text`,
                    values
                )
            }

            if (productPriceUpdates.length > 0) {
                const values: any[] = []
                const clauses: string[] = []
                productPriceUpdates.forEach((p, idx) => {
                    const b = idx * 3
                    clauses.push(`($${b + 1}, $${b + 2}::int, $${b + 3}::int)`)
                    values.push(p.id, p.minPrice, p.maxPrice)
                })
                await db.query(
                    `UPDATE products AS p SET min_price = v.min_price, max_price = v.max_price, updated_at = NOW()
                   FROM (VALUES ${clauses.join(', ')}) AS v(id, min_price, max_price)
                   WHERE p.id = v.id::text`,
                    values
                )
            }

            offset += BATCH_SIZE
        }

        await db.query(
            `UPDATE price_recalculation_jobs
             SET status = 'completed', processed_products = $1, failed_products = $2,
                 error_details = $3, completed_at = NOW()
             WHERE id = $4 AND status = 'running'`,
            [processedCount, failedCount, JSON.stringify(errors), jobId]
        )
        console.log(`[PriceRecalc] Job ${jobId} completed: ${processedCount} processed, ${failedCount} failed`)
    }

    private calculatePricingByProductType(
        productType: string, variantMeta: any, productMeta: any, masterData: MasterData
    ) {
        switch (productType) {
            case PRODUCT_TYPES.JEWELLERY_DEFAULT.code:
                return this.calculateJewelleryDefaultPricing(variantMeta, productMeta, masterData)
            default:
                return this.calculateJewelleryDefaultPricing(variantMeta, productMeta, masterData)
        }
    }

    private calculateJewelleryDefaultPricing(variantMeta: any, productMeta: any, masterData: MasterData) {
        const metalPurityId = variantMeta.metalPurity
        const metalTypeId = variantMeta.metalType
        const metalWeight = variantMeta.metalWeight || variantMeta.weights?.metal?.grams || 0
        const diamondClarityColorId = variantMeta.diamondClarityColor || null
        const gemstoneColorId = variantMeta.gemstoneColor || null
        const mrp = masterData.mrpMarkup

        const metalPurity = masterData.metalPurities.find(mp => mp.id === metalPurityId)
        const metalCostPrice = metalPurity ? Math.round(metalPurity.price * metalWeight) : 0

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

        let pearlCost = 0
        if (productMeta?.stone?.hasPearl) {
            for (const entry of (productMeta.stone.pearl?.entries || [])) {
                if (entry.amount) pearlCost += entry.amount * CURRENCY_CONFIG.subunits
            }
        }

        let mcMarkup = 0, diaMarkup = 0, gemMarkup = 0, pearlMarkup = 0
        for (const rule of masterData.pricingRules) {
            if (rule.product_type !== PRODUCT_TYPES.JEWELLERY_DEFAULT.code) continue
            if (!this.matchesConditions(rule.conditions, variantMeta, productMeta)) continue

            if (rule.actions.makingChargeMarkup > 0)
                mcMarkup += Math.round(makingChargeCost * (rule.actions.makingChargeMarkup / 100))
            if (rule.actions.diamondMarkup > 0)
                diaMarkup += Math.round(diamondCost * (rule.actions.diamondMarkup / 100))
            if (rule.actions.gemstoneMarkup > 0)
                gemMarkup += Math.round(gemstoneCost * (rule.actions.gemstoneMarkup / 100))
            if (rule.actions.pearlMarkup > 0)
                pearlMarkup += Math.round(pearlCost * (rule.actions.pearlMarkup / 100))
        }

        const mcSelling = makingChargeCost + mcMarkup
        const diaSelling = diamondCost + diaMarkup
        const gemSelling = gemstoneCost + gemMarkup
        const pearlSelling = pearlCost + pearlMarkup

        const mcCompareAt = Math.round(mcSelling * (1 + (mrp.making_charge / 100)))
        const diaCompareAt = Math.round(diaSelling * (1 + (mrp.diamond / 100)))
        const gemCompareAt = Math.round(gemSelling * (1 + (mrp.gemstone / 100)))
        const pearlCompareAt = Math.round(pearlSelling * (1 + (mrp.pearl / 100)))

        const costTotal = metalCostPrice + makingChargeCost + diamondCost + gemstoneCost + pearlCost
        const sellingTotal = metalCostPrice + mcSelling + diaSelling + gemSelling + pearlSelling
        const compareAtTotal = metalCostPrice + mcCompareAt + diaCompareAt + gemCompareAt + pearlCompareAt

        const taxRate = CURRENCY_CONFIG.includeTax ? CURRENCY_CONFIG.taxRatePercent / 100 : 0
        const costTax = Math.round(costTotal * taxRate)
        const sellingTax = Math.round(sellingTotal * taxRate)
        const compareAtTax = Math.round(compareAtTotal * taxRate)

        const includeTax = CURRENCY_CONFIG.includeTax
        return {
            costPrice: {
                metalPrice: metalCostPrice, makingCharge: makingChargeCost,
                diamondPrice: diamondCost, gemstonePrice: gemstoneCost, pearlPrice: pearlCost,
                finalPriceWithoutTax: costTotal, taxAmount: costTax,
                finalPriceWithTax: costTotal + costTax, taxIncluded: includeTax,
                finalPrice: includeTax ? costTotal + costTax : costTotal,
            },
            sellingPrice: {
                metalPrice: metalCostPrice, makingCharge: mcSelling,
                diamondPrice: diaSelling, gemstonePrice: gemSelling, pearlPrice: pearlSelling,
                finalPriceWithoutTax: sellingTotal, taxAmount: sellingTax,
                finalPriceWithTax: sellingTotal + sellingTax, taxIncluded: includeTax,
                finalPrice: includeTax ? sellingTotal + sellingTax : sellingTotal,
            },
            compareAtPrice: {
                metalPrice: metalCostPrice, makingCharge: mcCompareAt,
                diamondPrice: diaCompareAt, gemstonePrice: gemCompareAt, pearlPrice: pearlCompareAt,
                finalPriceWithoutTax: compareAtTotal, taxAmount: compareAtTax,
                finalPriceWithTax: compareAtTotal + compareAtTax, taxIncluded: includeTax,
                finalPrice: includeTax ? compareAtTotal + compareAtTax : compareAtTotal,
            },
        }
    }

    private matchesConditions(conditions: any[], variantMeta: any, productMeta: any): boolean {
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

    private async fetchMasterData(): Promise<MasterData> {
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
}

interface VariantUpdate {
    id: string
    price: number
    compareAtPrice: number
    costPrice: number
    priceComponents: any
}

interface ProductPriceUpdate {
    id: string
    minPrice: number
    maxPrice: number
}

interface MasterData {
    metalPurities: any[]
    stonePricings: any[]
    makingCharges: any[]
    otherCharges: any[]
    mrpMarkup: any
    pricingRules: any[]
}

export const priceRecalculationService = new PriceRecalculationService()
