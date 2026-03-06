import { db } from '../../../lib/db'
import type { ProductError } from '../types/similar-products.types'

const BATCH_SIZE = 100
const CHECK_INTERVAL = 10
const MAX_SIMILAR = 10

class SimilarProductsSyncService {
  trigger(userId?: string): void {
    this.handleTrigger(userId).catch(err =>
      console.error('[SimilarProductsSync] trigger error:', err)
    )
  }

  async listJobs() {
    const result = await db.query(
      `SELECT id, status, triggered_by, total_products, processed_products,
              failed_products, error_details, started_at, completed_at, created_at
       FROM similar_products_sync_jobs
       ORDER BY created_at DESC
       LIMIT 20`
    )
    return { items: result.rows }
  }

  private async handleTrigger(userId?: string): Promise<void> {
    await db.query(
      `INSERT INTO similar_products_sync_jobs (status, triggered_by) VALUES ('pending', $1)`,
      [userId || null]
    )

    const cancelled = await db.query(
      `UPDATE similar_products_sync_jobs SET status = 'cancelled', completed_at = NOW()
       WHERE status = 'running' RETURNING id`
    )

    if (cancelled.rowCount === 0) {
      this.processLoop().catch(err =>
        console.error('[SimilarProductsSync] processLoop error:', err)
      )
    }
  }

  private async processLoop(): Promise<void> {
    while (true) {
      const pending = await db.query(
        `SELECT id, triggered_by FROM similar_products_sync_jobs
         WHERE status = 'pending' ORDER BY created_at DESC LIMIT 1`
      )
      if (pending.rows.length === 0) return

      const job = pending.rows[0]

      await db.query(
        `UPDATE similar_products_sync_jobs SET status = 'cancelled', completed_at = NOW()
         WHERE status = 'pending' AND id != $1`,
        [job.id]
      )

      const claimed = await db.query(
        `UPDATE similar_products_sync_jobs SET status = 'running', started_at = NOW()
         WHERE id = $1 AND status = 'pending' RETURNING id`,
        [job.id]
      )
      if (claimed.rows.length === 0) continue

      await this.runJob(job.id)
    }
  }

  private async runJob(jobId: string): Promise<void> {
    const startTime = Date.now()
    console.log(`[SimilarProductsSync] Job ${jobId} started`)

    try {
      await this.processAllProducts(jobId)
    } catch (err: any) {
      console.error(`[SimilarProductsSync] Job ${jobId} fatal error:`, err)
      await db.query(
        `UPDATE similar_products_sync_jobs SET status = 'failed', completed_at = NOW(),
         error_details = $1 WHERE id = $2`,
        [JSON.stringify([{ productId: 'N/A', productName: 'N/A', error: err.message }]), jobId]
      ).catch(() => {})
    } finally {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2)
      console.log(`[SimilarProductsSync] Job ${jobId} finished in ${duration}s`)
    }
  }

  private async processAllProducts(jobId: string): Promise<void> {
    // Phase 1: Pre-load all data
    const countResult = await db.query(
      `SELECT COUNT(*)::int as count FROM products WHERE status = 'active'`
    )
    const totalProducts = countResult.rows[0].count

    await db.query(
      `UPDATE similar_products_sync_jobs SET total_products = $1 WHERE id = $2`,
      [totalProducts, jobId]
    )

    if (totalProducts === 0) {
      await db.query(
        `UPDATE similar_products_sync_jobs SET status = 'completed', completed_at = NOW() WHERE id = $1`,
        [jobId]
      )
      return
    }

    const [
      productsResult,
      categoriesResult,
      tagsResult,
      badgesResult,
      configResult,
      manualPicksResult,
    ] = await Promise.all([
      db.query(`SELECT id, product_type, min_price, max_price FROM products WHERE status = 'active'`),
      db.query(`SELECT product_id, category_id, is_primary FROM product_categories`),
      db.query(
        `SELECT pt.product_id, pt.tag_id FROM product_tags pt
         JOIN tags t ON t.id = pt.tag_id WHERE t.is_system_generated = false`
      ),
      db.query(`SELECT product_id, badge_id FROM product_badges`),
      db.query(`SELECT condition_key, weight, is_active FROM similar_products_scoring_config`),
      db.query(`SELECT product_id, similar_product_id FROM similar_products WHERE source = 'manual'`),
    ])

    const products = productsResult.rows
    const activeProductIds = new Set(products.map((p: any) => p.id))

    // Build lookup maps
    const productMap = new Map<string, any>()
    for (const p of products) productMap.set(p.id, p)

    const primaryCategoryMap = new Map<string, string>()
    const categoriesMap = new Map<string, Set<string>>()
    for (const row of categoriesResult.rows) {
      if (!activeProductIds.has(row.product_id)) continue
      if (row.is_primary) primaryCategoryMap.set(row.product_id, row.category_id)
      if (!categoriesMap.has(row.product_id)) categoriesMap.set(row.product_id, new Set())
      if (!row.is_primary) categoriesMap.get(row.product_id)!.add(row.category_id)
    }

    const tagsMap = new Map<string, Set<string>>()
    for (const row of tagsResult.rows) {
      if (!activeProductIds.has(row.product_id)) continue
      if (!tagsMap.has(row.product_id)) tagsMap.set(row.product_id, new Set())
      tagsMap.get(row.product_id)!.add(row.tag_id)
    }

    const badgesMap = new Map<string, Set<string>>()
    for (const row of badgesResult.rows) {
      if (!activeProductIds.has(row.product_id)) continue
      if (!badgesMap.has(row.product_id)) badgesMap.set(row.product_id, new Set())
      badgesMap.get(row.product_id)!.add(row.badge_id)
    }

    const configMap = new Map<string, { weight: number; is_active: boolean }>()
    for (const row of configResult.rows) {
      configMap.set(row.condition_key, { weight: row.weight, is_active: row.is_active })
    }

    const manualPicksByProduct = new Map<string, Set<string>>()
    for (const row of manualPicksResult.rows) {
      if (!manualPicksByProduct.has(row.product_id)) manualPicksByProduct.set(row.product_id, new Set())
      manualPicksByProduct.get(row.product_id)!.add(row.similar_product_id)
    }

    // Phase 2: Score all products
    let processedCount = 0
    let failedCount = 0
    const errors: ProductError[] = []
    const allSystemEntries: { product_id: string; similar_product_id: string; score: number; rank: number }[] = []

    for (let i = 0; i < products.length; i++) {
      if (processedCount > 0 && processedCount % CHECK_INTERVAL === 0) {
        const pendingCheck = await db.query(
          `SELECT id FROM similar_products_sync_jobs WHERE status = 'pending' LIMIT 1`
        )
        if (pendingCheck.rows.length > 0) {
          await db.query(
            `UPDATE similar_products_sync_jobs SET status = 'cancelled', completed_at = NOW(),
             processed_products = $1, failed_products = $2 WHERE id = $3`,
            [processedCount, failedCount, jobId]
          )
          console.log(`[SimilarProductsSync] Job ${jobId} cancelled at ${processedCount}/${totalProducts}`)
          return
        }
        await db.query(
          `UPDATE similar_products_sync_jobs SET processed_products = $1, failed_products = $2 WHERE id = $3`,
          [processedCount, failedCount, jobId]
        )
      }

      const product = products[i]
      try {
        const manualPicks = manualPicksByProduct.get(product.id) || new Set()
        const remainingSlots = MAX_SIMILAR - manualPicks.size

        if (remainingSlots <= 0) {
          processedCount++
          continue
        }

        // Score all other products
        const scored: { id: string; score: number }[] = []
        for (const candidate of products) {
          if (candidate.id === product.id) continue
          if (manualPicks.has(candidate.id)) continue

          const score = this.scoreProducts(
            product.id, candidate.id, productMap, primaryCategoryMap,
            categoriesMap, tagsMap, badgesMap, configMap
          )
          if (score > 0) scored.push({ id: candidate.id, score })
        }

        scored.sort((a, b) => b.score - a.score)
        const topCandidates = scored.slice(0, remainingSlots)

        for (let r = 0; r < topCandidates.length; r++) {
          allSystemEntries.push({
            product_id: product.id,
            similar_product_id: topCandidates[r].id,
            score: topCandidates[r].score,
            rank: r,
          })
        }
      } catch (err: any) {
        failedCount++
        errors.push({
          productId: product.id,
          productName: product.id,
          error: err.message,
        })
      }
      processedCount++
    }

    // Phase 3: Write results
    await db.query(`DELETE FROM similar_products WHERE source = 'system'`)

    // Batch insert system entries
    for (let i = 0; i < allSystemEntries.length; i += 50) {
      const batch = allSystemEntries.slice(i, i + 50)
      const values: any[] = []
      const clauses: string[] = []
      batch.forEach((entry, idx) => {
        const b = idx * 4
        clauses.push(`($${b + 1}, $${b + 2}, 'system', $${b + 3}, $${b + 4})`)
        values.push(entry.product_id, entry.similar_product_id, entry.score, entry.rank)
      })
      await db.query(
        `INSERT INTO similar_products (product_id, similar_product_id, source, score, rank)
         VALUES ${clauses.join(', ')}
         ON CONFLICT (product_id, similar_product_id) DO UPDATE
         SET source = 'system', score = EXCLUDED.score, rank = EXCLUDED.rank`,
        values
      )
    }

    await db.query(
      `UPDATE similar_products_sync_jobs
       SET status = 'completed', processed_products = $1, failed_products = $2,
           error_details = $3, completed_at = NOW()
       WHERE id = $4 AND status = 'running'`,
      [processedCount, failedCount, JSON.stringify(errors), jobId]
    )
    console.log(`[SimilarProductsSync] Job ${jobId} completed: ${processedCount} processed, ${failedCount} failed, ${allSystemEntries.length} system entries created`)
  }

  private scoreProducts(
    productId: string,
    candidateId: string,
    productMap: Map<string, any>,
    primaryCategoryMap: Map<string, string>,
    categoriesMap: Map<string, Set<string>>,
    tagsMap: Map<string, Set<string>>,
    badgesMap: Map<string, Set<string>>,
    configMap: Map<string, { weight: number; is_active: boolean }>
  ): number {
    const product = productMap.get(productId)!
    const candidate = productMap.get(candidateId)!
    let score = 0

    // 1. Primary Category
    const pcConfig = configMap.get('primary_category')
    if (pcConfig?.is_active && pcConfig.weight > 0) {
      const pCat = primaryCategoryMap.get(productId)
      const cCat = primaryCategoryMap.get(candidateId)
      if (pCat && cCat && pCat === cCat) score += pcConfig.weight
    }

    // 2. Shared Categories
    const scConfig = configMap.get('shared_categories')
    if (scConfig?.is_active && scConfig.weight > 0) {
      const pCats = categoriesMap.get(productId)
      const cCats = categoriesMap.get(candidateId)
      if (pCats && cCats) {
        let shared = 0
        for (const cat of pCats) if (cCats.has(cat)) shared++
        const factor = Math.min(shared / 3, 1)
        score += Math.round(scConfig.weight * factor)
      }
    }

    // 3. Shared Tags
    const stConfig = configMap.get('shared_tags')
    if (stConfig?.is_active && stConfig.weight > 0) {
      const pTags = tagsMap.get(productId)
      const cTags = tagsMap.get(candidateId)
      if (pTags && cTags) {
        let shared = 0
        for (const tag of pTags) if (cTags.has(tag)) shared++
        const factor = Math.min(shared / 5, 1)
        score += Math.round(stConfig.weight * factor)
      }
    }

    // 4. Price Proximity
    const ppConfig = configMap.get('price_proximity')
    if (ppConfig?.is_active && ppConfig.weight > 0) {
      const pPrice = product.min_price || 0
      const cPrice = candidate.min_price || 0
      if (pPrice > 0 && cPrice > 0) {
        const lower = pPrice * 0.7
        const upper = pPrice * 1.3
        if (cPrice >= lower && cPrice <= upper) score += ppConfig.weight
      }
    }

    // 5. Same Product Type
    const ptConfig = configMap.get('same_product_type')
    if (ptConfig?.is_active && ptConfig.weight > 0) {
      if (product.product_type === candidate.product_type) score += ptConfig.weight
    }

    // 6. Shared Badges
    const sbConfig = configMap.get('shared_badges')
    if (sbConfig?.is_active && sbConfig.weight > 0) {
      const pBadges = badgesMap.get(productId)
      const cBadges = badgesMap.get(candidateId)
      if (pBadges && cBadges) {
        let shared = 0
        for (const badge of pBadges) if (cBadges.has(badge)) shared++
        const factor = Math.min(shared / 2, 1)
        score += Math.round(sbConfig.weight * factor)
      }
    }

    return score
  }
}

export const similarProductsSyncService = new SimilarProductsSyncService()
