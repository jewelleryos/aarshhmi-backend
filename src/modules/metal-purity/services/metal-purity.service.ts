import { db } from '../../../lib/db'
import { metalPurityMessages } from '../config/metal-purity.messages'
import { AppError } from '../../../utils/app-error'
import { HTTP_STATUS } from '../../../config/constants'
import { toSmallestUnit } from '../../../utils/currency'
import { SYSTEM_TAG_GROUPS } from '../../../config/tag.config'
import type {
  MetalPurityWithMetalType,
  CreateMetalPurityRequest,
  UpdateMetalPurityRequest,
  MetalPurityListResponse,
} from '../types/metal-purity.types'

export const metalPurityService = {
  // List all metal purities with metal type name
  async list(): Promise<MetalPurityListResponse> {
    const result = await db.query(
      `SELECT
        mp.id, mp.metal_type_id, mp.name, mp.slug, mp.description,
        mp.image_url, mp.image_alt_text, mp.price, mp.status, mp.created_at, mp.updated_at,
        mt.name as metal_type_name
       FROM metal_purities mp
       JOIN metal_types mt ON mp.metal_type_id = mt.id
       ORDER BY mp.created_at DESC`
    )

    return { items: result.rows }
  },

  // Get single metal purity by ID
  async getById(id: string): Promise<MetalPurityWithMetalType> {
    const result = await db.query(
      `SELECT
        mp.id, mp.metal_type_id, mp.name, mp.slug, mp.description,
        mp.image_url, mp.image_alt_text, mp.price, mp.status, mp.created_at, mp.updated_at,
        mt.name as metal_type_name
       FROM metal_purities mp
       JOIN metal_types mt ON mp.metal_type_id = mt.id
       WHERE mp.id = $1`,
      [id]
    )

    if (result.rows.length === 0) {
      throw new AppError(metalPurityMessages.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    return result.rows[0]
  },

  // Create metal purity
  async create(data: CreateMetalPurityRequest): Promise<MetalPurityWithMetalType> {
    // Validate metal_type_id exists
    const metalType = await db.query(
      `SELECT id FROM metal_types WHERE id = $1`,
      [data.metal_type_id]
    )

    if (metalType.rows.length === 0) {
      throw new AppError(metalPurityMessages.METAL_TYPE_NOT_FOUND, HTTP_STATUS.BAD_REQUEST)
    }

    // Check if slug already exists
    const existingSlug = await db.query(
      `SELECT id FROM metal_purities WHERE slug = $1`,
      [data.slug]
    )

    if (existingSlug.rows.length > 0) {
      throw new AppError(metalPurityMessages.SLUG_EXISTS, HTTP_STATUS.CONFLICT)
    }

    // Convert price to smallest unit before storing
    const priceInSmallestUnit = toSmallestUnit(data.price)

    const result = await db.query(
      `INSERT INTO metal_purities (metal_type_id, name, slug, description, image_url, image_alt_text, price, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, metal_type_id, name, slug, description, image_url, image_alt_text, price, status, created_at, updated_at`,
      [
        data.metal_type_id,
        data.name,
        data.slug,
        data.description || null,
        data.image_url || null,
        data.image_alt_text || null,
        priceInSmallestUnit,
        data.status ?? true,
      ]
    )

    const metalPurity = result.rows[0]

    // Create system tag for this metal purity
    await db.query(
      `INSERT INTO tags (tag_group_id, name, slug, source_id, is_system_generated, is_filterable, status)
       VALUES ($1, $2, $3, $4, TRUE, TRUE, TRUE)`,
      [SYSTEM_TAG_GROUPS.METAL_PURITY, metalPurity.name, metalPurity.slug, metalPurity.id]
    )

    // Fetch with metal type name
    return this.getById(metalPurity.id)
  },

  // Update metal purity (metal_type_id NOT updatable)
  async update(id: string, data: UpdateMetalPurityRequest): Promise<MetalPurityWithMetalType> {
    // Check if metal purity exists
    const existing = await db.query(
      `SELECT id FROM metal_purities WHERE id = $1`,
      [id]
    )

    if (existing.rows.length === 0) {
      throw new AppError(metalPurityMessages.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    // If slug is being updated, check for duplicates
    if (data.slug) {
      const existingSlug = await db.query(
        `SELECT id FROM metal_purities WHERE slug = $1 AND id != $2`,
        [data.slug, id]
      )

      if (existingSlug.rows.length > 0) {
        throw new AppError(metalPurityMessages.SLUG_EXISTS, HTTP_STATUS.CONFLICT)
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
    if (data.price !== undefined) {
      updates.push(`price = $${paramIndex++}`)
      values.push(toSmallestUnit(data.price))
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
      `UPDATE metal_purities
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}`,
      values
    )

    // Sync system tag if name or slug changed
    if (data.name !== undefined || data.slug !== undefined) {
      const updated = await this.getById(id)
      await db.query(
        `UPDATE tags SET name = $1, slug = $2 WHERE source_id = $3 AND tag_group_id = $4`,
        [updated.name, updated.slug, id, SYSTEM_TAG_GROUPS.METAL_PURITY]
      )
    }

    // Fetch with metal type name
    return this.getById(id)
  },

  // Delete metal purity (for future use)
  async delete(id: string): Promise<void> {
    const result = await db.query(
      `DELETE FROM metal_purities WHERE id = $1 RETURNING id`,
      [id]
    )

    if (result.rows.length === 0) {
      throw new AppError(metalPurityMessages.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }
  },

  // Get metal purities for product dropdown (with price and slug for calculation)
  async getForProduct(): Promise<{ id: string; metal_type_id: string; name: string; slug: string; price: number }[]> {
    const result = await db.query(
      `SELECT id, metal_type_id, name, slug, price FROM metal_purities WHERE status = true ORDER BY name`
    )
    return result.rows
  },

  // Get metal purities for pricing rule dropdown
  async getForPricingRule(): Promise<{ id: string; name: string }[]> {
    const result = await db.query(
      `SELECT id, name FROM metal_purities WHERE status = true ORDER BY name ASC`
    )
    return result.rows
  },
}
