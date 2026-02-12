import { db } from '../../../lib/db'
import { AppError } from '../../../utils/app-error'
import { storefrontFiltersMessages } from '../config/storefront-filters.messages'
import type {
  FilterGroup,
  FilterValue,
  UpdateFilterGroupRequest,
  UpdateFilterValueRequest,
} from '../types/storefront-filters.types'

class StorefrontFiltersService {
  /**
   * Get all filter groups with their values
   * Includes both system-generated and user-created tag groups/tags
   */
  async list(): Promise<FilterGroup[]> {
    // Get all active tag groups ordered by rank
    const groupsResult = await db.query(
      `SELECT
        id,
        name,
        slug,
        filter_display_name,
        media_url,
        media_alt_text,
        is_filterable,
        rank,
        is_system_generated
      FROM tag_groups
      WHERE status = true
      ORDER BY rank ASC, name ASC`
    )

    const groups: FilterGroup[] = []

    // For each group, fetch its values
    for (const row of groupsResult.rows) {
      const valuesResult = await db.query(
        `SELECT
          id,
          name,
          slug,
          filter_display_name,
          media_url,
          media_alt_text,
          is_filterable,
          rank,
          is_system_generated
        FROM tags
        WHERE tag_group_id = $1 AND status = true
        ORDER BY rank ASC, name ASC`,
        [row.id]
      )

      const values: FilterValue[] = valuesResult.rows.map((v) => ({
        id: v.id,
        name: v.name,
        slug: v.slug,
        display_name: v.filter_display_name,
        media_url: v.media_url,
        media_alt_text: v.media_alt_text,
        is_filterable: v.is_filterable,
        rank: v.rank,
        is_system_generated: v.is_system_generated,
      }))

      groups.push({
        id: row.id,
        name: row.name,
        slug: row.slug,
        display_name: row.filter_display_name,
        media_url: row.media_url,
        media_alt_text: row.media_alt_text,
        is_filterable: row.is_filterable,
        rank: row.rank,
        is_system_generated: row.is_system_generated,
        values,
      })
    }

    return groups
  }

  /**
   * Update a filter group's display settings
   */
  async updateGroup(
    id: string,
    data: UpdateFilterGroupRequest
  ): Promise<{ id: string }> {
    // Check if group exists
    const existing = await db.query(
      'SELECT id FROM tag_groups WHERE id = $1 AND status = true',
      [id]
    )

    if (existing.rows.length === 0) {
      throw new AppError(storefrontFiltersMessages.GROUP_NOT_FOUND, 404)
    }

    // Build dynamic update query
    const updates: string[] = []
    const values: unknown[] = []
    let paramIndex = 1

    if (data.filter_display_name !== undefined) {
      updates.push(`filter_display_name = $${paramIndex++}`)
      values.push(data.filter_display_name)
    }

    if (data.media_url !== undefined) {
      updates.push(`media_url = $${paramIndex++}`)
      values.push(data.media_url)
    }

    if (data.media_alt_text !== undefined) {
      updates.push(`media_alt_text = $${paramIndex++}`)
      values.push(data.media_alt_text)
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
      return { id }
    }

    updates.push(`updated_at = NOW()`)
    values.push(id)

    await db.query(
      `UPDATE tag_groups SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      values
    )

    return { id }
  }

  /**
   * Update a filter value's display settings
   */
  async updateValue(
    groupId: string,
    valueId: string,
    data: UpdateFilterValueRequest
  ): Promise<{ id: string }> {
    // Check if group exists
    const groupExists = await db.query(
      'SELECT id FROM tag_groups WHERE id = $1 AND status = true',
      [groupId]
    )

    if (groupExists.rows.length === 0) {
      throw new AppError(storefrontFiltersMessages.GROUP_NOT_FOUND, 404)
    }

    // Check if value exists and belongs to the group
    const valueExists = await db.query(
      'SELECT id FROM tags WHERE id = $1 AND tag_group_id = $2 AND status = true',
      [valueId, groupId]
    )

    if (valueExists.rows.length === 0) {
      throw new AppError(storefrontFiltersMessages.VALUE_NOT_FOUND, 404)
    }

    // Build dynamic update query
    const updates: string[] = []
    const values: unknown[] = []
    let paramIndex = 1

    if (data.filter_display_name !== undefined) {
      updates.push(`filter_display_name = $${paramIndex++}`)
      values.push(data.filter_display_name)
    }

    if (data.media_url !== undefined) {
      updates.push(`media_url = $${paramIndex++}`)
      values.push(data.media_url)
    }

    if (data.media_alt_text !== undefined) {
      updates.push(`media_alt_text = $${paramIndex++}`)
      values.push(data.media_alt_text)
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
      return { id: valueId }
    }

    updates.push(`updated_at = NOW()`)
    values.push(valueId)

    await db.query(
      `UPDATE tags SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      values
    )

    return { id: valueId }
  }
}

export const storefrontFiltersService = new StorefrontFiltersService()
