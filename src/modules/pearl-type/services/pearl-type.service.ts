import { db } from '../../../lib/db'
import { STONE_GROUPS } from '../../../config/stone.config'
import { SYSTEM_TAG_GROUPS } from '../../../config/tag.config'
import { pearlTypeMessages } from '../config/pearl-type.messages'
import { AppError } from '../../../utils/app-error'
import { HTTP_STATUS } from '../../../config/constants'
import type {
  PearlType,
  CreatePearlTypeRequest,
  UpdatePearlTypeRequest,
  PearlTypeListResponse,
} from '../types/pearl-type.types'

export const pearlTypeService = {
  // List all pearl types (filtered by PEARLS stone_group_id)
  async list(): Promise<PearlTypeListResponse> {
    const result = await db.query(
      `SELECT id, stone_group_id, name, slug, description, image_url, image_alt_text, status, metadata, created_at, updated_at
       FROM stone_types
       WHERE stone_group_id = $1
       ORDER BY name`,
      [STONE_GROUPS.PEARLS]
    )

    return { items: result.rows }
  },

  // Get single pearl type by ID (must belong to PEARLS group)
  async getById(id: string): Promise<PearlType> {
    const result = await db.query(
      `SELECT id, stone_group_id, name, slug, description, image_url, image_alt_text, status, metadata, created_at, updated_at
       FROM stone_types
       WHERE id = $1 AND stone_group_id = $2`,
      [id, STONE_GROUPS.PEARLS]
    )

    if (result.rows.length === 0) {
      throw new AppError(pearlTypeMessages.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    return result.rows[0]
  },

  // Create pearl type (automatically sets PEARLS stone_group_id)
  async create(data: CreatePearlTypeRequest): Promise<PearlType> {
    // Check if slug already exists
    const existingSlug = await db.query(
      `SELECT id FROM stone_types WHERE slug = $1`,
      [data.slug]
    )

    if (existingSlug.rows.length > 0) {
      throw new AppError(pearlTypeMessages.SLUG_EXISTS, HTTP_STATUS.CONFLICT)
    }

    const result = await db.query(
      `INSERT INTO stone_types (stone_group_id, name, slug, description, image_url, image_alt_text, status, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, stone_group_id, name, slug, description, image_url, image_alt_text, status, metadata, created_at, updated_at`,
      [
        STONE_GROUPS.PEARLS,
        data.name,
        data.slug,
        data.description || null,
        data.image_url || null,
        data.image_alt_text || null,
        data.status ?? true,
        data.metadata ? JSON.stringify(data.metadata) : '{}',
      ]
    )

    const pearlType = result.rows[0]

    // Create system tag for this pearl type
    await db.query(
      `INSERT INTO tags (tag_group_id, name, slug, source_id, is_system_generated, is_filterable, status)
       VALUES ($1, $2, $3, $4, TRUE, TRUE, TRUE)`,
      [SYSTEM_TAG_GROUPS.PEARL_TYPE, pearlType.name, pearlType.slug, pearlType.id]
    )

    return pearlType
  },

  // Update pearl type (must belong to PEARLS group)
  async update(id: string, data: UpdatePearlTypeRequest): Promise<PearlType> {
    // Check if pearl type exists and belongs to PEARLS group
    const existing = await db.query(
      `SELECT id FROM stone_types WHERE id = $1 AND stone_group_id = $2`,
      [id, STONE_GROUPS.PEARLS]
    )

    if (existing.rows.length === 0) {
      throw new AppError(pearlTypeMessages.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    // If slug is being updated, check for duplicates
    if (data.slug) {
      const existingSlug = await db.query(
        `SELECT id FROM stone_types WHERE slug = $1 AND id != $2`,
        [data.slug, id]
      )

      if (existingSlug.rows.length > 0) {
        throw new AppError(pearlTypeMessages.SLUG_EXISTS, HTTP_STATUS.CONFLICT)
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
    if (data.image_url !== undefined) {
      updates.push(`image_url = $${paramIndex++}`)
      values.push(data.image_url)
    }
    if (data.image_alt_text !== undefined) {
      updates.push(`image_alt_text = $${paramIndex++}`)
      values.push(data.image_alt_text)
    }
    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex++}`)
      values.push(data.status)
    }
    if (data.metadata !== undefined) {
      updates.push(`metadata = $${paramIndex++}`)
      values.push(JSON.stringify(data.metadata))
    }

    if (updates.length === 0) {
      return this.getById(id)
    }

    values.push(id)

    await db.query(
      `UPDATE stone_types
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}`,
      values
    )

    // Sync system tag if name or slug changed
    if (data.name !== undefined || data.slug !== undefined) {
      const updated = await this.getById(id)
      await db.query(
        `UPDATE tags SET name = $1, slug = $2 WHERE source_id = $3 AND tag_group_id = $4`,
        [updated.name, updated.slug, id, SYSTEM_TAG_GROUPS.PEARL_TYPE]
      )
    }

    return this.getById(id)
  },

  // Get pearl types for product dropdown (with slug)
  async getForProduct(): Promise<{ id: string; name: string; slug: string }[]> {
    const result = await db.query(
      `SELECT id, name, slug FROM stone_types
       WHERE stone_group_id = $1 AND status = true
       ORDER BY name`,
      [STONE_GROUPS.PEARLS]
    )
    return result.rows
  },
}
