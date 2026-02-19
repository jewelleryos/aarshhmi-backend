import { db } from '../../../lib/db'
import { AppError } from '../../../utils/app-error'
import { storefrontFiltersMessages } from '../config/storefront-filters.messages'
import type {
  PriceFilterRange,
  CreatePriceFilterRangeRequest,
  UpdatePriceFilterRangeRequest,
} from '../types/storefront-filters.types'

class PriceFilterService {
  /**
   * Get all price filter ranges (both active and inactive)
   * Admin needs to see everything
   */
  async list(): Promise<PriceFilterRange[]> {
    const result = await db.query(
      `SELECT
        id, display_name, min_price, max_price,
        media_url, media_alt_text, rank, status,
        created_at, updated_at
      FROM price_filter_ranges
      ORDER BY rank ASC, display_name ASC`
    )

    return result.rows
  }

  /**
   * Create a new price filter range
   */
  async create(data: CreatePriceFilterRangeRequest): Promise<PriceFilterRange> {
    const result = await db.query(
      `INSERT INTO price_filter_ranges
        (display_name, min_price, max_price, media_url, media_alt_text, rank, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING
        id, display_name, min_price, max_price,
        media_url, media_alt_text, rank, status,
        created_at, updated_at`,
      [
        data.display_name,
        data.min_price,
        data.max_price,
        data.media_url ?? null,
        data.media_alt_text ?? null,
        data.rank ?? 0,
        data.status ?? true,
      ]
    )

    return result.rows[0]
  }

  /**
   * Update a price filter range (partial update)
   */
  async update(
    id: string,
    data: UpdatePriceFilterRangeRequest
  ): Promise<PriceFilterRange> {
    // Check if range exists
    const existing = await db.query(
      'SELECT id FROM price_filter_ranges WHERE id = $1',
      [id]
    )

    if (existing.rows.length === 0) {
      throw new AppError(storefrontFiltersMessages.PRICE_RANGE_NOT_FOUND, 404)
    }

    // Build dynamic update query
    const updates: string[] = []
    const values: unknown[] = []
    let paramIndex = 1

    if (data.display_name !== undefined) {
      updates.push(`display_name = $${paramIndex++}`)
      values.push(data.display_name)
    }

    if (data.min_price !== undefined) {
      updates.push(`min_price = $${paramIndex++}`)
      values.push(data.min_price)
    }

    if (data.max_price !== undefined) {
      updates.push(`max_price = $${paramIndex++}`)
      values.push(data.max_price)
    }

    if (data.media_url !== undefined) {
      updates.push(`media_url = $${paramIndex++}`)
      values.push(data.media_url)
    }

    if (data.media_alt_text !== undefined) {
      updates.push(`media_alt_text = $${paramIndex++}`)
      values.push(data.media_alt_text)
    }

    if (data.rank !== undefined) {
      updates.push(`rank = $${paramIndex++}`)
      values.push(data.rank)
    }

    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex++}`)
      values.push(data.status)
    }

    if (updates.length === 0) {
      // No fields to update, return existing record
      const current = await db.query(
        `SELECT
          id, display_name, min_price, max_price,
          media_url, media_alt_text, rank, status,
          created_at, updated_at
        FROM price_filter_ranges WHERE id = $1`,
        [id]
      )
      return current.rows[0]
    }

    updates.push(`updated_at = NOW()`)
    values.push(id)

    const result = await db.query(
      `UPDATE price_filter_ranges
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING
        id, display_name, min_price, max_price,
        media_url, media_alt_text, rank, status,
        created_at, updated_at`,
      values
    )

    return result.rows[0]
  }

  /**
   * Soft delete a price filter range (set status = false)
   */
  async delete(id: string): Promise<{ id: string }> {
    const existing = await db.query(
      'SELECT id FROM price_filter_ranges WHERE id = $1 AND status = true',
      [id]
    )

    if (existing.rows.length === 0) {
      throw new AppError(storefrontFiltersMessages.PRICE_RANGE_NOT_FOUND, 404)
    }

    await db.query(
      'UPDATE price_filter_ranges SET status = false, updated_at = NOW() WHERE id = $1',
      [id]
    )

    return { id }
  }
}

export const priceFilterService = new PriceFilterService()
