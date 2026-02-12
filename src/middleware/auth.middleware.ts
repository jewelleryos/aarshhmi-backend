import { Context, Next } from 'hono'
import { getCookie } from 'hono/cookie'
import { verifyToken } from '../utils/jwt'
import { db } from '../lib/db'
import { authConfig } from '../modules/auth/config/auth.config'
import type { JwtPayload } from '../modules/auth/types/auth.types'

export interface AuthUser {
  id: string
  email: string
  first_name: string
  last_name: string
  permissions: number[]
  session_id: string
}

export const authWithPermission = (requiredPermission?: number) => {
  return async (c: Context, next: Next) => {
    // 1. Get token from cookie
    const token = getCookie(c, 'auth_token')


    if (!token) {
      console.log('No auth token provided')
      return c.json({ success: false, message: 'Unauthorized' }, 401)
    
    }

    try {
      // 2. Verify JWT (checks signature + expiry)
      const decoded = verifyToken<JwtPayload>(token, authConfig.jwt.auth.secret)

      // 3. Check session exists in database
      const sessionResult = await db.query(
        `SELECT id, token FROM user_sessions WHERE id = $1`,
        [decoded.session_id]
      )

      if (sessionResult.rows.length === 0) {
        return c.json({ success: false, message: 'Session expired' }, 401)
      }

      // 4. Verify token matches (prevents token reuse after logout)
      if (sessionResult.rows[0].token !== token) {
        return c.json({ success: false, message: 'Invalid session' }, 401)
      }

      // 5. Fetch user with permissions
      const userResult = await db.query(
        `SELECT id, email, first_name, last_name, permissions, is_active
         FROM users WHERE id = $1`,
        [decoded.user_id]
      )

      if (userResult.rows.length === 0 || !userResult.rows[0].is_active) {
        return c.json({ success: false, message: 'User not found or inactive' }, 401)
      }

      const user = userResult.rows[0]
      const userPermissions = user.permissions || []

      // 6. Check permission if required
      if (requiredPermission && !userPermissions.includes(requiredPermission)) {
        return c.json({ success: false, message: 'Forbidden' }, 403)
      }

      // 7. Attach user to context
      c.set('user', {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        permissions: userPermissions,
        session_id: decoded.session_id,
      } as AuthUser)

      await next()
    } catch (error) {
      return c.json({ success: false, message: 'Invalid token' }, 401)
    }
  }
}
