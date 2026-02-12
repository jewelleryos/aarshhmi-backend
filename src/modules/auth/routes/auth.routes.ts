import { Hono } from 'hono'
import { setCookie, deleteCookie } from 'hono/cookie'
import { authService } from '../services/auth.service'
import { loginSchema, forgotPasswordSchema, resetPasswordSchema } from '../config/auth.schema'
import { authMessages } from '../config/auth.messages'
import { authConfig } from '../config/auth.config'
import { successResponse } from '../../../utils/response'
import { errorHandler } from '../../../utils/error-handler'
import { authWithPermission } from '../../../middleware/auth.middleware'
import type { LoginResponse, ValidateResetTokenResponse } from '../types/auth.types'
import type { AppEnv } from '../../../types/hono.types'

export const authRoutes = new Hono<AppEnv>()

authRoutes.post('/login', async (c) => {
  try {
    const body = await c.req.json()
    const data = loginSchema.parse(body)
    const { response, token } = await authService.login(data)

    // Set token as HTTP-only cookie
    setCookie(c, 'auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      maxAge: authConfig.jwt.auth.cookieMaxAge,
      path: '/',
    })

    return successResponse<LoginResponse>(c, authMessages.LOGIN_SUCCESS, response)
  } catch (error) {
    return errorHandler(error, c)
  }
})

authRoutes.get('/me', authWithPermission(), async (c) => {
  try {
    const user = c.get('user')

    return successResponse<LoginResponse>(c, authMessages.USER_FETCHED, {
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
      },
      permissions: user.permissions,
    })
  } catch (error) {
    return errorHandler(error, c)
  }
})

authRoutes.post('/logout', authWithPermission(), async (c) => {
  try {
    const user = c.get('user')

    // Delete session from database
    await authService.logout(user.session_id)

    // Clear cookie
    deleteCookie(c, 'auth_token', {
      path: '/',
    })

    return successResponse(c, authMessages.LOGOUT_SUCCESS, null)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// Forgot Password
authRoutes.post('/forgot-password', async (c) => {
  try {
    const body = await c.req.json()
    const data = forgotPasswordSchema.parse(body)

    await authService.forgotPassword(data)

    return successResponse(c, authMessages.FORGOT_PASSWORD_SUCCESS, null)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// Validate Reset Token
authRoutes.get('/validate-reset-token', async (c) => {
  try {
    const token = c.req.query('token')

    if (!token) {
      return successResponse<ValidateResetTokenResponse>(c, authMessages.RESET_TOKEN_INVALID, {
        valid: false,
      })
    }

    const isValid = await authService.validateResetToken(token)

    if (!isValid) {
      return successResponse<ValidateResetTokenResponse>(c, authMessages.RESET_TOKEN_INVALID, {
        valid: false,
      })
    }

    return successResponse<ValidateResetTokenResponse>(c, authMessages.RESET_TOKEN_VALID, {
      valid: true,
    })
  } catch (error) {
    return errorHandler(error, c)
  }
})

// Reset Password
authRoutes.post('/reset-password', async (c) => {
  try {
    const body = await c.req.json()
    const data = resetPasswordSchema.parse(body)

    await authService.resetPassword(data)

    return successResponse(c, authMessages.RESET_PASSWORD_SUCCESS, null)
  } catch (error) {
    return errorHandler(error, c)
  }
})
