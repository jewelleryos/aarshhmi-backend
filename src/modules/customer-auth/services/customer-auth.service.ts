import { db } from '../../../lib/db'
import { customerAuthMessages } from '../config/customer-auth.messages'
import { AppError } from '../../../utils/app-error'
import { HTTP_STATUS } from '../../../config/constants'
import type { CustomerProfile } from '../types/customer-auth.types'

/**
 * Get customer profile by ID
 */
async function getCustomerById(customerId: string): Promise<CustomerProfile> {
  const result = await db.query(
    `SELECT id, email, phone, first_name, last_name, profile_picture, birth_date, anniversary_date, last_login_at, last_login_method
     FROM customers
     WHERE id = $1`,
    [customerId]
  )

  if (result.rows.length === 0) {
    throw new AppError(customerAuthMessages.CUSTOMER_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
  }

  const customer = result.rows[0]

  return {
    id: customer.id,
    email: customer.email,
    phone: customer.phone,
    first_name: customer.first_name,
    last_name: customer.last_name,
    profile_picture: customer.profile_picture,
    birth_date: customer.birth_date,
    anniversary_date: customer.anniversary_date,
    last_login_at: customer.last_login_at,
    last_login_method: customer.last_login_method,
  }
}

export const customerAuthService = {
  getCustomerById,
}
