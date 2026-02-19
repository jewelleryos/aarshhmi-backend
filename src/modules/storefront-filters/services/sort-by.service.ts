import { db } from '../../../lib/db'
import { AppError } from '../../../utils/app-error'
import { storefrontFiltersMessages } from '../config/storefront-filters.messages'
import type {
  SortByOption,
  UpdateSortByOptionRequest,
} from '../types/storefront-filters.types'

class SortByService {
  /**
   * Get all sort-by options (both active and inactive)
   * Admin needs to see everything
   */
  async list(): Promise<SortByOption[]> {
    const result = await db.query(
      `SELECT
        id, key, label, sort_column, sort_direction,
        tiebreaker_column, tiebreaker_direction,
        is_active, rank, created_at, updated_at
      FROM sort_by_options
      ORDER BY rank ASC, key ASC`
    )

    return result.rows
  }

  /**
   * Update a sort-by option (partial update)
   * Only admin-editable fields: label, is_active, rank
   */
  async update(
    id: string,
    data: UpdateSortByOptionRequest
  ): Promise<SortByOption> {
    // Check if option exists
    const existing = await db.query(
      'SELECT id FROM sort_by_options WHERE id = $1',
      [id]
    )

    if (existing.rows.length === 0) {
      throw new AppError(storefrontFiltersMessages.SORT_BY_OPTION_NOT_FOUND, 404)
    }

    // Build dynamic update query
    const updates: string[] = []
    const values: unknown[] = []
    let paramIndex = 1

    if (data.label !== undefined) {
      updates.push(`label = $${paramIndex++}`)
      values.push(data.label)
    }

    if (data.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`)
      values.push(data.is_active)
    }

    if (data.rank !== undefined) {
      updates.push(`rank = $${paramIndex++}`)
      values.push(data.rank)
    }

    if (updates.length === 0) {
      // No fields to update, return existing record
      const current = await db.query(
        `SELECT
          id, key, label, sort_column, sort_direction,
          tiebreaker_column, tiebreaker_direction,
          is_active, rank, created_at, updated_at
        FROM sort_by_options WHERE id = $1`,
        [id]
      )
      return current.rows[0]
    }

    updates.push(`updated_at = NOW()`)
    values.push(id)

    const result = await db.query(
      `UPDATE sort_by_options
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING
        id, key, label, sort_column, sort_direction,
        tiebreaker_column, tiebreaker_direction,
        is_active, rank, created_at, updated_at`,
      values
    )

    return result.rows[0]
  }
}

export const sortByService = new SortByService()
