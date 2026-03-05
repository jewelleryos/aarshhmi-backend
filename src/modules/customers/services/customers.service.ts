import { db } from '../../../lib/db'
import type {
  CustomerListResponse,
  CustomerForCoupon,
} from '../types/customers.types'

export const customerService = {
  async list(): Promise<CustomerListResponse> {
    const result = await db.query(
      `SELECT id, email, phone, first_name, last_name, is_active,
              last_login_at, last_login_method, created_at
       FROM customers
       ORDER BY created_at DESC`
    )

    return { items: result.rows }
  },

  async getForCoupon(): Promise<{ items: CustomerForCoupon[] }> {
    const result = await db.query(
      `SELECT id, email, first_name, last_name
       FROM customers
       WHERE is_active = true
       ORDER BY first_name ASC, last_name ASC, email ASC`
    )

    return { items: result.rows }
  },
}
