import { db } from '../../../lib/db'
import { pricingRuleMessages } from '../config/pricing-rule.messages'
import { AppError } from '../../../utils/app-error'
import { HTTP_STATUS } from '../../../config/constants'
import type {
  PricingRule,
  CreatePricingRuleRequest,
  UpdatePricingRuleRequest,
} from '../types/pricing-rule.types'

export const pricingRuleService = {
  // List all pricing rules (no pagination - frontend handles via TanStack Table)
  async list(): Promise<PricingRule[]> {
    const result = await db.query(
      `SELECT id, name, product_type, conditions, actions, is_active, created_at, updated_at
       FROM pricing_rules
       ORDER BY created_at DESC`
    )

    return result.rows
  },

  // Get single pricing rule by ID
  async getById(id: string): Promise<PricingRule> {
    const result = await db.query(
      `SELECT id, name, product_type, conditions, actions, is_active, created_at, updated_at
       FROM pricing_rules
       WHERE id = $1`,
      [id]
    )

    if (result.rows.length === 0) {
      throw new AppError(pricingRuleMessages.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    return result.rows[0]
  },

  // Create pricing rule
  async create(data: CreatePricingRuleRequest): Promise<PricingRule> {
    // Check if name already exists (case-insensitive)
    const existingName = await db.query(
      `SELECT id FROM pricing_rules WHERE LOWER(name) = LOWER($1)`,
      [data.name]
    )

    if (existingName.rows.length > 0) {
      throw new AppError(pricingRuleMessages.NAME_EXISTS, HTTP_STATUS.CONFLICT)
    }

    const result = await db.query(
      `INSERT INTO pricing_rules (name, product_type, conditions, actions, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [
        data.name,
        data.product_type || 'JEWELLERY_DEFAULT',
        JSON.stringify(data.conditions),
        JSON.stringify(data.actions),
        data.is_active ?? true,
      ]
    )

    return this.getById(result.rows[0].id)
  },

  // Update pricing rule
  async update(id: string, data: UpdatePricingRuleRequest): Promise<PricingRule> {
    // Check if pricing rule exists
    const existing = await db.query(`SELECT id FROM pricing_rules WHERE id = $1`, [id])

    if (existing.rows.length === 0) {
      throw new AppError(pricingRuleMessages.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    // If name is being updated, check for duplicates
    if (data.name) {
      const existingName = await db.query(
        `SELECT id FROM pricing_rules WHERE LOWER(name) = LOWER($1) AND id != $2`,
        [data.name, id]
      )

      if (existingName.rows.length > 0) {
        throw new AppError(pricingRuleMessages.NAME_EXISTS, HTTP_STATUS.CONFLICT)
      }
    }

    // Build dynamic update query
    const updates: string[] = []
    const values: unknown[] = []
    let paramIndex = 1

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`)
      values.push(data.name)
    }
    if (data.product_type !== undefined) {
      updates.push(`product_type = $${paramIndex++}`)
      values.push(data.product_type)
    }
    if (data.conditions !== undefined) {
      updates.push(`conditions = $${paramIndex++}`)
      values.push(JSON.stringify(data.conditions))
    }
    if (data.actions !== undefined) {
      updates.push(`actions = $${paramIndex++}`)
      values.push(JSON.stringify(data.actions))
    }
    if (data.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`)
      values.push(data.is_active)
    }

    if (updates.length === 0) {
      return this.getById(id)
    }

    values.push(id)

    await db.query(
      `UPDATE pricing_rules SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      values
    )

    return this.getById(id)
  },

  // Delete pricing rule
  async delete(id: string): Promise<void> {
    const result = await db.query(
      `DELETE FROM pricing_rules WHERE id = $1 RETURNING id`,
      [id]
    )

    if (result.rows.length === 0) {
      throw new AppError(pricingRuleMessages.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }
  },
}
