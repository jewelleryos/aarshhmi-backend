import { db } from '../../../lib/db'
import { otherChargeMessages } from '../config/other-charge.messages'
import { AppError } from '../../../utils/app-error'
import { HTTP_STATUS } from '../../../config/constants'
import { toSmallestUnit } from '../../../utils/currency'
import type {
  OtherCharge,
  CreateOtherChargeRequest,
  UpdateOtherChargeRequest,
  OtherChargeListResponse,
} from '../types/other-charge.types'

export const otherChargeService = {
  // List all active other charges
  async list(): Promise<OtherChargeListResponse> {
    const result = await db.query(
      `SELECT id, name, description, amount, metadata, status, created_at, updated_at
       FROM other_charges
       WHERE status = true
       ORDER BY name ASC`
    )

    return { items: result.rows }
  },

  // Get single other charge by ID
  async getById(id: string): Promise<OtherCharge> {
    const result = await db.query(
      `SELECT id, name, description, amount, metadata, status, created_at, updated_at
       FROM other_charges
       WHERE id = $1`,
      [id]
    )

    if (result.rows.length === 0) {
      throw new AppError(otherChargeMessages.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    return result.rows[0]
  },

  // Create other charge
  async create(data: CreateOtherChargeRequest): Promise<OtherCharge> {
    // Check if name already exists (case-insensitive)
    const existingName = await db.query(
      `SELECT id FROM other_charges WHERE LOWER(name) = LOWER($1) AND status = true`,
      [data.name]
    )

    if (existingName.rows.length > 0) {
      throw new AppError(otherChargeMessages.NAME_EXISTS, HTTP_STATUS.CONFLICT)
    }

    // Convert amount to smallest unit (e.g., 10 rupees → 1000 paise)
    const amountInSmallestUnit = toSmallestUnit(data.amount)

    const result = await db.query(
      `INSERT INTO other_charges (name, description, amount, metadata, status)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id, name, description, amount, metadata, status, created_at, updated_at`,
      [
        data.name,
        data.description || null,
        amountInSmallestUnit,
        JSON.stringify(data.metadata || {}),
      ]
    )

    return result.rows[0]
  },

  // Update other charge
  async update(id: string, data: UpdateOtherChargeRequest): Promise<OtherCharge> {
    // Check if other charge exists
    const existing = await db.query(
      `SELECT id FROM other_charges WHERE id = $1`,
      [id]
    )

    if (existing.rows.length === 0) {
      throw new AppError(otherChargeMessages.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    // If name is being updated, check for duplicates
    if (data.name) {
      const existingName = await db.query(
        `SELECT id FROM other_charges WHERE LOWER(name) = LOWER($1) AND id != $2 AND status = true`,
        [data.name, id]
      )

      if (existingName.rows.length > 0) {
        throw new AppError(otherChargeMessages.NAME_EXISTS, HTTP_STATUS.CONFLICT)
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
    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`)
      values.push(data.description)
    }
    if (data.amount !== undefined) {
      // Convert amount to smallest unit
      const amountInSmallestUnit = toSmallestUnit(data.amount)
      updates.push(`amount = $${paramIndex++}`)
      values.push(amountInSmallestUnit)
    }
    if (data.metadata !== undefined) {
      updates.push(`metadata = $${paramIndex++}`)
      values.push(JSON.stringify(data.metadata))
    }

    if (updates.length === 0) {
      return this.getById(id)
    }

    values.push(id)

    const result = await db.query(
      `UPDATE other_charges
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, name, description, amount, metadata, status, created_at, updated_at`,
      values
    )

    return result.rows[0]
  },

  // Delete other charge (hard delete)
  async delete(id: string): Promise<void> {
    const result = await db.query(
      `DELETE FROM other_charges WHERE id = $1 RETURNING id`,
      [id]
    )

    if (result.rows.length === 0) {
      throw new AppError(otherChargeMessages.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }
  },
}
