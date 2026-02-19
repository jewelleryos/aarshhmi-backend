import { db } from '../../../lib/db'
import { metalTypeMessages } from '../config/metal-type.messages'
import { AppError } from '../../../utils/app-error'
import { HTTP_STATUS } from '../../../config/constants'
import { SYSTEM_TAG_GROUPS } from '../../../config/tag.config'
import { getProductDependenciesByOptionValue } from '../../../utils/dependency-check'
import type {
  MetalType,
  CreateMetalTypeRequest,
  UpdateMetalTypeRequest,
  MetalTypeListResponse,
} from '../types/metal-type.types'
import type { DependencyCheckResult, DependencyGroup } from '../../../types/dependency-check.types'

export const metalTypeService = {
  // List all metal types
  async list(): Promise<MetalTypeListResponse> {
    const result = await db.query(
      `SELECT id, name, slug, description, image_url, image_alt_text, status, created_at, updated_at
       FROM metal_types
       ORDER BY created_at DESC`
    )

    return { items: result.rows }
  },

  // Get single metal type by ID
  async getById(id: string): Promise<MetalType> {
    const result = await db.query(
      `SELECT id, name, slug, description, image_url, image_alt_text, status, created_at, updated_at
       FROM metal_types
       WHERE id = $1`,
      [id]
    )

    if (result.rows.length === 0) {
      throw new AppError(metalTypeMessages.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    return result.rows[0]
  },

  // Create metal type
  async create(data: CreateMetalTypeRequest): Promise<MetalType> {
    // Check if slug already exists
    const existingSlug = await db.query(
      `SELECT id FROM metal_types WHERE slug = $1`,
      [data.slug]
    )

    if (existingSlug.rows.length > 0) {
      throw new AppError(metalTypeMessages.SLUG_EXISTS, HTTP_STATUS.CONFLICT)
    }

    const result = await db.query(
      `INSERT INTO metal_types (name, slug, description, image_url, image_alt_text, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, slug, description, image_url, image_alt_text, status, created_at, updated_at`,
      [
        data.name,
        data.slug,
        data.description || null,
        data.image_url || null,
        data.image_alt_text || null,
        data.status ?? true,
      ]
    )

    const metalType = result.rows[0]

    // Create system tag for this metal type
    await db.query(
      `INSERT INTO tags (tag_group_id, name, slug, source_id, is_system_generated, is_filterable, status)
       VALUES ($1, $2, $3, $4, TRUE, TRUE, TRUE)`,
      [SYSTEM_TAG_GROUPS.METAL_TYPE, metalType.name, metalType.slug, metalType.id]
    )

    return metalType
  },

  // Update metal type
  async update(id: string, data: UpdateMetalTypeRequest): Promise<MetalType> {
    // Check if metal type exists
    const existing = await db.query(
      `SELECT id FROM metal_types WHERE id = $1`,
      [id]
    )

    if (existing.rows.length === 0) {
      throw new AppError(metalTypeMessages.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    // If slug is being updated, check for duplicates
    if (data.slug) {
      const existingSlug = await db.query(
        `SELECT id FROM metal_types WHERE slug = $1 AND id != $2`,
        [data.slug, id]
      )

      if (existingSlug.rows.length > 0) {
        throw new AppError(metalTypeMessages.SLUG_EXISTS, HTTP_STATUS.CONFLICT)
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

    const result = await db.query(
      `UPDATE metal_types
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, name, slug, description, image_url, image_alt_text, status, created_at, updated_at`,
      values
    )

    const metalType = result.rows[0]

    // Sync system tag if name or slug changed
    if (data.name !== undefined || data.slug !== undefined) {
      await db.query(
        `UPDATE tags SET name = $1, slug = $2 WHERE source_id = $3 AND tag_group_id = $4`,
        [metalType.name, metalType.slug, id, SYSTEM_TAG_GROUPS.METAL_TYPE]
      )
    }

    return metalType
  },

  // Check dependencies before deletion
  async checkDependencies(id: string): Promise<DependencyCheckResult> {
    // Verify metal type exists
    await this.getById(id)

    // Run all dependency queries in parallel
    const [products, metalColors, metalPurities, makingCharges] = await Promise.all([
      getProductDependenciesByOptionValue('metal_type', id),
      db.query(
        `SELECT id, name FROM metal_colors WHERE metal_type_id = $1 ORDER BY name`,
        [id]
      ).then(r => r.rows),
      db.query(
        `SELECT id, name FROM metal_purities WHERE metal_type_id = $1 ORDER BY name`,
        [id]
      ).then(r => r.rows),
      db.query(
        `SELECT id, CONCAT("from", 'g - ', "to", 'g') AS name FROM making_charges WHERE metal_type_id = $1 ORDER BY "from"`,
        [id]
      ).then(r => r.rows),
    ])

    // Build dependency groups (only include non-empty ones)
    const dependencies: DependencyGroup[] = []

    if (products.length > 0) {
      dependencies.push({ type: 'product', count: products.length, items: products })
    }
    if (metalColors.length > 0) {
      dependencies.push({ type: 'metal_color', count: metalColors.length, items: metalColors })
    }
    if (metalPurities.length > 0) {
      dependencies.push({ type: 'metal_purity', count: metalPurities.length, items: metalPurities })
    }
    if (makingCharges.length > 0) {
      dependencies.push({ type: 'making_charge', count: makingCharges.length, items: makingCharges })
    }

    return {
      can_delete: dependencies.length === 0,
      dependencies,
    }
  },

  // Delete metal type (with dependency safety check)
  async delete(id: string): Promise<void> {
        // Server-side safety — always check dependencies before deleting
    const check = await this.checkDependencies(id)

    if (!check.can_delete) {
      const parts = check.dependencies.map(d => `${d.count} ${d.type.replace(/_/g, ' ')}(s)`)
      throw new AppError(
        `Cannot delete. Used by: ${parts.join(', ')}`,
        HTTP_STATUS.CONFLICT
      )
    }

    // Delete system tag first
    await db.query(
      `DELETE FROM tags WHERE source_id = $1 AND is_system_generated = TRUE`,
      [id]
    )

    // Delete the metal type
    const result = await db.query(
      `DELETE FROM metal_types WHERE id = $1 RETURNING id`,
      [id]
    )

    if (result.rows.length === 0) {
      throw new AppError(metalTypeMessages.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }
  },

  // Get metal types for metal color dropdown (minimal data)
  async getForMetalColor(): Promise<{ id: string; name: string }[]> {
    const result = await db.query(
      `SELECT id, name FROM metal_types WHERE status = true ORDER BY name`
    )
    return result.rows
  },

  // Get metal types for metal purity dropdown (minimal data)
  async getForMetalPurity(): Promise<{ id: string; name: string }[]> {
    const result = await db.query(
      `SELECT id, name FROM metal_types WHERE status = true ORDER BY name`
    )
    return result.rows
  },

  // Get metal types for making charge dropdown (minimal data)
  async getForMakingCharge(): Promise<{ id: string; name: string }[]> {
    const result = await db.query(
      `SELECT id, name FROM metal_types WHERE status = true ORDER BY name`
    )
    return result.rows
  },

  // Get metal types for product dropdown (with slug)
  async getForProduct(): Promise<{ id: string; name: string; slug: string }[]> {
    const result = await db.query(
      `SELECT id, name, slug FROM metal_types WHERE status = true ORDER BY name`
    )
    return result.rows
  },
}
