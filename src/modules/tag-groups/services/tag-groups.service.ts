import { db } from '../../../lib/db'
import { tagGroupMessages } from '../config/tag-groups.messages'
import { AppError } from '../../../utils/app-error'
import { HTTP_STATUS } from '../../../config/constants'
import type {
  TagGroup,
  CreateTagGroupRequest,
  UpdateTagGroupRequest,
  UpdateTagGroupSeoRequest,
  TagGroupListResponse,
} from '../types/tag-groups.types'

export const tagGroupService = {
  // List all tag groups (excluding system-generated)
  async list(): Promise<TagGroupListResponse> {
    const result = await db.query(
      `SELECT id, name, slug, description, media_url, media_alt_text, seo,
              is_system_generated, is_filterable, filter_display_name, rank,
              status, metadata, created_at, updated_at
       FROM tag_groups
       WHERE is_system_generated = FALSE
       ORDER BY rank ASC, name ASC`
    )

    return { items: result.rows }
  },

  // Get single tag group by ID
  async getById(id: string): Promise<TagGroup> {
    const result = await db.query(
      `SELECT id, name, slug, description, media_url, media_alt_text, seo,
              is_system_generated, is_filterable, filter_display_name, rank,
              status, metadata, created_at, updated_at
       FROM tag_groups
       WHERE id = $1`,
      [id]
    )

    if (result.rows.length === 0) {
      throw new AppError(tagGroupMessages.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    return result.rows[0]
  },

  // Create tag group
  async create(data: CreateTagGroupRequest): Promise<TagGroup> {
    // Check if slug already exists
    const existingSlug = await db.query(`SELECT id FROM tag_groups WHERE slug = $1`, [data.slug])

    if (existingSlug.rows.length > 0) {
      throw new AppError(tagGroupMessages.SLUG_EXISTS, HTTP_STATUS.CONFLICT)
    }

    const result = await db.query(
      `INSERT INTO tag_groups (
        name, slug, description, media_url, media_alt_text,
        is_filterable, filter_display_name, rank, status, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, name, slug, description, media_url, media_alt_text, seo,
                is_system_generated, is_filterable, filter_display_name, rank,
                status, metadata, created_at, updated_at`,
      [
        data.name,
        data.slug,
        data.description || null,
        data.media_url || null,
        data.media_alt_text || null,
        data.is_filterable ?? true,
        data.filter_display_name || null,
        data.rank ?? 0,
        data.status ?? true,
        data.metadata || {},
      ]
    )

    return result.rows[0]
  },

  // Update tag group
  async update(id: string, data: UpdateTagGroupRequest): Promise<TagGroup> {
    // Check if tag group exists and is not system-generated
    const existing = await db.query(
      `SELECT id, is_system_generated FROM tag_groups WHERE id = $1`,
      [id]
    )

    if (existing.rows.length === 0) {
      throw new AppError(tagGroupMessages.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    if (existing.rows[0].is_system_generated) {
      throw new AppError(tagGroupMessages.SYSTEM_GENERATED_ERROR, HTTP_STATUS.FORBIDDEN)
    }

    // If slug is being updated, check for duplicates
    if (data.slug) {
      const existingSlug = await db.query(
        `SELECT id FROM tag_groups WHERE slug = $1 AND id != $2`,
        [data.slug, id]
      )

      if (existingSlug.rows.length > 0) {
        throw new AppError(tagGroupMessages.SLUG_EXISTS, HTTP_STATUS.CONFLICT)
      }
    }

    // Build dynamic update query
    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`)
      values.push(data.name)
    }
    if (data.slug !== undefined) {
      updates.push(`slug = $${paramIndex++}`)
      values.push(data.slug)
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`)
      values.push(data.description)
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
    if (data.filter_display_name !== undefined) {
      updates.push(`filter_display_name = $${paramIndex++}`)
      values.push(data.filter_display_name)
    }
    if (data.rank !== undefined) {
      updates.push(`rank = $${paramIndex++}`)
      values.push(data.rank)
    }
    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex++}`)
      values.push(data.status)
    }
    if (data.metadata !== undefined) {
      updates.push(`metadata = $${paramIndex++}`)
      values.push(data.metadata)
    }

    if (updates.length === 0) {
      return this.getById(id)
    }

    values.push(id)

    const result = await db.query(
      `UPDATE tag_groups
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, name, slug, description, media_url, media_alt_text, seo,
                 is_system_generated, is_filterable, filter_display_name, rank,
                 status, metadata, created_at, updated_at`,
      values
    )

    return result.rows[0]
  },

  // Update SEO
  async updateSeo(id: string, data: UpdateTagGroupSeoRequest): Promise<TagGroup> {
    // Check if tag group exists
    const existing = await this.getById(id)

    // Merge with existing SEO data
    const seo = { ...existing.seo, ...data }

    // Remove null values to clean up the SEO object
    Object.keys(seo).forEach((key) => {
      if (seo[key as keyof typeof seo] === null) {
        delete seo[key as keyof typeof seo]
      }
    })

    const result = await db.query(
      `UPDATE tag_groups
       SET seo = $1
       WHERE id = $2
       RETURNING id, name, slug, description, media_url, media_alt_text, seo,
                 is_system_generated, is_filterable, filter_display_name, rank,
                 status, metadata, created_at, updated_at`,
      [seo, id]
    )

    return result.rows[0]
  },

  // Get tag groups for product dropdown (only non-system, minimal data)
  async getForProduct(): Promise<{ id: string; name: string }[]> {
    const result = await db.query(
      `SELECT id, name FROM tag_groups
       WHERE status = true AND is_system_generated = false
       ORDER BY rank ASC, name ASC`
    )
    return result.rows
  },

  // Delete tag group (for future use)
  async delete(id: string): Promise<void> {
    // Check if tag group exists and is not system-generated
    const existing = await db.query(
      `SELECT id, is_system_generated FROM tag_groups WHERE id = $1`,
      [id]
    )

    if (existing.rows.length === 0) {
      throw new AppError(tagGroupMessages.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    if (existing.rows[0].is_system_generated) {
      throw new AppError(tagGroupMessages.SYSTEM_GENERATED_ERROR, HTTP_STATUS.FORBIDDEN)
    }

    await db.query(`DELETE FROM tag_groups WHERE id = $1`, [id])
  },
}
