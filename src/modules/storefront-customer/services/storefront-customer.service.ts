import { db } from '../../../lib/db'
import { AppError } from '../../../utils/app-error'
import { HTTP_STATUS } from '../../../config/constants'
import { storefrontCustomerMessages } from '../config/storefront-customer.messages'

const MAX_ADDRESSES = 10

export const storefrontCustomerService = {
  // ============================================
  // GET /addresses — list all customer addresses
  // ============================================
  async getAddresses(customerId: string) {
    const result = await db.query(
      `SELECT
        ca.id,
        ca.first_name,
        ca.last_name,
        ca.phone,
        ca.address_line_1,
        ca.address_line_2,
        ca.pincode,
        ca.city_id,
        c.name AS city_name,
        ca.state_id,
        s.name AS state_name,
        ca.address_type,
        ca.created_at,
        ca.updated_at
      FROM customer_addresses ca
      JOIN cities c ON c.id = ca.city_id
      JOIN states s ON s.id = ca.state_id
      WHERE ca.customer_id = $1
      ORDER BY ca.created_at DESC`,
      [customerId]
    )

    return result.rows
  },

  // ============================================
  // POST /addresses — add new address
  // ============================================
  async createAddress(
    customerId: string,
    data: {
      first_name: string
      last_name: string
      phone: string
      address_line_1: string
      address_line_2?: string
      pincode: string
      city_id: number
      state_id: number
      address_type: string
    }
  ) {
    // Check address limit
    const countResult = await db.query(
      `SELECT COUNT(*)::int AS count FROM customer_addresses WHERE customer_id = $1`,
      [customerId]
    )
    if (countResult.rows[0].count >= MAX_ADDRESSES) {
      throw new AppError(
        `${storefrontCustomerMessages.ADDRESS_LIMIT_REACHED} (max ${MAX_ADDRESSES})`,
        HTTP_STATUS.BAD_REQUEST
      )
    }

    // Validate city belongs to state
    const cityCheck = await db.query(
      `SELECT id FROM cities WHERE id = $1 AND state_id = $2`,
      [data.city_id, data.state_id]
    )
    if (cityCheck.rows.length === 0) {
      throw new AppError(
        'Selected city does not belong to the selected state',
        HTTP_STATUS.BAD_REQUEST
      )
    }

    const result = await db.query(
      `INSERT INTO customer_addresses
        (customer_id, first_name, last_name, phone, address_line_1, address_line_2, pincode, city_id, state_id, address_type)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id`,
      [
        customerId,
        data.first_name,
        data.last_name,
        data.phone,
        data.address_line_1,
        data.address_line_2 || null,
        data.pincode,
        data.city_id,
        data.state_id,
        data.address_type,
      ]
    )

    return { id: result.rows[0].id }
  },

  // ============================================
  // PATCH /addresses/:id — update address
  // ============================================
  async updateAddress(
    customerId: string,
    addressId: string,
    data: {
      first_name?: string
      last_name?: string
      phone?: string
      address_line_1?: string
      address_line_2?: string | null
      pincode?: string
      city_id?: number
      state_id?: number
      address_type?: string
    }
  ) {
    // Verify address belongs to customer
    const existing = await db.query(
      `SELECT id, city_id, state_id FROM customer_addresses WHERE id = $1 AND customer_id = $2`,
      [addressId, customerId]
    )
    if (existing.rows.length === 0) {
      throw new AppError(storefrontCustomerMessages.ADDRESS_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    // If city or state is being updated, validate the relationship
    const newCityId = data.city_id ?? existing.rows[0].city_id
    const newStateId = data.state_id ?? existing.rows[0].state_id
    if (data.city_id || data.state_id) {
      const cityCheck = await db.query(
        `SELECT id FROM cities WHERE id = $1 AND state_id = $2`,
        [newCityId, newStateId]
      )
      if (cityCheck.rows.length === 0) {
        throw new AppError(
          'Selected city does not belong to the selected state',
          HTTP_STATUS.BAD_REQUEST
        )
      }
    }

    // Build dynamic update query
    const fields: string[] = []
    const values: unknown[] = []
    let paramIndex = 1

    const addField = (name: string, value: unknown) => {
      if (value !== undefined) {
        fields.push(`${name} = $${paramIndex++}`)
        values.push(value)
      }
    }

    addField('first_name', data.first_name)
    addField('last_name', data.last_name)
    addField('phone', data.phone)
    addField('address_line_1', data.address_line_1)
    addField('address_line_2', data.address_line_2)
    addField('pincode', data.pincode)
    addField('city_id', data.city_id)
    addField('state_id', data.state_id)
    addField('address_type', data.address_type)

    if (fields.length === 0) {
      throw new AppError('No fields to update', HTTP_STATUS.BAD_REQUEST)
    }

    values.push(addressId, customerId)
    await db.query(
      `UPDATE customer_addresses SET ${fields.join(', ')} WHERE id = $${paramIndex++} AND customer_id = $${paramIndex}`,
      values
    )

    return { id: addressId }
  },

  // ============================================
  // DELETE /addresses/:id — delete address
  // ============================================
  async deleteAddress(customerId: string, addressId: string) {
    const result = await db.query(
      `DELETE FROM customer_addresses WHERE id = $1 AND customer_id = $2 RETURNING id`,
      [addressId, customerId]
    )
    if (result.rows.length === 0) {
      throw new AppError(storefrontCustomerMessages.ADDRESS_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    return { id: addressId }
  },

  // ============================================
  // GET /states — list all active states
  // ============================================
  async getStates() {
    const result = await db.query(
      `SELECT id, name, iso2, type FROM states WHERE is_active = true ORDER BY name ASC`
    )
    return result.rows
  },

  // ============================================
  // GET /states/:stateId/cities — list cities by state
  // ============================================
  async getCitiesByState(stateId: number) {
    // Verify state exists
    const stateCheck = await db.query(
      `SELECT id FROM states WHERE id = $1 AND is_active = true`,
      [stateId]
    )
    if (stateCheck.rows.length === 0) {
      throw new AppError(storefrontCustomerMessages.STATE_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    const result = await db.query(
      `SELECT id, name FROM cities WHERE state_id = $1 AND is_active = true ORDER BY name ASC`,
      [stateId]
    )
    return result.rows
  },
}
