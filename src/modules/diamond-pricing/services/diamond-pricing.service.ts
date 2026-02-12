import { db } from '../../../lib/db'
import { STONE_GROUPS, STONE_TYPES } from '../../../config/stone.config'
import { diamondPricingMessages } from '../config/diamond-pricing.messages'
import { AppError } from '../../../utils/app-error'
import { HTTP_STATUS } from '../../../config/constants'
import type {
  DiamondPrice,
  CreateDiamondPriceRequest,
  UpdateDiamondPriceRequest,
  DiamondPriceListResponse,
  DiamondPriceFilters,
} from '../types/diamond-pricing.types'

export const diamondPricingService = {
  // List all diamond prices with optional filters
  async list(filters?: DiamondPriceFilters): Promise<DiamondPriceListResponse> {
    let query = `
      SELECT
        sp.id, sp.stone_group_id, sp.stone_type_id, sp.stone_shape_id,
        sp.stone_quality_id, sp.stone_color_id, sp.ct_from, sp.ct_to,
        sp.price, sp.status, sp.metadata, sp.created_at, sp.updated_at,
        ss.name as shape_name,
        sq.name as quality_name
      FROM stone_prices sp
      LEFT JOIN stone_shapes ss ON sp.stone_shape_id = ss.id
      LEFT JOIN stone_qualities sq ON sp.stone_quality_id = sq.id
      WHERE sp.stone_group_id = $1 AND sp.stone_type_id = $2
    `
    const params: any[] = [STONE_GROUPS.DIAMOND, STONE_TYPES.LAB_GROWN_DIAMOND]
    let paramIndex = 3

    if (filters?.stone_shape_id) {
      query += ` AND sp.stone_shape_id = $${paramIndex++}`
      params.push(filters.stone_shape_id)
    }

    if (filters?.stone_quality_id) {
      query += ` AND sp.stone_quality_id = $${paramIndex++}`
      params.push(filters.stone_quality_id)
    }

    query += ` ORDER BY sq.name, ss.name, sp.ct_from`

    const result = await db.query(query, params)

    // Convert NUMERIC fields to numbers
    const items = result.rows.map((row) => ({
      ...row,
      ct_from: parseFloat(row.ct_from),
      ct_to: parseFloat(row.ct_to),
    }))

    return { items }
  },

  // Get single diamond price by ID
  async getById(id: string): Promise<DiamondPrice> {
    const result = await db.query(
      `SELECT
        sp.id, sp.stone_group_id, sp.stone_type_id, sp.stone_shape_id,
        sp.stone_quality_id, sp.stone_color_id, sp.ct_from, sp.ct_to,
        sp.price, sp.status, sp.metadata, sp.created_at, sp.updated_at,
        ss.name as shape_name,
        sq.name as quality_name
      FROM stone_prices sp
      LEFT JOIN stone_shapes ss ON sp.stone_shape_id = ss.id
      LEFT JOIN stone_qualities sq ON sp.stone_quality_id = sq.id
      WHERE sp.id = $1 AND sp.stone_group_id = $2 AND sp.stone_type_id = $3`,
      [id, STONE_GROUPS.DIAMOND, STONE_TYPES.LAB_GROWN_DIAMOND]
    )

    if (result.rows.length === 0) {
      throw new AppError(diamondPricingMessages.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    const row = result.rows[0]
    return {
      ...row,
      ct_from: parseFloat(row.ct_from),
      ct_to: parseFloat(row.ct_to),
    }
  },

  // Validate shape exists
  async validateShape(shapeId: string): Promise<void> {
    const result = await db.query(`SELECT id FROM stone_shapes WHERE id = $1 AND status = true`, [shapeId])
    if (result.rows.length === 0) {
      throw new AppError(diamondPricingMessages.INVALID_SHAPE, HTTP_STATUS.BAD_REQUEST)
    }
  },

  // Validate quality exists and belongs to DIAMOND group
  async validateQuality(qualityId: string): Promise<void> {
    const result = await db.query(
      `SELECT id FROM stone_qualities WHERE id = $1 AND stone_group_id = $2 AND status = true`,
      [qualityId, STONE_GROUPS.DIAMOND]
    )
    if (result.rows.length === 0) {
      throw new AppError(diamondPricingMessages.INVALID_QUALITY, HTTP_STATUS.BAD_REQUEST)
    }
  },

  // Check for duplicate entry
  async checkDuplicate(
    shapeId: string,
    qualityId: string,
    ctFrom: number,
    ctTo: number,
    excludeId?: string
  ): Promise<void> {
    let query = `
      SELECT id FROM stone_prices
      WHERE stone_group_id = $1 AND stone_type_id = $2
        AND stone_shape_id = $3 AND stone_quality_id = $4
        AND ct_from = $5 AND ct_to = $6
        AND stone_color_id IS NULL
    `
    const params: any[] = [
      STONE_GROUPS.DIAMOND,
      STONE_TYPES.LAB_GROWN_DIAMOND,
      shapeId,
      qualityId,
      ctFrom,
      ctTo,
    ]

    if (excludeId) {
      query += ` AND id != $7`
      params.push(excludeId)
    }

    const result = await db.query(query, params)
    if (result.rows.length > 0) {
      throw new AppError(diamondPricingMessages.DUPLICATE_ENTRY, HTTP_STATUS.CONFLICT)
    }
  },

  // Create diamond price
  async create(data: CreateDiamondPriceRequest): Promise<DiamondPrice> {
    // Validate shape and quality
    await this.validateShape(data.stone_shape_id)
    await this.validateQuality(data.stone_quality_id)

    // Check for duplicate
    await this.checkDuplicate(data.stone_shape_id, data.stone_quality_id, data.ct_from, data.ct_to)

    const result = await db.query(
      `INSERT INTO stone_prices (
        stone_group_id, stone_type_id, stone_shape_id, stone_quality_id,
        stone_color_id, ct_from, ct_to, price, status, metadata
      )
      VALUES ($1, $2, $3, $4, NULL, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        STONE_GROUPS.DIAMOND,
        STONE_TYPES.LAB_GROWN_DIAMOND,
        data.stone_shape_id,
        data.stone_quality_id,
        data.ct_from,
        data.ct_to,
        data.price,
        data.status ?? true,
        data.metadata ? JSON.stringify(data.metadata) : '{}',
      ]
    )

    return this.getById(result.rows[0].id)
  },

  // Update diamond price
  async update(id: string, data: UpdateDiamondPriceRequest): Promise<DiamondPrice> {
    // Get existing record
    const existing = await this.getById(id)

    // Validate shape if provided
    if (data.stone_shape_id) {
      await this.validateShape(data.stone_shape_id)
    }

    // Validate quality if provided
    if (data.stone_quality_id) {
      await this.validateQuality(data.stone_quality_id)
    }

    // Check for duplicate if shape, quality, or carat range changed
    const shapeId = data.stone_shape_id || existing.stone_shape_id
    const qualityId = data.stone_quality_id || existing.stone_quality_id
    const ctFrom = data.ct_from ?? existing.ct_from
    const ctTo = data.ct_to ?? existing.ct_to

    await this.checkDuplicate(shapeId, qualityId, ctFrom, ctTo, id)

    // Build dynamic update query
    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (data.stone_shape_id !== undefined) {
      updates.push(`stone_shape_id = $${paramIndex++}`)
      values.push(data.stone_shape_id)
    }
    if (data.stone_quality_id !== undefined) {
      updates.push(`stone_quality_id = $${paramIndex++}`)
      values.push(data.stone_quality_id)
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

  // Get diamond pricings for product dropdown (for price calculation)
  async getForProduct(): Promise<{
    id: string
    stone_shape_id: string
    stone_quality_id: string
    ct_from: number
    ct_to: number
    price: number
  }[]> {
    const result = await db.query(
      `SELECT id, stone_shape_id, stone_quality_id, ct_from, ct_to, price
       FROM stone_prices
       WHERE stone_group_id = $1 AND stone_type_id = $2 AND status = true
       ORDER BY stone_shape_id, stone_quality_id, ct_from`,
      [STONE_GROUPS.DIAMOND, STONE_TYPES.LAB_GROWN_DIAMOND]
    )
    // Convert NUMERIC fields to numbers
    return result.rows.map((row) => ({
      ...row,
      ct_from: parseFloat(row.ct_from),
      ct_to: parseFloat(row.ct_to),
    }))
  },
}
