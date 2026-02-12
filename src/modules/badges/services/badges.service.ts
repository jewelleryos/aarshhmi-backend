import { db } from '../../../lib/db'
import { badgeMessages } from '../config/badges.messages'
import { AppError } from '../../../utils/app-error'
import { HTTP_STATUS } from '../../../config/constants'
import type {
  Badge,
  CreateBadgeRequest,
  UpdateBadgeRequest,
  BadgeListResponse,
} from '../types/badges.types'

export const badgeService = {
  // List all badges
  async list(): Promise<BadgeListResponse> {
    const result = await db.query(
      `SELECT id, name, slug, bg_color, font_color, position,
              status, metadata, created_at, updated_at
       FROM badges
       ORDER BY name ASC`
    )

    return { items: result.rows }
  },

  // Get single badge by ID
  async getById(id: string): Promise<Badge> {
    const result = await db.query(
      `SELECT id, name, slug, bg_color, font_color, position,
              status, metadata, created_at, updated_at
       FROM badges
       WHERE id = $1`,
      [id]
    )

    if (result.rows.length === 0) {
      throw new AppError(badgeMessages.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    return result.rows[0]
  },

  // Create badge
  async create(data: CreateBadgeRequest): Promise<Badge> {
    // Check if slug already exists
    const existingSlug = await db.query(
      `SELECT id FROM badges WHERE slug = $1`,
      [data.slug]
    )

    if (existingSlug.rows.length > 0) {
      throw new AppError(badgeMessages.SLUG_EXISTS, HTTP_STATUS.CONFLICT)
    }

    const result = await db.query(
      `INSERT INTO badges (
        name, slug, bg_color, font_color, position, status, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id`,
      [
        data.name,
        data.slug,
        data.bg_color,
        data.font_color,
        data.position,
        data.status ?? true,
        data.metadata || {},
      ]
    )

    return this.getById(result.rows[0].id)
  },

  // Update badge
  async update(id: string, data: UpdateBadgeRequest): Promise<Badge> {
    // Check if badge exists
    const existing = await db.query(
      `SELECT id FROM badges WHERE id = $1`,
      [id]
    )

    if (existing.rows.length === 0) {
      throw new AppError(badgeMessages.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    // If slug is being updated, check for duplicates
    if (data.slug) {
      const existingSlug = await db.query(
        `SELECT id FROM badges WHERE slug = $1 AND id != $2`,
        [data.slug, id]
      )

      if (existingSlug.rows.length > 0) {
        throw new AppError(badgeMessages.SLUG_EXISTS, HTTP_STATUS.CONFLICT)
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
    if (data.bg_color !== undefined) {
      updates.push(`bg_color = $${paramIndex++}`)
      values.push(data.bg_color)
    }
    if (data.font_color !== undefined) {
      updates.push(`font_color = $${paramIndex++}`)
      values.push(data.font_color)
    }
    if (data.position !== undefined) {
      updates.push(`position = $${paramIndex++}`)
      values.push(data.position)
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
      `UPDATE badges SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      values
    )

    return this.getById(id)
  },

  // Get badges for product dropdown (minimal data)
  async getForProduct(): Promise<{ id: string; name: string }[]> {
    const result = await db.query(
      `SELECT id, name FROM badges WHERE status = true ORDER BY position ASC`
    )
    return result.rows
  },

  // Delete badge (for future use)
  async delete(id: string): Promise<void> {
    // Check if badge exists
    const existing = await db.query(
      `SELECT id FROM badges WHERE id = $1`,
      [id]
    )

    if (existing.rows.length === 0) {
      throw new AppError(badgeMessages.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    await db.query(`DELETE FROM badges WHERE id = $1`, [id])
  },
}
