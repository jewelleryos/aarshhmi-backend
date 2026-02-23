import { db } from '../../../lib/db'
import { STONE_GROUPS } from '../../../config/stone.config'
import { SYSTEM_TAG_GROUPS } from '../../../config/tag.config'
import { diamondClarityColorMessages } from '../config/diamond-clarity-color.messages'
import { AppError } from '../../../utils/app-error'
import { HTTP_STATUS } from '../../../config/constants'
import { getProductDependenciesByOptionValue } from '../../../utils/dependency-check'
import type {
  DiamondClarityColor,
  CreateDiamondClarityColorRequest,
  UpdateDiamondClarityColorRequest,
  DiamondClarityColorListResponse,
} from '../types/diamond-clarity-color.types'
import type { DependencyCheckResult, DependencyGroup } from '../../../types/dependency-check.types'

export const diamondClarityColorService = {
  // List all diamond clarity/colors (filtered by DIAMOND stone_group_id)
  async list(): Promise<DiamondClarityColorListResponse> {
    const result = await db.query(
      `SELECT id, stone_group_id, name, slug, description, image_url, image_alt_text, status, metadata, created_at, updated_at
       FROM stone_qualities
       WHERE stone_group_id = $1
       ORDER BY name`,
      [STONE_GROUPS.DIAMOND]
    )

    return { items: result.rows }
  },

  // Get single diamond clarity/color by ID (must belong to DIAMOND group)
  async getById(id: string): Promise<DiamondClarityColor> {
    const result = await db.query(
      `SELECT id, stone_group_id, name, slug, description, image_url, image_alt_text, status, metadata, created_at, updated_at
       FROM stone_qualities
       WHERE id = $1 AND stone_group_id = $2`,
      [id, STONE_GROUPS.DIAMOND]
    )

    if (result.rows.length === 0) {
      throw new AppError(diamondClarityColorMessages.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    return result.rows[0]
  },

  // Create diamond clarity/color (automatically sets DIAMOND stone_group_id)
  async create(data: CreateDiamondClarityColorRequest): Promise<DiamondClarityColor> {
    // Check if slug already exists
    const existingSlug = await db.query(`SELECT id FROM stone_qualities WHERE slug = $1`, [data.slug])

    if (existingSlug.rows.length > 0) {
      throw new AppError(diamondClarityColorMessages.SLUG_EXISTS, HTTP_STATUS.CONFLICT)
    }

    const result = await db.query(
      `INSERT INTO stone_qualities (stone_group_id, name, slug, description, image_url, image_alt_text, status, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, stone_group_id, name, slug, description, image_url, image_alt_text, status, metadata, created_at, updated_at`,
      [
        STONE_GROUPS.DIAMOND,
        data.name,
        data.slug,
        data.description || null,
        data.image_url || null,
        data.image_alt_text || null,
        data.status ?? true,
        data.metadata ? JSON.stringify(data.metadata) : '{}',
      ]
    )

    const diamondClarityColor = result.rows[0]

    // Create system tag for this diamond clarity/color
    await db.query(
      `INSERT INTO tags (tag_group_id, name, slug, source_id, is_system_generated, is_filterable, status)
       VALUES ($1, $2, $3, $4, TRUE, TRUE, TRUE)`,
      [SYSTEM_TAG_GROUPS.DIAMOND_CLARITY_COLOR, diamondClarityColor.name, diamondClarityColor.slug, diamondClarityColor.id]
    )

    return diamondClarityColor
  },

  // Update diamond clarity/color (must belong to DIAMOND group)
  async update(id: string, data: UpdateDiamondClarityColorRequest): Promise<DiamondClarityColor> {
    // Check if diamond clarity/color exists and belongs to DIAMOND group
    const existing = await db.query(`SELECT id FROM stone_qualities WHERE id = $1 AND stone_group_id = $2`, [
      id,
      STONE_GROUPS.DIAMOND,
    ])

    if (existing.rows.length === 0) {
      throw new AppError(diamondClarityColorMessages.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    // If slug is being updated, check for duplicates
    if (data.slug) {
      const existingSlug = await db.query(`SELECT id FROM stone_qualities WHERE slug = $1 AND id != $2`, [
        data.slug,
        id,
      ])

      if (existingSlug.rows.length > 0) {
        throw new AppError(diamondClarityColorMessages.SLUG_EXISTS, HTTP_STATUS.CONFLICT)
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
      `UPDATE stone_qualities
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}`,
      values
    )

    // Sync system tag if name or slug changed
    if (data.name !== undefined || data.slug !== undefined) {
      const updated = await this.getById(id)
      await db.query(
        `UPDATE tags SET name = $1, slug = $2 WHERE source_id = $3 AND tag_group_id = $4`,
        [updated.name, updated.slug, id, SYSTEM_TAG_GROUPS.DIAMOND_CLARITY_COLOR]
      )
    }

    return this.getById(id)
  },

  // Check dependencies before deletion
  async checkDependencies(id: string): Promise<DependencyCheckResult> {
    await this.getById(id)

    const [products, diamondPrices] = await Promise.all([
      getProductDependenciesByOptionValue('diamond_clarity_color', id),
      db.query(
        `SELECT sp.id, CONCAT(ss.name, ' - ', sp.ct_from, ' to ', sp.ct_to, ' ct') AS name
         FROM stone_prices sp
         JOIN stone_shapes ss ON sp.stone_shape_id = ss.id
         WHERE sp.stone_quality_id = $1
         ORDER BY ss.name`,
        [id]
      ).then(r => r.rows),
    ])

    const dependencies: DependencyGroup[] = []

    if (products.length > 0) {
      dependencies.push({ type: 'product', count: products.length, items: products })
    }
    if (diamondPrices.length > 0) {
      dependencies.push({ type: 'diamond_price', count: diamondPrices.length, items: diamondPrices })
    }

    return {
      can_delete: dependencies.length === 0,
      dependencies,
    }
  },

  // Delete diamond clarity color (with server-side dependency safety check)
  async delete(id: string): Promise<void> {
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

    // Delete the diamond clarity color (stone_qualities row)
    const result = await db.query(
      `DELETE FROM stone_qualities WHERE id = $1 AND stone_group_id = $2 RETURNING id`,
      [id, STONE_GROUPS.DIAMOND]
    )

    if (result.rows.length === 0) {
      throw new AppError(diamondClarityColorMessages.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }
  },

  // Get diamond clarity colors for product dropdown (with slug)
  async getForProduct(): Promise<{ id: string; name: string; slug: string }[]> {
    const result = await db.query(
      `SELECT id, name, slug FROM stone_qualities
       WHERE stone_group_id = $1 AND status = true
       ORDER BY name`,
      [STONE_GROUPS.DIAMOND]
    )
    return result.rows
  },
}
