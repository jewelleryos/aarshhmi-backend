import { db } from '../../../lib/db'
import { AppError } from '../../../utils/app-error'
import { HTTP_STATUS } from '../../../config/constants'
import { similarProductsMessages } from '../config/similar-products.messages'

class SimilarProductsService {
  async listProducts(query: { search?: string; page?: number; limit?: number }) {
    const page = query.page || 1
    const limit = query.limit || 20
    const offset = (page - 1) * limit

    let whereClause = `WHERE p.status = 'active'`
    const values: any[] = []
    let paramIdx = 1

    if (query.search) {
      whereClause += ` AND (p.name ILIKE $${paramIdx} OR p.base_sku ILIKE $${paramIdx})`
      values.push(`%${query.search}%`)
      paramIdx++
    }

    const countResult = await db.query(
      `SELECT COUNT(*)::int as count FROM products p ${whereClause}`,
      values
    )

    const result = await db.query(
      `SELECT
        p.id,
        p.name,
        p.base_sku,
        p.status,
        (SELECT pv.price FROM product_variants pv WHERE pv.product_id = p.id AND pv.is_default = true LIMIT 1) as selling_price,
        COALESCE((SELECT COUNT(*)::int FROM similar_products sp WHERE sp.product_id = p.id), 0) as similar_count,
        COALESCE((SELECT COUNT(*)::int FROM similar_products sp WHERE sp.product_id = p.id AND sp.source = 'manual'), 0) as manual_count,
        COALESCE((SELECT COUNT(*)::int FROM similar_products sp WHERE sp.product_id = p.id AND sp.source = 'system'), 0) as system_count
       FROM products p
       ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...values, limit, offset]
    )

    return {
      items: result.rows,
      pagination: {
        page,
        limit,
        total: countResult.rows[0].count,
        totalPages: Math.ceil(countResult.rows[0].count / limit),
      },
    }
  }

  async getSimilarProducts(productId: string) {
    const productCheck = await db.query(
      `SELECT id, name, base_sku FROM products WHERE id = $1`,
      [productId]
    )
    if (productCheck.rows.length === 0) {
      throw new AppError(similarProductsMessages.PRODUCT_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    const manual = await db.query(
      `SELECT sp.id, sp.rank,
        json_build_object(
          'id', p.id, 'name', p.name, 'base_sku', p.base_sku,
          'selling_price', (SELECT pv.price FROM product_variants pv WHERE pv.product_id = p.id AND pv.is_default = true LIMIT 1),
          'status', p.status
        ) as product
       FROM similar_products sp
       JOIN products p ON p.id = sp.similar_product_id
       WHERE sp.product_id = $1 AND sp.source = 'manual'
       ORDER BY sp.rank ASC`,
      [productId]
    )

    const system = await db.query(
      `SELECT sp.id, sp.score, sp.rank,
        json_build_object(
          'id', p.id, 'name', p.name, 'base_sku', p.base_sku,
          'selling_price', (SELECT pv.price FROM product_variants pv WHERE pv.product_id = p.id AND pv.is_default = true LIMIT 1),
          'status', p.status
        ) as product
       FROM similar_products sp
       JOIN products p ON p.id = sp.similar_product_id
       WHERE sp.product_id = $1 AND sp.source = 'system'
       ORDER BY sp.score DESC, sp.rank ASC`,
      [productId]
    )

    return {
      manual: manual.rows,
      system: system.rows,
      totalCount: manual.rows.length + system.rows.length,
      manualCount: manual.rows.length,
      systemCount: system.rows.length,
    }
  }

  async updateManualPicks(productId: string, manualProductIds: string[], removedSystemProductIds?: string[]) {
    const productCheck = await db.query(
      `SELECT id FROM products WHERE id = $1`,
      [productId]
    )
    if (productCheck.rows.length === 0) {
      throw new AppError(similarProductsMessages.PRODUCT_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    // Validate no self-reference
    if (manualProductIds.includes(productId)) {
      throw new AppError(similarProductsMessages.SELF_REFERENCE_NOT_ALLOWED, HTTP_STATUS.BAD_REQUEST)
    }

    // Validate no duplicates
    const uniqueIds = new Set(manualProductIds)
    if (uniqueIds.size !== manualProductIds.length) {
      throw new AppError(similarProductsMessages.DUPLICATE_PRODUCTS, HTTP_STATUS.BAD_REQUEST)
    }

    // Validate max 10
    if (manualProductIds.length > 10) {
      throw new AppError(similarProductsMessages.MAX_MANUAL_EXCEEDED, HTTP_STATUS.BAD_REQUEST)
    }

    // Validate all product IDs exist
    if (manualProductIds.length > 0) {
      const existCheck = await db.query(
        `SELECT id FROM products WHERE id = ANY($1)`,
        [manualProductIds]
      )
      if (existCheck.rows.length !== manualProductIds.length) {
        throw new AppError(similarProductsMessages.INVALID_PRODUCT_IDS, HTTP_STATUS.BAD_REQUEST)
      }
    }

    // Delete existing manual picks
    await db.query(
      `DELETE FROM similar_products WHERE product_id = $1 AND source = 'manual'`,
      [productId]
    )

    // Insert new manual picks
    if (manualProductIds.length > 0) {
      const values: any[] = []
      const clauses: string[] = []
      manualProductIds.forEach((spId, idx) => {
        const b = idx * 3
        clauses.push(`($${b + 1}, $${b + 2}, 'manual', 0, $${b + 3})`)
        values.push(productId, spId, idx)
      })
      await db.query(
        `INSERT INTO similar_products (product_id, similar_product_id, source, score, rank) VALUES ${clauses.join(', ')}
         ON CONFLICT (product_id, similar_product_id) DO UPDATE SET source = 'manual', rank = EXCLUDED.rank, score = 0`,
        values
      )
    }

    // Delete user-removed system entries
    if (removedSystemProductIds && removedSystemProductIds.length > 0) {
      await db.query(
        `DELETE FROM similar_products WHERE product_id = $1 AND source = 'system' AND similar_product_id = ANY($2)`,
        [productId, removedSystemProductIds]
      )
    }

    // If manual picks exceed available slots, remove excess system entries
    const systemCount = await db.query(
      `SELECT COUNT(*)::int as count FROM similar_products WHERE product_id = $1 AND source = 'system'`,
      [productId]
    )
    const totalNow = manualProductIds.length + systemCount.rows[0].count
    if (totalNow > 10) {
      const excess = totalNow - 10
      await db.query(
        `DELETE FROM similar_products WHERE id IN (
          SELECT id FROM similar_products
          WHERE product_id = $1 AND source = 'system'
          ORDER BY score ASC
          LIMIT $2
        )`,
        [productId, excess]
      )
    }

    return this.getSimilarProducts(productId)
  }
}

export const similarProductsService = new SimilarProductsService()
