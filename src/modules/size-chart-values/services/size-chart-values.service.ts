import { db } from '../../../lib/db'
import { sizeChartValueMessages } from '../config/size-chart-values.messages'
import { AppError } from '../../../utils/app-error'
import { HTTP_STATUS } from '../../../config/constants'
import type {
  SizeChartValue,
  SizeChartValueWithGroup,
  CreateSizeChartValueRequest,
  UpdateSizeChartValueRequest,
  SizeChartValueListResponse,
  SizeChartValueListQuery,
} from '../types/size-chart-values.types'

export const sizeChartValueService = {
  // List all size chart values with optional group filter
  async list(query?: SizeChartValueListQuery): Promise<SizeChartValueListResponse> {
    let sql = `
      SELECT
        v.id, v.size_chart_group_id, v.name, v.description, v.difference,
        v.is_default, v.created_at, v.updated_at,
        g.name as size_chart_group_name
      FROM size_chart_values v
      JOIN size_chart_groups g ON v.size_chart_group_id = g.id
    `
    const params: string[] = []

    if (query?.size_chart_group_id) {
      sql += ` WHERE v.size_chart_group_id = $1`
      params.push(query.size_chart_group_id)
    }

    sql += ` ORDER BY g.name ASC, v.name ASC`

    const result = await db.query(sql, params)

    return { items: result.rows }
  },

  // Get single size chart value by ID
  async getById(id: string): Promise<SizeChartValue> {
    const result = await db.query(
      `SELECT id, size_chart_group_id, name, description, difference, is_default, created_at, updated_at
       FROM size_chart_values
       WHERE id = $1`,
      [id]
    )

    if (result.rows.length === 0) {
      throw new AppError(sizeChartValueMessages.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    return result.rows[0]
  },

  // Create size chart value (NO is_default - always false for new values)
  async create(data: CreateSizeChartValueRequest): Promise<SizeChartValue> {
    // Check if group exists
    const groupResult = await db.query(
      `SELECT id FROM size_chart_groups WHERE id = $1`,
      [data.size_chart_group_id]
    )

    if (groupResult.rows.length === 0) {
      throw new AppError(sizeChartValueMessages.GROUP_NOT_FOUND, HTTP_STATUS.BAD_REQUEST)
    }

    // Create size chart value (is_default = FALSE)
    const result = await db.query(
      `INSERT INTO size_chart_values (size_chart_group_id, name, description, difference, is_default)
       VALUES ($1, $2, $3, $4, FALSE)
       RETURNING id`,
      [data.size_chart_group_id, data.name, data.description || null, data.difference]
    )

    return this.getById(result.rows[0].id)
  },

  // Update size chart value (NO is_default)
  async update(id: string, data: UpdateSizeChartValueRequest): Promise<SizeChartValue> {
    // Check if value exists
    const existing = await this.getById(id)

    // Build dynamic update query
    const updates: string[] = []
    const params: (string | number | null)[] = []
    let paramIndex = 1

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`)
      params.push(data.name)
    }

    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`)
      params.push(data.description)
    }

    if (data.difference !== undefined) {
      updates.push(`difference = $${paramIndex++}`)
      params.push(data.difference)
    }

    if (updates.length === 0) {
      return existing
    }

    params.push(id)

    await db.query(
      `UPDATE size_chart_values SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      params
    )

    return this.getById(id)
  },

  // Make value the default (unset previous default in same group)
  async makeDefault(id: string): Promise<SizeChartValue> {
    // Get the value to update
    const value = await this.getById(id)

    if (value.is_default) {
      // Already default, just return
      return value
    }

    // Unset previous default in the same group
    await db.query(
      `UPDATE size_chart_values SET is_default = FALSE
       WHERE size_chart_group_id = $1 AND is_default = TRUE`,
      [value.size_chart_group_id]
    )

    // Set this value as default
    await db.query(
      `UPDATE size_chart_values SET is_default = TRUE WHERE id = $1`,
      [id]
    )

    return this.getById(id)
  },

  // Delete size chart value (prevent if is_default)
  async delete(id: string): Promise<void> {
    const value = await this.getById(id)

    if (value.is_default) {
      throw new AppError(sizeChartValueMessages.CANNOT_DELETE_DEFAULT, HTTP_STATUS.BAD_REQUEST)
    }

    await db.query(`DELETE FROM size_chart_values WHERE id = $1`, [id])
  },
}
