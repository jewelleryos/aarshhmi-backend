import { Context, Next } from 'hono'
import { verifyToken } from '../../../utils/jwt'
import { db } from '../../../lib/db'
import { customerAuthConfig } from '../config/customer-auth.config'
import { customerAuthMessages } from '../config/customer-auth.messages'
import type { CustomerJwtPayload } from '../types/customer-auth.types'

export interface AuthCustomer {
  id: string
  email: string | null
  phone: string | null
  first_name: string | null
  last_name: string | null
  session_id: string
}

/**
 * Middleware to validate customer JWT token from Authorization header
 *
 * Usage:
 * - route.get('/me', customerAuth(), async (c) => { ... })
 *
 * Token format: Authorization: Bearer <token>
 */
export const customerAuth = () => {
  return async (c: Context, next: Next) => {
    // 1. Get token from Authorization header
    const authHeader = c.req.header('Authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json(
        { success: false, message: customerAuthMessages.AUTHORIZATION_REQUIRED },
        401
      )
    }

    const token = authHeader.substring(7) // Remove "Bearer "

    try {
      // 2. Verify JWT (checks signature + expiry)
      const decoded = verifyToken<CustomerJwtPayload>(
        token,
        customerAuthConfig.jwt.secret
      )

      // 3. Check session exists in database
      const sessionResult = await db.query(
        `SELECT cs.id, cs.token, c.is_active, c.id as customer_id,
                c.email, c.phone, c.first_name, c.last_name
         FROM customer_sessions cs
         JOIN customers c ON c.id = cs.customer_id
         WHERE cs.id = $1`,
        [decoded.session_id]
      )

      if (sessionResult.rows.length === 0) {
        return c.json(
          { success: false, message: customerAuthMessages.SESSION_INVALID },
          401
        )
      }

      const session = sessionResult.rows[0]

      // 4. Verify token matches (prevents token reuse after logout)
      if (session.token !== token) {
        return c.json(
          { success: false, message: customerAuthMessages.INVALID_TOKEN },
          401
        )
      }

      // 5. Check customer is active
      if (!session.is_active) {
        return c.json(
          { success: false, message: customerAuthMessages.CUSTOMER_INACTIVE },
          401
        )
      }

      // 6. Attach customer to context
      c.set('customer', {
        id: session.customer_id,
        email: session.email,
        phone: session.phone,
        first_name: session.first_name,
        last_name: session.last_name,
        session_id: decoded.session_id,
      } as AuthCustomer)

      await next()
    } catch (error) {
      return c.json(
        { success: false, message: customerAuthMessages.INVALID_TOKEN },
        401
      )
    }
  }
}
