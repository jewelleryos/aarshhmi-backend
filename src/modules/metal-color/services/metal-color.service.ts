import { db } from '../../../lib/db'
import { metalColorMessages } from '../config/metal-color.messages'
import { AppError } from '../../../utils/app-error'
import { HTTP_STATUS } from '../../../config/constants'
import { SYSTEM_TAG_GROUPS } from '../../../config/tag.config'
import type {
  MetalColor,
  MetalColorWithMetalType,
  CreateMetalColorRequest,
  UpdateMetalColorRequest,
  MetalColorListResponse,
} from '../types/metal-color.types'

export const metalColorService = {
  // List all metal colors with metal type name
  async list(): Promise<MetalColorListResponse> {
    const result = await db.query(
      `SELECT
        mc.id, mc.metal_type_id, mc.name, mc.slug, mc.description,
        mc.image_url, mc.image_alt_text, mc.status, mc.created_at, mc.updated_at,
        mt.name as metal_type_name
       FROM metal_colors mc
       JOIN metal_types mt ON mc.metal_type_id = mt.id
       ORDER BY mc.created_at DESC`
    )

    return { items: result.rows }
  },

  // Get single metal color by ID
  async getById(id: string): Promise<MetalColorWithMetalType> {
    const result = await db.query(
      `SELECT
        mc.id, mc.metal_type_id, mc.name, mc.slug, mc.description,
        mc.image_url, mc.image_alt_text, mc.status, mc.created_at, mc.updated_at,
        mt.name as metal_type_name
       FROM metal_colors mc
       JOIN metal_types mt ON mc.metal_type_id = mt.id
       WHERE mc.id = $1`,
      [id]
    )

    if (result.rows.length === 0) {
      throw new AppError(metalColorMessages.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    return result.rows[0]
  },

  // Create metal color
  async create(data: CreateMetalColorRequest): Promise<MetalColorWithMetalType> {
    // Validate metal_type_id exists
    const metalType = await db.query(
      `SELECT id FROM metal_types WHERE id = $1`,
      [data.metal_type_id]
    )

    if (metalType.rows.length === 0) {
      throw new AppError(metalColorMessages.METAL_TYPE_NOT_FOUND, HTTP_STATUS.BAD_REQUEST)
    }

    // Check if slug already exists
    const existingSlug = await db.query(
      `SELECT id FROM metal_colors WHERE slug = $1`,
      [data.slug]
    )

    if (existingSlug.rows.length > 0) {
      throw new AppError(metalColorMessages.SLUG_EXISTS, HTTP_STATUS.CONFLICT)
    }

    const result = await db.query(
      `INSERT INTO metal_colors (metal_type_id, name, slug, description, image_url, image_alt_text, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, metal_type_id, name, slug, description, image_url, image_alt_text, status, created_at, updated_at`,
      [
        data.metal_type_id,
        data.name,
        data.slug,
        data.description || null,
        data.image_url || null,
        data.image_alt_text || null,
        data.status ?? true,
      ]
    )

    const metalColor = result.rows[0]

    // Create system tag for this metal color
    await db.query(
      `INSERT INTO tags (tag_group_id, name, slug, source_id, is_system_generated, is_filterable, status)
       VALUES ($1, $2, $3, $4, TRUE, TRUE, TRUE)`,
      [SYSTEM_TAG_GROUPS.METAL_COLOR, metalColor.name, metalColor.slug, metalColor.id]
    )

    // Fetch with metal type name
    return this.getById(metalColor.id)
  },

  // Update metal color (metal_type_id NOT updatable)
  async update(id: string, data: UpdateMetalColorRequest): Promise<MetalColorWithMetalType> {
    // Check if metal color exists
    const existing = await db.query(
      `SELECT id FROM metal_colors WHERE id = $1`,
      [id]
    )

    if (existing.rows.length === 0) {
      throw new AppError(metalColorMessages.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    // If slug is being updated, check for duplicates
    if (data.slug) {
      const existingSlug = await db.query(
        `SELECT id FROM metal_colors WHERE slug = $1 AND id != $2`,
        [data.slug, id]
      )

      if (existingSlug.rows.length > 0) {
        throw new AppError(metalColorMessages.SLUG_EXISTS, HTTP_STATUS.CONFLICT)
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

    if (updates.length === 0) {
      return this.getById(id)
    }

    values.push(id)

    await db.query(
      `UPDATE metal_colors
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}`,
      values
    )

    // Sync system tag if name or slug changed
    if (data.name !== undefined || data.slug !== undefined) {
      const updated = await this.getById(id)
      await db.query(
        `UPDATE tags SET name = $1, slug = $2 WHERE source_id = $3 AND tag_group_id = $4`,
        [updated.name, updated.slug, id, SYSTEM_TAG_GROUPS.METAL_COLOR]
      )
    }

    // Fetch with metal type name
    return this.getById(id)
  },

  // Delete metal color (for future use)
  async delete(id: string): Promise<void> {
    const result = await db.query(
      `DELETE FROM metal_colors WHERE id = $1 RETURNING id`,
      [id]
    )

    if (result.rows.length === 0) {
      throw new AppError(metalColorMessages.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }
  },

  // Get metal colors for product dropdown (with slug and metal_type_id for filtering)
  async getForProduct(): Promise<{ id: string; metal_type_id: string; name: string; slug: string }[]> {
    const result = await db.query(
      `SELECT id, metal_type_id, name, slug FROM metal_colors WHERE status = true ORDER BY name`
    )
    return result.rows
  },

  // Get metal colors for pricing rule dropdown
  async getForPricingRule(): Promise<{ id: string; name: string }[]> {
    const result = await db.query(
      `SELECT id, name FROM metal_colors WHERE status = true ORDER BY name ASC`
    )
    return result.rows
  },
}
