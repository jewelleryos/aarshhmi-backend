import { db } from '../../../lib/db'
import { metalColorMessages } from '../config/metal-color.messages'
import { AppError } from '../../../utils/app-error'
import { HTTP_STATUS } from '../../../config/constants'
import { SYSTEM_TAG_GROUPS } from '../../../config/tag.config'
import { getProductDependenciesByOptionValue } from '../../../utils/dependency-check'
import type {
  MetalColor,
  CreateMetalColorRequest,
  UpdateMetalColorRequest,
  MetalColorListResponse,
} from '../types/metal-color.types'
import type { DependencyCheckResult, DependencyGroup } from '../../../types/dependency-check.types'

export const metalColorService = {
  // List all metal colors
  async list(): Promise<MetalColorListResponse> {
    const result = await db.query(
      `SELECT id, name, slug, description, image_url, image_alt_text, status, created_at, updated_at
       FROM metal_colors
       ORDER BY created_at DESC`
    )

    return { items: result.rows }
  },

  // Get single metal color by ID
  async getById(id: string): Promise<MetalColor> {
    const result = await db.query(
      `SELECT id, name, slug, description, image_url, image_alt_text, status, created_at, updated_at
       FROM metal_colors
       WHERE id = $1`,
      [id]
    )

    if (result.rows.length === 0) {
      throw new AppError(metalColorMessages.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    return result.rows[0]
  },

  // Create metal color
  async create(data: CreateMetalColorRequest): Promise<MetalColor> {
    // Check if slug already exists
    const existingSlug = await db.query(
      `SELECT id FROM metal_colors WHERE slug = $1`,
      [data.slug]
    )

    if (existingSlug.rows.length > 0) {
      throw new AppError(metalColorMessages.SLUG_EXISTS, HTTP_STATUS.CONFLICT)
    }

    const result = await db.query(
      `INSERT INTO metal_colors (name, slug, description, image_url, image_alt_text, status)
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

    const metalColor = result.rows[0]

    // Create system tag for this metal color
    await db.query(
      `INSERT INTO tags (tag_group_id, name, slug, source_id, is_system_generated, is_filterable, status)
       VALUES ($1, $2, $3, $4, TRUE, TRUE, TRUE)`,
      [SYSTEM_TAG_GROUPS.METAL_COLOR, metalColor.name, metalColor.slug, metalColor.id]
    )

    return this.getById(metalColor.id)
  },

  // Update metal color
  async update(id: string, data: UpdateMetalColorRequest): Promise<MetalColor> {
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

    // Async sync product metadata if display fields changed
    const displayFieldChanged =
      data.name !== undefined ||
      data.slug !== undefined ||
      data.image_url !== undefined ||
      data.image_alt_text !== undefined

    if (displayFieldChanged) {
      this.syncProductOptionConfig(id).catch((err) =>
        console.error(`[MetalColor] Failed to sync optionConfig for metal color ${id}:`, err)
      )
    }

    return this.getById(id)
  },

  // Check dependencies before deletion
  async checkDependencies(id: string): Promise<DependencyCheckResult> {
    await this.getById(id)

    const products = await getProductDependenciesByOptionValue('metal_color', id)

    const dependencies: DependencyGroup[] = []

    if (products.length > 0) {
      dependencies.push({ type: 'product', count: products.length, items: products })
    }

    return {
      can_delete: dependencies.length === 0,
      dependencies,
    }
  },

  // Delete metal color (with server-side dependency safety check)
  async delete(id: string): Promise<void> {
    const check = await this.checkDependencies(id)

    if (!check.can_delete) {
      throw new AppError(
        `Cannot delete. Used by: ${check.dependencies[0].count} product(s)`,
        HTTP_STATUS.CONFLICT
      )
    }

    // Delete system tag first
    await db.query(
      `DELETE FROM tags WHERE source_id = $1 AND is_system_generated = TRUE`,
      [id]
    )

    // Delete the metal color
    const result = await db.query(
      `DELETE FROM metal_colors WHERE id = $1 RETURNING id`,
      [id]
    )

    if (result.rows.length === 0) {
      throw new AppError(metalColorMessages.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }
  },

  // Get metal colors for product dropdown
  async getForProduct(): Promise<{ id: string; name: string; slug: string }[]> {
    const result = await db.query(
      `SELECT id, name, slug FROM metal_colors WHERE status = true ORDER BY name`
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

  // Sync optionConfig.metalColors in all products that use this metal color
  // Uses a single SQL query to update all affected products at once
  // Only touches metadata.optionConfig.metalColors — all other metadata fields are untouched
  async syncProductOptionConfig(metalColorId: string): Promise<void> {
    const result = await db.query(
      `UPDATE products
       SET metadata = jsonb_set(
         metadata,
         '{optionConfig,metalColors}',
         (
           SELECT COALESCE(
             jsonb_agg(
               CASE
                 WHEN elem->>'id' = $1
                 THEN jsonb_build_object(
                   'id', mc.id,
                   'name', mc.name,
                   'slug', mc.slug,
                   'imageUrl', mc.image_url,
                   'imageAltText', mc.image_alt_text
                 )
                 ELSE elem
               END
             ),
             metadata->'optionConfig'->'metalColors'
           )
           FROM jsonb_array_elements(metadata->'optionConfig'->'metalColors') AS elem
           CROSS JOIN metal_colors mc
           WHERE mc.id = $1
         )
       ),
       updated_at = NOW()
       WHERE metadata->'optionConfig'->'metalColors' @> $2::jsonb
         AND EXISTS (SELECT 1 FROM metal_colors WHERE id = $1)`,
      [metalColorId, JSON.stringify([{ id: metalColorId }])]
    )

    if (result.rowCount && result.rowCount > 0) {
      console.log(`[MetalColor] Synced optionConfig for ${result.rowCount} product(s) using metal color ${metalColorId}`)
    }
  },
}
