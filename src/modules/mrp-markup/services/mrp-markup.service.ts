import { db } from '../../../lib/db'
import { mrpMarkupMessages } from '../config/mrp-markup.messages'
import { AppError } from '../../../utils/app-error'
import { HTTP_STATUS } from '../../../config/constants'
import type { MrpMarkup, UpdateMrpMarkupRequest } from '../types/mrp-markup.types'

export const mrpMarkupService = {
  // Get the single MRP markup row
  async get(): Promise<MrpMarkup> {
    const result = await db.query(
      `SELECT id, diamond, gemstone, pearl, making_charge
       FROM mrp_markup
       LIMIT 1`
    )

    if (result.rows.length === 0) {
      throw new AppError(mrpMarkupMessages.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    // Convert decimal strings to numbers
    const row = result.rows[0]
    return {
      id: row.id,
      diamond: parseFloat(row.diamond),
      gemstone: parseFloat(row.gemstone),
      pearl: parseFloat(row.pearl),
      making_charge: parseFloat(row.making_charge),
    }
  },

  // Update the single MRP markup row
  async update(data: UpdateMrpMarkupRequest): Promise<MrpMarkup> {
    // Get existing row first
    const existing = await this.get()

    // Build dynamic update query
    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (data.diamond !== undefined) {
      updates.push(`diamond = $${paramIndex++}`)
      values.push(data.diamond)
    }
    if (data.gemstone !== undefined) {
      updates.push(`gemstone = $${paramIndex++}`)
      values.push(data.gemstone)
    }
    if (data.pearl !== undefined) {
      updates.push(`pearl = $${paramIndex++}`)
      values.push(data.pearl)
    }
    if (data.making_charge !== undefined) {
      updates.push(`making_charge = $${paramIndex++}`)
      values.push(data.making_charge)
    }

    // If no updates, return existing
    if (updates.length === 0) {
      return existing
    }

    // Add id to values
    values.push(existing.id)

    await db.query(
      `UPDATE mrp_markup
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}`,
      values
    )

    return this.get()
  },
}
