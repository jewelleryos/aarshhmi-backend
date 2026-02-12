import { db } from '../../../lib/db'
import { STONE_GROUPS } from '../../../config/stone.config'
import { gemstonePricingMessages } from '../config/gemstone-pricing.messages'
import { AppError } from '../../../utils/app-error'
import { HTTP_STATUS } from '../../../config/constants'
import type {
  GemstonePrice,
  CreateGemstonePriceRequest,
  UpdateGemstonePriceRequest,
  GemstonePriceListResponse,
  GemstonePriceFilters,
} from '../types/gemstone-pricing.types'

export const gemstonePricingService = {
  // List all gemstone prices with optional filters
  async list(filters?: GemstonePriceFilters): Promise<GemstonePriceListResponse> {
    let query = `
      SELECT
        sp.id, sp.stone_group_id, sp.stone_type_id, sp.stone_shape_id,
        sp.stone_quality_id, sp.stone_color_id, sp.ct_from, sp.ct_to,
        sp.price, sp.status, sp.metadata, sp.created_at, sp.updated_at,
        st.name as type_name,
        ss.name as shape_name,
        sq.name as quality_name,
        sc.name as color_name
      FROM stone_prices sp
      LEFT JOIN stone_types st ON sp.stone_type_id = st.id
      LEFT JOIN stone_shapes ss ON sp.stone_shape_id = ss.id
      LEFT JOIN stone_qualities sq ON sp.stone_quality_id = sq.id
      LEFT JOIN stone_colors sc ON sp.stone_color_id = sc.id
      WHERE sp.stone_group_id = $1
    `
    const params: unknown[] = [STONE_GROUPS.GEMSTONE]
    let paramIndex = 2

    if (filters?.stone_type_id) {
      query += ` AND sp.stone_type_id = $${paramIndex++}`
      params.push(filters.stone_type_id)
    }

    if (filters?.stone_shape_id) {
      query += ` AND sp.stone_shape_id = $${paramIndex++}`
      params.push(filters.stone_shape_id)
    }

    if (filters?.stone_quality_id) {
      query += ` AND sp.stone_quality_id = $${paramIndex++}`
      params.push(filters.stone_quality_id)
    }

    if (filters?.stone_color_id) {
      query += ` AND sp.stone_color_id = $${paramIndex++}`
      params.push(filters.stone_color_id)
    }

    query += ` ORDER BY st.name, sq.name, sc.name, ss.name, sp.ct_from`

    const result = await db.query(query, params)

    // Convert NUMERIC fields to numbers
    const items = result.rows.map((row) => ({
      ...row,
      ct_from: parseFloat(row.ct_from),
      ct_to: parseFloat(row.ct_to),
    }))

    return { items }
  },

  // Get single gemstone price by ID
  async getById(id: string): Promise<GemstonePrice> {
    const result = await db.query(
      `SELECT
        sp.id, sp.stone_group_id, sp.stone_type_id, sp.stone_shape_id,
        sp.stone_quality_id, sp.stone_color_id, sp.ct_from, sp.ct_to,
        sp.price, sp.status, sp.metadata, sp.created_at, sp.updated_at,
        st.name as type_name,
        ss.name as shape_name,
        sq.name as quality_name,
        sc.name as color_name
      FROM stone_prices sp
      LEFT JOIN stone_types st ON sp.stone_type_id = st.id
      LEFT JOIN stone_shapes ss ON sp.stone_shape_id = ss.id
      LEFT JOIN stone_qualities sq ON sp.stone_quality_id = sq.id
      LEFT JOIN stone_colors sc ON sp.stone_color_id = sc.id
      WHERE sp.id = $1 AND sp.stone_group_id = $2`,
      [id, STONE_GROUPS.GEMSTONE]
    )

    if (result.rows.length === 0) {
      throw new AppError(gemstonePricingMessages.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    const row = result.rows[0]
    return {
      ...row,
      ct_from: parseFloat(row.ct_from),
      ct_to: parseFloat(row.ct_to),
    }
  },

  // Validate gemstone type exists and belongs to GEMSTONE group
  async validateGemstoneType(typeId: string): Promise<void> {
    const result = await db.query(
      `SELECT id FROM stone_types WHERE id = $1 AND stone_group_id = $2 AND status = true`,
      [typeId, STONE_GROUPS.GEMSTONE]
    )
    if (result.rows.length === 0) {
      throw new AppError(gemstonePricingMessages.INVALID_GEMSTONE_TYPE, HTTP_STATUS.BAD_REQUEST)
    }
  },

  // Validate shape exists
  async validateShape(shapeId: string): Promise<void> {
    const result = await db.query(`SELECT id FROM stone_shapes WHERE id = $1 AND status = true`, [shapeId])
    if (result.rows.length === 0) {
      throw new AppError(gemstonePricingMessages.INVALID_SHAPE, HTTP_STATUS.BAD_REQUEST)
    }
  },

  // Validate quality exists and belongs to GEMSTONE group
  async validateQuality(qualityId: string): Promise<void> {
    const result = await db.query(
      `SELECT id FROM stone_qualities WHERE id = $1 AND stone_group_id = $2 AND status = true`,
      [qualityId, STONE_GROUPS.GEMSTONE]
    )
    if (result.rows.length === 0) {
      throw new AppError(gemstonePricingMessages.INVALID_QUALITY, HTTP_STATUS.BAD_REQUEST)
    }
  },

  // Validate color exists and belongs to GEMSTONE group
  async validateColor(colorId: string): Promise<void> {
    const result = await db.query(
      `SELECT id FROM stone_colors WHERE id = $1 AND stone_group_id = $2 AND status = true`,
      [colorId, STONE_GROUPS.GEMSTONE]
    )
    if (result.rows.length === 0) {
      throw new AppError(gemstonePricingMessages.INVALID_COLOR, HTTP_STATUS.BAD_REQUEST)
    }
  },

  // Check for duplicate entry
  async checkDuplicate(
    typeId: string,
    shapeId: string,
    qualityId: string,
    colorId: string,
    ctFrom: number,
    ctTo: number,
    excludeId?: string
  ): Promise<void> {
    let query = `
      SELECT id FROM stone_prices
      WHERE stone_group_id = $1
        AND stone_type_id = $2
        AND stone_shape_id = $3
        AND stone_quality_id = $4
        AND stone_color_id = $5
        AND ct_from = $6 AND ct_to = $7
    `
    const params: unknown[] = [
      STONE_GROUPS.GEMSTONE,
      typeId,
      shapeId,
      qualityId,
      colorId,
      ctFrom,
      ctTo,
    ]

    if (excludeId) {
      query += ` AND id != $8`
      params.push(excludeId)
    }

    const result = await db.query(query, params)
    if (result.rows.length > 0) {
      throw new AppError(gemstonePricingMessages.DUPLICATE_ENTRY, HTTP_STATUS.CONFLICT)
    }
  },

  // Create gemstone price
  async create(data: CreateGemstonePriceRequest): Promise<GemstonePrice> {
    // Validate all references
    await this.validateGemstoneType(data.stone_type_id)
    await this.validateShape(data.stone_shape_id)
    await this.validateQuality(data.stone_quality_id)
    await this.validateColor(data.stone_color_id)

    // Check for duplicate
    await this.checkDuplicate(
      data.stone_type_id,
      data.stone_shape_id,
      data.stone_quality_id,
      data.stone_color_id,
      data.ct_from,
      data.ct_to
    )

    const result = await db.query(
      `INSERT INTO stone_prices (
        stone_group_id, stone_type_id, stone_shape_id, stone_quality_id,
        stone_color_id, ct_from, ct_to, price, status, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        STONE_GROUPS.GEMSTONE,
        data.stone_type_id,
        data.stone_shape_id,
        data.stone_quality_id,
        data.stone_color_id,
        data.ct_from,
        data.ct_to,
        data.price,
        data.status ?? true,
        data.metadata ? JSON.stringify(data.metadata) : '{}',
      ]
    )

    return this.getById(result.rows[0].id)
  },

  // Update gemstone price
  async update(id: string, data: UpdateGemstonePriceRequest): Promise<GemstonePrice> {
    // Get existing record
    const existing = await this.getById(id)

    // Validate gemstone type if provided
    if (data.stone_type_id) {
      await this.validateGemstoneType(data.stone_type_id)
    }

    // Validate shape if provided
    if (data.stone_shape_id) {
      await this.validateShape(data.stone_shape_id)
    }

    // Validate quality if provided
    if (data.stone_quality_id) {
      await this.validateQuality(data.stone_quality_id)
    }

    // Validate color if provided
    if (data.stone_color_id) {
      await this.validateColor(data.stone_color_id)
    }

    // Check for duplicate if any key field changed
    const typeId = data.stone_type_id || existing.stone_type_id
    const shapeId = data.stone_shape_id || existing.stone_shape_id
    const qualityId = data.stone_quality_id || existing.stone_quality_id
    const colorId = data.stone_color_id || existing.stone_color_id
    const ctFrom = data.ct_from ?? existing.ct_from
    const ctTo = data.ct_to ?? existing.ct_to

    await this.checkDuplicate(typeId, shapeId, qualityId, colorId, ctFrom, ctTo, id)

    // Build dynamic update query
    const updates: string[] = []
    const values: unknown[] = []
    let paramIndex = 1

    if (data.stone_type_id !== undefined) {
      updates.push(`stone_type_id = $${paramIndex++}`)
      values.push(data.stone_type_id)
    }
    if (data.stone_shape_id !== undefined) {
      updates.push(`stone_shape_id = $${paramIndex++}`)
      values.push(data.stone_shape_id)
    }
    if (data.stone_quality_id !== undefined) {
      updates.push(`stone_quality_id = $${paramIndex++}`)
      values.push(data.stone_quality_id)
    }
    if (data.stone_color_id !== undefined) {
      updates.push(`stone_color_id = $${paramIndex++}`)
      values.push(data.stone_color_id)
    }
    if (data.ct_from !== undefined) {
      updates.push(`ct_from = $${paramIndex++}`)
      values.push(data.ct_from)
    }
    if (data.ct_to !== undefined) {
      updates.push(`ct_to = $${paramIndex++}`)
      values.push(data.ct_to)
    }
    if (data.price !== undefined) {
      updates.push(`price = $${paramIndex++}`)
      values.push(data.price)
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
      return existing
    }

    values.push(id)

    await db.query(`UPDATE stone_prices SET ${updates.join(', ')} WHERE id = $${paramIndex}`, values)

    return this.getById(id)
  },

  // Get gemstone pricings for product dropdown (for price calculation)
  async getForProduct(): Promise<{
    id: string
    stone_type_id: string
    stone_shape_id: string
    stone_quality_id: string
    stone_color_id: string
    ct_from: number
    ct_to: number
    price: number
  }[]> {
    const result = await db.query(
      `SELECT id, stone_type_id, stone_shape_id, stone_quality_id, stone_color_id, ct_from, ct_to, price
       FROM stone_prices
       WHERE stone_group_id = $1 AND status = true
       ORDER BY stone_type_id, stone_shape_id, stone_quality_id, stone_color_id, ct_from`,
      [STONE_GROUPS.GEMSTONE]
    )
    // Convert NUMERIC fields to numbers
    return result.rows.map((row) => ({
      ...row,
      ct_from: parseFloat(row.ct_from),
      ct_to: parseFloat(row.ct_to),
    }))
  },
}
