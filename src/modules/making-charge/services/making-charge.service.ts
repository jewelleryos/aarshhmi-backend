import { db } from '../../../lib/db'
import { makingChargeMessages } from '../config/making-charge.messages'
import { AppError } from '../../../utils/app-error'
import { HTTP_STATUS } from '../../../config/constants'
import type {
  MakingChargeWithMetalType,
  CreateMakingChargeRequest,
  UpdateMakingChargeRequest,
  MakingChargeListResponse,
} from '../types/making-charge.types'

export const makingChargeService = {
  // List all making charges with metal type name
  async list(): Promise<MakingChargeListResponse> {
    const result = await db.query(
      `SELECT
        mc.id, mc.metal_type_id, mc."from", mc."to", mc.is_fixed_pricing,
        mc.amount, mc.metadata, mc.status, mc.created_at, mc.updated_at,
        mt.name as metal_type_name
       FROM making_charges mc
       JOIN metal_types mt ON mc.metal_type_id = mt.id
       WHERE mc.status = true
       ORDER BY mt.name, mc."from"`
    )

    return { items: result.rows }
  },

  // Get single making charge by ID
  async getById(id: string): Promise<MakingChargeWithMetalType> {
    const result = await db.query(
      `SELECT
        mc.id, mc.metal_type_id, mc."from", mc."to", mc.is_fixed_pricing,
        mc.amount, mc.metadata, mc.status, mc.created_at, mc.updated_at,
        mt.name as metal_type_name
       FROM making_charges mc
       JOIN metal_types mt ON mc.metal_type_id = mt.id
       WHERE mc.id = $1`,
      [id]
    )

    if (result.rows.length === 0) {
      throw new AppError(makingChargeMessages.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    return result.rows[0]
  },

  // Check if range overlaps with existing entries for the same metal type
  async checkRangeOverlap(
    metalTypeId: string,
    from: number,
    to: number,
    excludeId?: string
  ): Promise<boolean> {
    // Two ranges [A1, A2] and [B1, B2] overlap if A1 < B2 AND A2 > B1
    let query = `
      SELECT id FROM making_charges
      WHERE metal_type_id = $1
      AND status = true
      AND "from" < $3
      AND "to" > $2
    `
    const params: (string | number)[] = [metalTypeId, from, to]

    if (excludeId) {
      query += ` AND id != $4`
      params.push(excludeId)
    }

    const result = await db.query(query, params)
    return result.rows.length > 0
  },

  // Create making charge
  async create(data: CreateMakingChargeRequest): Promise<MakingChargeWithMetalType> {
    // Validate metal_type_id exists
    const metalType = await db.query(
      `SELECT id FROM metal_types WHERE id = $1 AND status = true`,
      [data.metal_type_id]
    )

    if (metalType.rows.length === 0) {
      throw new AppError(makingChargeMessages.METAL_TYPE_NOT_FOUND, HTTP_STATUS.BAD_REQUEST)
    }

    // Validate percentage limit
    if (!data.is_fixed_pricing && data.amount > 100) {
      throw new AppError(makingChargeMessages.PERCENTAGE_EXCEEDS_LIMIT, HTTP_STATUS.BAD_REQUEST)
    }

    // Check for range overlap
    const hasOverlap = await this.checkRangeOverlap(data.metal_type_id, data.from, data.to)
    if (hasOverlap) {
      throw new AppError(makingChargeMessages.RANGE_OVERLAP, HTTP_STATUS.CONFLICT)
    }

    const result = await db.query(
      `INSERT INTO making_charges (metal_type_id, "from", "to", is_fixed_pricing, amount, metadata, status)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       RETURNING id`,
      [
        data.metal_type_id,
        data.from,
        data.to,
        data.is_fixed_pricing ?? true,
        data.amount,
        JSON.stringify(data.metadata || {}),
      ]
    )

    // Fetch with metal type name
    return this.getById(result.rows[0].id)
  },

  // Update making charge
  async update(id: string, data: UpdateMakingChargeRequest): Promise<MakingChargeWithMetalType> {
    // Check if making charge exists
    const existing = await db.query(
      `SELECT id, metal_type_id, "from", "to", is_fixed_pricing, amount FROM making_charges WHERE id = $1`,
      [id]
    )

    if (existing.rows.length === 0) {
      throw new AppError(makingChargeMessages.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    const currentRecord = existing.rows[0]

    // Determine the final values for validation
    const finalMetalTypeId = data.metal_type_id ?? currentRecord.metal_type_id
    const finalFrom = data.from ?? parseFloat(currentRecord.from)
    const finalTo = data.to ?? parseFloat(currentRecord.to)
    const finalIsFixedPricing = data.is_fixed_pricing ?? currentRecord.is_fixed_pricing
    const finalAmount = data.amount ?? parseFloat(currentRecord.amount)

    // Validate metal_type_id if being updated
    if (data.metal_type_id) {
      const metalType = await db.query(
        `SELECT id FROM metal_types WHERE id = $1 AND status = true`,
        [data.metal_type_id]
      )

      if (metalType.rows.length === 0) {
        throw new AppError(makingChargeMessages.METAL_TYPE_NOT_FOUND, HTTP_STATUS.BAD_REQUEST)
      }
    }

    // Validate weight range
    if (finalFrom >= finalTo) {
      throw new AppError(makingChargeMessages.INVALID_WEIGHT_RANGE, HTTP_STATUS.BAD_REQUEST)
    }

    // Validate percentage limit
    if (!finalIsFixedPricing && finalAmount > 100) {
      throw new AppError(makingChargeMessages.PERCENTAGE_EXCEEDS_LIMIT, HTTP_STATUS.BAD_REQUEST)
    }

    // Check for range overlap (if metal_type_id, from, or to is being updated)
    if (data.metal_type_id !== undefined || data.from !== undefined || data.to !== undefined) {
      const hasOverlap = await this.checkRangeOverlap(finalMetalTypeId, finalFrom, finalTo, id)
      if (hasOverlap) {
        throw new AppError(makingChargeMessages.RANGE_OVERLAP, HTTP_STATUS.CONFLICT)
      }
    }

    // Build dynamic update query
    const updates: string[] = []
    const values: (string | number | boolean)[] = []
    let paramIndex = 1

    if (data.metal_type_id !== undefined) {
      updates.push(`metal_type_id = $${paramIndex++}`)
      values.push(data.metal_type_id)
    }
    if (data.from !== undefined) {
      updates.push(`"from" = $${paramIndex++}`)
      values.push(data.from)
    }
    if (data.to !== undefined) {
      updates.push(`"to" = $${paramIndex++}`)
      values.push(data.to)
    }
    if (data.is_fixed_pricing !== undefined) {
      updates.push(`is_fixed_pricing = $${paramIndex++}`)
      values.push(data.is_fixed_pricing)
    }
    if (data.amount !== undefined) {
      updates.push(`amount = $${paramIndex++}`)
      values.push(data.amount)
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
      `UPDATE making_charges
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}`,
      values
    )

    // Fetch with metal type name
    return this.getById(id)
  },
}
