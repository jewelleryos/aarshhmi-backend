import { db } from '../../../lib/db'
import { STONE_GROUPS } from '../../../config/stone.config'
import { SYSTEM_TAG_GROUPS } from '../../../config/tag.config'
import { gemstoneTypeMessages } from '../config/gemstone-type.messages'
import { AppError } from '../../../utils/app-error'
import { HTTP_STATUS } from '../../../config/constants'
import type {
  GemstoneType,
  CreateGemstoneTypeRequest,
  UpdateGemstoneTypeRequest,
  GemstoneTypeListResponse,
} from '../types/gemstone-type.types'
import type { DependencyCheckResult, DependencyGroup } from '../../../types/dependency-check.types'

export const gemstoneTypeService = {
  // List all gemstone types (filtered by GEMSTONE stone_group_id)
  async list(): Promise<GemstoneTypeListResponse> {
    const result = await db.query(
      `SELECT id, stone_group_id, name, slug, description, image_url, image_alt_text, status, metadata, created_at, updated_at
       FROM stone_types
       WHERE stone_group_id = $1
       ORDER BY name`,
      [STONE_GROUPS.GEMSTONE]
    )

    return { items: result.rows }
  },

  // Get single gemstone type by ID (must belong to GEMSTONE group)
  async getById(id: string): Promise<GemstoneType> {
    const result = await db.query(
      `SELECT id, stone_group_id, name, slug, description, image_url, image_alt_text, status, metadata, created_at, updated_at
       FROM stone_types
       WHERE id = $1 AND stone_group_id = $2`,
      [id, STONE_GROUPS.GEMSTONE]
    )

    if (result.rows.length === 0) {
      throw new AppError(gemstoneTypeMessages.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    return result.rows[0]
  },

  // Create gemstone type (automatically sets GEMSTONE stone_group_id)
  async create(data: CreateGemstoneTypeRequest): Promise<GemstoneType> {
    // Check if slug already exists
    const existingSlug = await db.query(
      `SELECT id FROM stone_types WHERE slug = $1`,
      [data.slug]
    )

    if (existingSlug.rows.length > 0) {
      throw new AppError(gemstoneTypeMessages.SLUG_EXISTS, HTTP_STATUS.CONFLICT)
    }

    const result = await db.query(
      `INSERT INTO stone_types (stone_group_id, name, slug, description, image_url, image_alt_text, status, metadata)
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

    const gemstoneType = result.rows[0]

    // Create system tag for this gemstone type
    await db.query(
      `INSERT INTO tags (tag_group_id, name, slug, source_id, is_system_generated, is_filterable, status)
       VALUES ($1, $2, $3, $4, TRUE, TRUE, TRUE)`,
      [SYSTEM_TAG_GROUPS.GEMSTONE_TYPE, gemstoneType.name, gemstoneType.slug, gemstoneType.id]
    )

    return gemstoneType
  },

  // Get dropdown items for gemstone pricing (id, name, slug)
  async dropdown(): Promise<{ items: { id: string; name: string; slug: string }[] }> {
    const result = await db.query(
      `SELECT id, name, slug FROM stone_types
       WHERE stone_group_id = $1 AND status = true
       ORDER BY name`,
      [STONE_GROUPS.GEMSTONE]
    )
    return { items: result.rows }
  },

  // Update gemstone type (must belong to GEMSTONE group)
  async update(id: string, data: UpdateGemstoneTypeRequest): Promise<GemstoneType> {
    // Check if gemstone type exists and belongs to GEMSTONE group
    const existing = await db.query(
      `SELECT id FROM stone_types WHERE id = $1 AND stone_group_id = $2`,
      [id, STONE_GROUPS.GEMSTONE]
    )

    if (existing.rows.length === 0) {
      throw new AppError(gemstoneTypeMessages.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    // If slug is being updated, check for duplicates
    if (data.slug) {
      const existingSlug = await db.query(
        `SELECT id FROM stone_types WHERE slug = $1 AND id != $2`,
        [data.slug, id]
      )

      if (existingSlug.rows.length > 0) {
        throw new AppError(gemstoneTypeMessages.SLUG_EXISTS, HTTP_STATUS.CONFLICT)
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
        [updated.name, updated.slug, id, SYSTEM_TAG_GROUPS.GEMSTONE_TYPE]
      )
    }

    return this.getById(id)
  },

  // Check dependencies before deletion
  async checkDependencies(id: string): Promise<DependencyCheckResult> {
    await this.getById(id)

    const [products, gemstonePrices] = await Promise.all([
      // Tag-based query — gemstone types have system tags linked to products via product_tags
      db.query(
        `SELECT DISTINCT p.id, p.name, p.base_sku AS sku
         FROM products p
         JOIN product_tags pt ON pt.product_id = p.id
         JOIN tags t ON t.id = pt.tag_id
         WHERE t.source_id = $1 AND t.is_system_generated = TRUE
           AND p.status != 'archived'
         ORDER BY p.name`,
        [id]
      ).then(r => r.rows),

      // Hard FK — stone_prices.stone_type_id
      db.query(
        `SELECT sp.id, CONCAT(st.name, ' - ', ss.name, ' - ', sc.name, ' (', sp.ct_from, '-', sp.ct_to, ' ct)') AS name
         FROM stone_prices sp
         JOIN stone_types st ON sp.stone_type_id = st.id
         JOIN stone_shapes ss ON sp.stone_shape_id = ss.id
         LEFT JOIN stone_colors sc ON sp.stone_color_id = sc.id
         WHERE sp.stone_type_id = $1
         ORDER BY ss.name, sp.ct_from`,
        [id]
      ).then(r => r.rows),
    ])

    const dependencies: DependencyGroup[] = []

    if (products.length > 0) {
      dependencies.push({ type: 'product', count: products.length, items: products })
    }

    if (gemstonePrices.length > 0) {
      dependencies.push({ type: 'gemstone_price', count: gemstonePrices.length, items: gemstonePrices })
    }

    return {
      can_delete: dependencies.length === 0,
      dependencies,
    }
  },

  // Delete gemstone type (with server-side dependency safety check)
  async delete(id: string): Promise<void> {
    const check = await this.checkDependencies(id)

    if (!check.can_delete) {
      const summary = check.dependencies.map(d => `${d.count} ${d.type}(s)`).join(', ')
      throw new AppError(`Cannot delete. Used by: ${summary}`, HTTP_STATUS.CONFLICT)
    }

    // Delete system tag first
    await db.query(
      `DELETE FROM tags WHERE source_id = $1 AND is_system_generated = TRUE`,
      [id]
    )

    const result = await db.query(
      `DELETE FROM stone_types WHERE id = $1 AND stone_group_id = $2 RETURNING id`,
      [id, STONE_GROUPS.GEMSTONE]
    )

    if (result.rows.length === 0) {
      throw new AppError(gemstoneTypeMessages.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }
  },

  // Get gemstone types for product dropdown (with slug)
  async getForProduct(): Promise<{ id: string; name: string; slug: string }[]> {
    const result = await db.query(
      `SELECT id, name, slug FROM stone_types
       WHERE stone_group_id = $1 AND status = true
       ORDER BY name`,
      [STONE_GROUPS.GEMSTONE]
    )
    return result.rows
  },
}
