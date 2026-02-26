import { Context, Next } from 'hono'
import { TokenExpiredError } from 'jsonwebtoken'
import { verifyToken } from '../../../utils/jwt'
import { db } from '../../../lib/db'
import { customerAuthConfig } from '../config/customer-auth.config'
import { customerAuthMessages } from '../config/customer-auth.messages'
import type { CustomerJwtPayload } from '../types/customer-auth.types'
import type { AuthCustomer } from './customer-auth.middleware'

/**
 * Optional customer auth middleware
 *
 * - No Authorization header → continue as guest (no error)
 * - Token present but malformed/expired/invalid → return 401
 * - Token present and valid → set customer on context
 *
 * Usage:
 * - route.post('/toggle', customerAuthOptional(), async (c) => { ... })
 */
export const customerAuthOptional = () => {
  return async (c: Context, next: Next) => {
    // 1. Check Authorization header — no header means guest, that's OK
    const authHeader = c.req.header('Authorization')

    if (!authHeader) {
      // Guest user — no token at all, proceed without customer
      await next()
      return
    }

    // 2. Header present — it MUST be valid from here on
    if (!authHeader.startsWith('Bearer ')) {
      return c.json(
        { success: false, message: customerAuthMessages.INVALID_TOKEN },
        401
      )
    }

    const token = authHeader.substring(7) // Remove "Bearer "

    if (!token) {
      return c.json(
        { success: false, message: customerAuthMessages.INVALID_TOKEN },
        401
      )
    }

    try {
      // 3. Verify JWT (checks signature + expiry)
      const decoded = verifyToken<CustomerJwtPayload>(
        token,
        customerAuthConfig.jwt.secret
      )

      // 4. Check session exists in database
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

      // 5. Verify token matches (prevents token reuse after logout)
      if (session.token !== token) {
        return c.json(
          { success: false, message: customerAuthMessages.INVALID_TOKEN },
          401
        )
      }

      // 6. Check customer is active
      if (!session.is_active) {
        return c.json(
          { success: false, message: customerAuthMessages.CUSTOMER_INACTIVE },
          401
        )
      }

      // 7. Attach customer to context
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
      // Token expired gets a specific message
      if (error instanceof TokenExpiredError) {
        return c.json(
          { success: false, message: customerAuthMessages.SESSION_INVALID },
          401
        )
      }

      // Malformed / invalid signature
      return c.json(
        { success: false, message: customerAuthMessages.INVALID_TOKEN },
        401
      )
    }
  }
}
