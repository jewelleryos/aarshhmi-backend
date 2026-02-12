import { db } from '../../../lib/db'
import { SYSTEM_TAG_GROUPS } from '../../../config/tag.config'
import { stoneShapeMessages } from '../config/stone-shape.messages'
import { AppError } from '../../../utils/app-error'
import { HTTP_STATUS } from '../../../config/constants'
import type {
  StoneShape,
  CreateStoneShapeRequest,
  UpdateStoneShapeRequest,
  StoneShapeListResponse,
} from '../types/stone-shape.types'

export const stoneShapeService = {
  // List all stone shapes
  async list(): Promise<StoneShapeListResponse> {
    const result = await db.query(
      `SELECT id, name, slug, description, image_url, image_alt_text, status, metadata, created_at, updated_at
       FROM stone_shapes
       ORDER BY name`
    )

    return { items: result.rows }
  },

  // Get single stone shape by ID
  async getById(id: string): Promise<StoneShape> {
    const result = await db.query(
      `SELECT id, name, slug, description, image_url, image_alt_text, status, metadata, created_at, updated_at
       FROM stone_shapes
       WHERE id = $1`,
      [id]
    )

    if (result.rows.length === 0) {
      throw new AppError(stoneShapeMessages.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    return result.rows[0]
  },

  // Create stone shape
  async create(data: CreateStoneShapeRequest): Promise<StoneShape> {
    // Check if slug already exists
    const existingSlug = await db.query(
      `SELECT id FROM stone_shapes WHERE slug = $1`,
      [data.slug]
    )

    if (existingSlug.rows.length > 0) {
      throw new AppError(stoneShapeMessages.SLUG_EXISTS, HTTP_STATUS.CONFLICT)
    }

    const result = await db.query(
      `INSERT INTO stone_shapes (name, slug, description, image_url, image_alt_text, status, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, slug, description, image_url, image_alt_text, status, metadata, created_at, updated_at`,
      [
        data.name,
        data.slug,
        data.description || null,
        data.image_url || null,
        data.image_alt_text || null,
        data.status ?? true,
        data.metadata ? JSON.stringify(data.metadata) : '{}',
      ]
    )

    const stoneShape = result.rows[0]

    // Create system tag for this stone shape
    await db.query(
      `INSERT INTO tags (tag_group_id, name, slug, source_id, is_system_generated, is_filterable, status)
       VALUES ($1, $2, $3, $4, TRUE, TRUE, TRUE)`,
      [SYSTEM_TAG_GROUPS.STONE_SHAPE, stoneShape.name, stoneShape.slug, stoneShape.id]
    )

    return stoneShape
  },

  // Update stone shape
  async update(id: string, data: UpdateStoneShapeRequest): Promise<StoneShape> {
    // Check if stone shape exists
    const existing = await db.query(
      `SELECT id FROM stone_shapes WHERE id = $1`,
      [id]
    )

    if (existing.rows.length === 0) {
      throw new AppError(stoneShapeMessages.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    // If slug is being updated, check for duplicates
    if (data.slug) {
      const existingSlug = await db.query(
        `SELECT id FROM stone_shapes WHERE slug = $1 AND id != $2`,
        [data.slug, id]
      )

      if (existingSlug.rows.length > 0) {
        throw new AppError(stoneShapeMessages.SLUG_EXISTS, HTTP_STATUS.CONFLICT)
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
      `UPDATE stone_shapes
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}`,
      values
    )

    // Sync system tag if name or slug changed
    if (data.name !== undefined || data.slug !== undefined) {
      const updated = await this.getById(id)
      await db.query(
        `UPDATE tags SET name = $1, slug = $2 WHERE source_id = $3 AND tag_group_id = $4`,
        [updated.name, updated.slug, id, SYSTEM_TAG_GROUPS.STONE_SHAPE]
      )
    }

    return this.getById(id)
  },

  // Delete stone shape (for future use)
  async delete(id: string): Promise<void> {
    const result = await db.query(
      `DELETE FROM stone_shapes WHERE id = $1 RETURNING id`,
      [id]
    )

    if (result.rows.length === 0) {
      throw new AppError(stoneShapeMessages.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }
  },

  // Get stone shapes for product dropdown (with slug)
  async getForProduct(): Promise<{ id: string; name: string; slug: string }[]> {
    const result = await db.query(
      `SELECT id, name, slug FROM stone_shapes WHERE status = true ORDER BY name`
    )
    return result.rows
  },
}
