import { db } from '../../../lib/db'
import { STONE_GROUPS } from '../../../config/stone.config'
import { SYSTEM_TAG_GROUPS } from '../../../config/tag.config'
import { gemstoneColorMessages } from '../config/gemstone-color.messages'
import { AppError } from '../../../utils/app-error'
import { HTTP_STATUS } from '../../../config/constants'
import type {
  GemstoneColor,
  CreateGemstoneColorRequest,
  UpdateGemstoneColorRequest,
  GemstoneColorListResponse,
} from '../types/gemstone-color.types'

export const gemstoneColorService = {
  // List all gemstone colors (filtered by GEMSTONE stone_group_id)
  async list(): Promise<GemstoneColorListResponse> {
    const result = await db.query(
      `SELECT id, stone_group_id, name, slug, description, image_url, image_alt_text, status, metadata, created_at, updated_at
       FROM stone_colors
       WHERE stone_group_id = $1
       ORDER BY name`,
      [STONE_GROUPS.GEMSTONE]
    )

    return { items: result.rows }
  },

  // Get single gemstone color by ID (must belong to GEMSTONE group)
  async getById(id: string): Promise<GemstoneColor> {
    const result = await db.query(
      `SELECT id, stone_group_id, name, slug, description, image_url, image_alt_text, status, metadata, created_at, updated_at
       FROM stone_colors
       WHERE id = $1 AND stone_group_id = $2`,
      [id, STONE_GROUPS.GEMSTONE]
    )

    if (result.rows.length === 0) {
      throw new AppError(gemstoneColorMessages.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    return result.rows[0]
  },

  // Create gemstone color (automatically sets GEMSTONE stone_group_id)
  async create(data: CreateGemstoneColorRequest): Promise<GemstoneColor> {
    // Check if slug already exists
    const existingSlug = await db.query(`SELECT id FROM stone_colors WHERE slug = $1`, [data.slug])

    if (existingSlug.rows.length > 0) {
      throw new AppError(gemstoneColorMessages.SLUG_EXISTS, HTTP_STATUS.CONFLICT)
    }

    const result = await db.query(
      `INSERT INTO stone_colors (stone_group_id, name, slug, description, image_url, image_alt_text, status, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, stone_group_id, name, slug, description, image_url, image_alt_text, status, metadata, created_at, updated_at`,
      [
        STONE_GROUPS.GEMSTONE,
        data.name,
        data.slug,
        data.description || null,
        data.image_url || null,
        data.image_alt_text || null,
        data.status ?? true,
        data.metadata ? JSON.stringify(data.metadata) : '{}',
      ]
    )

    const gemstoneColor = result.rows[0]

    // Create system tag for this gemstone color
    await db.query(
      `INSERT INTO tags (tag_group_id, name, slug, source_id, is_system_generated, is_filterable, status)
       VALUES ($1, $2, $3, $4, TRUE, TRUE, TRUE)`,
      [SYSTEM_TAG_GROUPS.GEMSTONE_COLOR, gemstoneColor.name, gemstoneColor.slug, gemstoneColor.id]
    )

    return gemstoneColor
  },

  // Get dropdown items for gemstone pricing (id, name, slug)
  async dropdown(): Promise<{ items: { id: string; name: string; slug: string }[] }> {
    const result = await db.query(
      `SELECT id, name, slug FROM stone_colors
       WHERE stone_group_id = $1 AND status = true
       ORDER BY name`,
      [STONE_GROUPS.GEMSTONE]
    )
    return { items: result.rows }
  },

  // Update gemstone color (must belong to GEMSTONE group)
  async update(id: string, data: UpdateGemstoneColorRequest): Promise<GemstoneColor> {
    // Check if gemstone color exists and belongs to GEMSTONE group
    const existing = await db.query(`SELECT id FROM stone_colors WHERE id = $1 AND stone_group_id = $2`, [
      id,
      STONE_GROUPS.GEMSTONE,
    ])

    if (existing.rows.length === 0) {
      throw new AppError(gemstoneColorMessages.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    // If slug is being updated, check for duplicates
    if (data.slug) {
      const existingSlug = await db.query(`SELECT id FROM stone_colors WHERE slug = $1 AND id != $2`, [data.slug, id])

      if (existingSlug.rows.length > 0) {
        throw new AppError(gemstoneColorMessages.SLUG_EXISTS, HTTP_STATUS.CONFLICT)
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
      `UPDATE stone_colors
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}`,
      values
    )

    // Sync system tag if name or slug changed
    if (data.name !== undefined || data.slug !== undefined) {
      const updated = await this.getById(id)
      await db.query(
        `UPDATE tags SET name = $1, slug = $2 WHERE source_id = $3 AND tag_group_id = $4`,
        [updated.name, updated.slug, id, SYSTEM_TAG_GROUPS.GEMSTONE_COLOR]
      )
    }

    return this.getById(id)
  },

  // Get gemstone colors for product dropdown (with slug)
  async getForProduct(): Promise<{ id: string; name: string; slug: string }[]> {
    const result = await db.query(
      `SELECT id, name, slug FROM stone_colors
       WHERE stone_group_id = $1 AND status = true
       ORDER BY name`,
      [STONE_GROUPS.GEMSTONE]
    )
    return result.rows
  },
}
