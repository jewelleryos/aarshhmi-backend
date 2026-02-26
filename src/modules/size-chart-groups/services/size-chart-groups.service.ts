import { db } from '../../../lib/db'
import { sizeChartGroupMessages } from '../config/size-chart-groups.messages'
import { AppError } from '../../../utils/app-error'
import { HTTP_STATUS } from '../../../config/constants'
import type {
  SizeChartGroup,
  CreateSizeChartGroupRequest,
  UpdateSizeChartGroupRequest,
  SizeChartGroupListResponse,
} from '../types/size-chart-groups.types'
import type { DependencyCheckResult, DependencyGroup } from '../../../types/dependency-check.types'

export const sizeChartGroupService = {
  // List all size chart groups
  async list(): Promise<SizeChartGroupListResponse> {
    const result = await db.query(
      `SELECT id, name, created_at, updated_at
       FROM size_chart_groups
       ORDER BY name ASC`
    )

    return { items: result.rows }
  },

  // Get single size chart group by ID
  async getById(id: string): Promise<SizeChartGroup> {
    const result = await db.query(
      `SELECT id, name, created_at, updated_at
       FROM size_chart_groups
       WHERE id = $1`,
      [id]
    )

    if (result.rows.length === 0) {
      throw new AppError(sizeChartGroupMessages.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    return result.rows[0]
  },

  // Create size chart group with first value
  async create(data: CreateSizeChartGroupRequest): Promise<SizeChartGroup> {
    // Create size chart group
    const groupResult = await db.query(
      `INSERT INTO size_chart_groups (name) VALUES ($1) RETURNING id`,
      [data.name]
    )
    const groupId = groupResult.rows[0].id

    // Create first size chart value (auto-default)
    await db.query(
      `INSERT INTO size_chart_values (size_chart_group_id, name, description, difference, is_default)
       VALUES ($1, $2, $3, $4, TRUE)`,
      [groupId, data.value_name, data.value_description || null, data.value_difference]
    )

    return this.getById(groupId)
  },

  // Update size chart group (name only)
  async update(id: string, data: UpdateSizeChartGroupRequest): Promise<SizeChartGroup> {
    // Check if group exists
    const existing = await db.query(
      `SELECT id FROM size_chart_groups WHERE id = $1`,
      [id]
    )

    if (existing.rows.length === 0) {
      throw new AppError(sizeChartGroupMessages.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    // Update name
    await db.query(
      `UPDATE size_chart_groups SET name = $1 WHERE id = $2`,
      [data.name, id]
    )

    return this.getById(id)
  },

  // Check dependencies before deletion
  async checkDependencies(id: string): Promise<DependencyCheckResult> {
    await this.getById(id)

    const [products, sizeChartValues] = await Promise.all([
      // Products referencing this size chart group via JSONB metadata
      db.query(
        `SELECT DISTINCT p.id, p.name, p.base_sku AS sku
         FROM products p
         WHERE p.metadata -> 'sizeChart' ->> 'sizeChartGroupId' = $1
           AND p.status != 'archived'
         ORDER BY p.name`,
        [id]
      ).then(r => r.rows),

      // Size chart values with this group as parent
      db.query(
        `SELECT id, name
         FROM size_chart_values
         WHERE size_chart_group_id = $1
         ORDER BY name`,
        [id]
      ).then(r => r.rows),
    ])

    const dependencies: DependencyGroup[] = []

    if (products.length > 0) {
      dependencies.push({ type: 'product', count: products.length, items: products })
    }

    if (sizeChartValues.length > 0) {
      dependencies.push({ type: 'size_chart_value', count: sizeChartValues.length, items: sizeChartValues })
    }

    return {
      can_delete: dependencies.length === 0,
      dependencies,
    }
  },

  // Delete size chart group (with server-side dependency safety check)
  async delete(id: string): Promise<void> {
    const check = await this.checkDependencies(id)

    if (!check.can_delete) {
      const summary = check.dependencies.map(d => `${d.count} ${d.type}(s)`).join(', ')
      throw new AppError(`Cannot delete. Used by: ${summary}`, HTTP_STATUS.CONFLICT)
    }

    const result = await db.query(
      `DELETE FROM size_chart_groups WHERE id = $1 RETURNING id`,
      [id]
    )

    if (result.rows.length === 0) {
      throw new AppError(sizeChartGroupMessages.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }
  },
}
