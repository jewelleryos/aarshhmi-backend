import { db } from '../../../lib/db'

class SimilarProductsScoringService {
  async listConfig() {
    const result = await db.query(
      `SELECT id, condition_key, label, description, weight, is_active, rank
       FROM similar_products_scoring_config
       ORDER BY rank ASC`
    )
    return { items: result.rows }
  }

  async updateConfig(id: string, data: { weight?: number; is_active?: boolean }) {
    const fields: string[] = []
    const values: any[] = []
    let idx = 1

    if (data.weight !== undefined) {
      fields.push(`weight = $${idx++}`)
      values.push(data.weight)
    }
    if (data.is_active !== undefined) {
      fields.push(`is_active = $${idx++}`)
      values.push(data.is_active)
    }

    if (fields.length === 0) return null

    values.push(id)
    const result = await db.query(
      `UPDATE similar_products_scoring_config SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    )
    return result.rows[0] || null
  }
}

export const similarProductsScoringService = new SimilarProductsScoringService()
