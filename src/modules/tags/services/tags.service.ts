import { db } from '../../../lib/db'
import { tagMessages } from '../config/tags.messages'
import { AppError } from '../../../utils/app-error'
import { HTTP_STATUS } from '../../../config/constants'
import type {
  Tag,
  TagWithGroup,
  CreateTagRequest,
  UpdateTagRequest,
  UpdateTagSeoRequest,
  TagListResponse,
  TagListQuery,
} from '../types/tags.types'
import type { DependencyCheckResult, DependencyGroup } from '../../../types/dependency-check.types'

export const tagService = {
  // List all tags with optional group filter (excluding system-generated)
  async list(query?: TagListQuery): Promise<TagListResponse> {
    let sql = `
      SELECT t.id, t.tag_group_id, t.name, t.slug, t.description,
             t.media_url, t.media_alt_text, t.seo,
             t.is_system_generated, t.is_filterable, t.filter_display_name, t.rank,
             t.status, t.metadata, t.created_at, t.updated_at,
             tg.name as tag_group_name
      FROM tags t
      JOIN tag_groups tg ON t.tag_group_id = tg.id
      WHERE t.is_system_generated = FALSE
    `
    const params: string[] = []

    if (query?.tag_group_id) {
      sql += ` AND t.tag_group_id = $1`
      params.push(query.tag_group_id)
    }

    sql += ` ORDER BY tg.rank ASC, tg.name ASC, t.rank ASC, t.name ASC`

    const result = await db.query(sql, params)

    return { items: result.rows }
  },

  // Get single tag by ID
  async getById(id: string): Promise<TagWithGroup> {
    const result = await db.query(
      `SELECT t.id, t.tag_group_id, t.name, t.slug, t.description,
              t.media_url, t.media_alt_text, t.seo,
              t.is_system_generated, t.is_filterable, t.filter_display_name, t.rank,
              t.status, t.metadata, t.created_at, t.updated_at,
              tg.name as tag_group_name
       FROM tags t
       JOIN tag_groups tg ON t.tag_group_id = tg.id
       WHERE t.id = $1`,
      [id]
    )

    if (result.rows.length === 0) {
      throw new AppError(tagMessages.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    return result.rows[0]
  },

  // Create tag
  async create(data: CreateTagRequest): Promise<TagWithGroup> {
    // Check if tag group exists
    const groupExists = await db.query(
      `SELECT id FROM tag_groups WHERE id = $1`,
      [data.tag_group_id]
    )

    if (groupExists.rows.length === 0) {
      throw new AppError(tagMessages.GROUP_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    // Check if slug already exists in this group
    const existingSlug = await db.query(
      `SELECT id FROM tags WHERE tag_group_id = $1 AND slug = $2`,
      [data.tag_group_id, data.slug]
    )

    if (existingSlug.rows.length > 0) {
      throw new AppError(tagMessages.SLUG_EXISTS, HTTP_STATUS.CONFLICT)
    }

    const result = await db.query(
      `INSERT INTO tags (
        tag_group_id, name, slug, description, media_url, media_alt_text,
        is_filterable, filter_display_name, rank, status, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id`,
      [
        data.tag_group_id,
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

    return this.getById(result.rows[0].id)
  },

  // Update tag
  async update(id: string, data: UpdateTagRequest): Promise<TagWithGroup> {
    // Check if tag exists and is not system-generated
    const existing = await db.query(
      `SELECT id, tag_group_id, is_system_generated FROM tags WHERE id = $1`,
      [id]
    )

    if (existing.rows.length === 0) {
      throw new AppError(tagMessages.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    if (existing.rows[0].is_system_generated) {
      throw new AppError(tagMessages.SYSTEM_GENERATED_ERROR, HTTP_STATUS.FORBIDDEN)
    }

    // If tag_group_id is being updated, validate it exists
    if (data.tag_group_id) {
      const groupExists = await db.query(
        `SELECT id FROM tag_groups WHERE id = $1`,
        [data.tag_group_id]
      )

      if (groupExists.rows.length === 0) {
        throw new AppError(tagMessages.GROUP_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
      }
    }

    // If slug is being updated, check for duplicates within the group
    if (data.slug) {
      const targetGroupId = data.tag_group_id || existing.rows[0].tag_group_id
      const existingSlug = await db.query(
        `SELECT id FROM tags WHERE tag_group_id = $1 AND slug = $2 AND id != $3`,
        [targetGroupId, data.slug, id]
      )

      if (existingSlug.rows.length > 0) {
        throw new AppError(tagMessages.SLUG_EXISTS, HTTP_STATUS.CONFLICT)
      }
    }

    // Build dynamic update query
    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (data.tag_group_id !== undefined) {
      updates.push(`tag_group_id = $${paramIndex++}`)
      values.push(data.tag_group_id)
    }
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

    await db.query(
      `UPDATE tags SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      values
    )

    return this.getById(id)
  },

  // Update SEO
  async updateSeo(id: string, data: UpdateTagSeoRequest): Promise<TagWithGroup> {
    // Check if tag exists
    const existing = await this.getById(id)

    // Merge with existing SEO data
    const seo = { ...existing.seo, ...data }

    // Remove null values to clean up the SEO object
    Object.keys(seo).forEach((key) => {
      if (seo[key as keyof typeof seo] === null) {
        delete seo[key as keyof typeof seo]
      }
    })

    await db.query(`UPDATE tags SET seo = $1 WHERE id = $2`, [seo, id])

    return this.getById(id)
  },

  // Get tags for product dropdown (only non-system tags from non-system tag groups)
  async getForProduct(): Promise<{ id: string; tag_group_id: string; name: string }[]> {
    const result = await db.query(
      `SELECT t.id, t.tag_group_id, t.name
       FROM tags t
       INNER JOIN tag_groups tg ON t.tag_group_id = tg.id
       WHERE t.status = true
         AND t.is_system_generated = false
         AND tg.is_system_generated = false
       ORDER BY tg.rank ASC, t.rank ASC, t.name ASC`
    )
    return result.rows
  },

  // Get tags for pricing rule dropdown (only non-system tags from non-system tag groups)
  async getForPricingRule(): Promise<{ id: string; tag_group_id: string; name: string }[]> {
    const result = await db.query(
      `SELECT t.id, t.tag_group_id, t.name
       FROM tags t
       INNER JOIN tag_groups tg ON t.tag_group_id = tg.id
       WHERE t.status = true
         AND t.is_system_generated = false
         AND tg.is_system_generated = false
       ORDER BY tg.rank ASC, t.rank ASC, t.name ASC`
    )
    return result.rows
  },

  // Check dependencies before deletion
  async checkDependencies(id: string): Promise<DependencyCheckResult> {
    const existing = await this.getById(id)

    if (existing.is_system_generated) {
      throw new AppError(tagMessages.SYSTEM_GENERATED_ERROR, HTTP_STATUS.FORBIDDEN)
    }

    const result = await db.query(
      `SELECT DISTINCT p.id, p.name, p.base_sku AS sku
       FROM products p
       JOIN product_tags pt ON pt.product_id = p.id
       WHERE pt.tag_id = $1 AND p.status != 'archived'
       ORDER BY p.name`,
      [id]
    )

    const dependencies: DependencyGroup[] = []
    if (result.rows.length > 0) {
      dependencies.push({ type: 'product', count: result.rows.length, items: result.rows })
    }

    return { can_delete: dependencies.length === 0, dependencies }
  },

  // Delete tag with dependency check
  async delete(id: string): Promise<void> {
    const check = await this.checkDependencies(id)
    if (!check.can_delete) {
      const summary = check.dependencies.map(d => `${d.count} ${d.type}(s)`).join(', ')
      throw new AppError(`Cannot delete. Used by: ${summary}`, HTTP_STATUS.CONFLICT)
    }

    const result = await db.query(`DELETE FROM tags WHERE id = $1 RETURNING id`, [id])
    if (result.rows.length === 0) {
      throw new AppError(tagMessages.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }
  },
}
