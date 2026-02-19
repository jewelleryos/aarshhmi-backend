import { db } from '../../../lib/db'
import { AppError } from '../../../utils/app-error'
import { storefrontFiltersMessages } from '../config/storefront-filters.messages'
import type {
  StorefrontFilterGroupConfig,
  UpdateGroupConfigRequest,
} from '../types/storefront-filters.types'

class GroupConfigService {
  /**
   * Get all group configs
   */
  async list(): Promise<StorefrontFilterGroupConfig[]> {
    const result = await db.query(
      `SELECT
        id, type, display_name, is_filterable, rank,
        created_at, updated_at
      FROM storefront_filter_group_config
      ORDER BY rank ASC, type ASC`
    )

    return result.rows
  }

  /**
   * Update a group config (partial update)
   */
  async update(
    id: string,
    data: UpdateGroupConfigRequest
  ): Promise<StorefrontFilterGroupConfig> {
    // Check if config exists
    const existing = await db.query(
      'SELECT id FROM storefront_filter_group_config WHERE id = $1',
      [id]
    )

    if (existing.rows.length === 0) {
      throw new AppError(storefrontFiltersMessages.GROUP_CONFIG_NOT_FOUND, 404)
    }

    // Build dynamic update query
    const updates: string[] = []
    const values: unknown[] = []
    let paramIndex = 1

    if (data.display_name !== undefined) {
      updates.push(`display_name = $${paramIndex++}`)
      values.push(data.display_name)
    }

    if (data.is_filterable !== undefined) {
      updates.push(`is_filterable = $${paramIndex++}`)
      values.push(data.is_filterable)
    }

    if (data.rank !== undefined) {
      updates.push(`rank = $${paramIndex++}`)
      values.push(data.rank)
    }

    if (updates.length === 0) {
      const current = await db.query(
        `SELECT
          id, type, display_name, is_filterable, rank,
          created_at, updated_at
        FROM storefront_filter_group_config WHERE id = $1`,
        [id]
      )
      return current.rows[0]
    }

    updates.push(`updated_at = NOW()`)
    values.push(id)

    const result = await db.query(
      `UPDATE storefront_filter_group_config
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING
        id, type, display_name, is_filterable, rank,
        created_at, updated_at`,
      values
    )

    return result.rows[0]
  }
}

export const groupConfigService = new GroupConfigService()
