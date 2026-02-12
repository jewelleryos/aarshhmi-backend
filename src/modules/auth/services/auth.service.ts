import { db } from '../../../lib/db'
import { generateToken, verifyToken } from '../../../utils/jwt'
import { authConfig } from '../config/auth.config'
import { authMessages } from '../config/auth.messages'
import { AppError } from '../../../utils/app-error'
import { HTTP_STATUS } from '../../../config/constants'
import { sendEmail, forgotPasswordTemplate } from '../../../shared/email-service'
import type {
  LoginRequest,
  LoginServiceResult,
  JwtPayload,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  PasswordResetJwtPayload,
} from '../types/auth.types'

export const authService = {
  async login(data: LoginRequest): Promise<LoginServiceResult> {
    // Find user by email with permissions
    const result = await db.query(
      `SELECT id, email, first_name, last_name, password, permissions, is_active, account_locked_until
       FROM users
       WHERE email = $1`,
      [data.email]
    )

    const user = result.rows[0]

    // Check if user exists
    if (!user) {
      throw new AppError(authMessages.INVALID_CREDENTIALS, HTTP_STATUS.UNAUTHORIZED)
    }

    // Check if account is active
    if (!user.is_active) {
      throw new AppError(authMessages.ACCOUNT_INACTIVE, HTTP_STATUS.FORBIDDEN)
    }

    // Check if account is locked
    if (user.account_locked_until && new Date(user.account_locked_until) > new Date()) {
      throw new AppError(authMessages.ACCOUNT_LOCKED, HTTP_STATUS.FORBIDDEN)
    }

    // Verify password using Bun's native password API
    const isValidPassword = await Bun.password.verify(data.password, user.password)

    if (!isValidPassword) {
      throw new AppError(authMessages.INVALID_CREDENTIALS, HTTP_STATUS.UNAUTHORIZED)
    }

    // Update last login timestamp
    await db.query(
      `UPDATE users SET last_login_at = NOW() WHERE id = $1`,
      [user.id]
    )

    // Create session
    const sessionResult = await db.query(
      `INSERT INTO user_sessions (user_id, token)
       VALUES ($1, $2)
       RETURNING id`,
      [user.id, '']
    )

    const sessionId = sessionResult.rows[0].id

    // Generate JWT token with session_id
    const payload: JwtPayload = {
      session_id: sessionId,
      user_id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
    }

    const token = generateToken(
      payload,
      authConfig.jwt.auth.secret,
      authConfig.jwt.auth.expiresIn
    )

    // Update session with token
    await db.query(
      `UPDATE user_sessions SET token = $1 WHERE id = $2`,
      [token, sessionId]
    )

    return {
      response: {
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
        },
        permissions: user.permissions || [],
      },
      token,
    }
  },

  async logout(sessionId: string): Promise<void> {
    await db.query(
      `DELETE FROM user_sessions WHERE id = $1`,
      [sessionId]
    )
  },

  async forgotPassword(data: ForgotPasswordRequest): Promise<void> {
    // Find user by email
    const result = await db.query(
      `SELECT id, email, first_name, is_active FROM users WHERE email = $1`,
      [data.email]
    )

    const user = result.rows[0]

    // If user not found or inactive, return silently (don't reveal email existence)
    if (!user || !user.is_active) {
      return
    }

    // Generate password reset JWT token
    const payload: PasswordResetJwtPayload = {
      user_id: user.id,
      email: user.email,
      type: 'password_reset',
    }

    const token = generateToken(
      payload,
      authConfig.jwt.passwordReset.secret,
      authConfig.jwt.passwordReset.expiresIn
    )

    // Calculate expiry time (1.5 hours from now)
    const expiresAt = new Date(Date.now() + authConfig.jwt.passwordReset.dbExpiryMs)

    // Store token in database (invalidates any previous token)
    await db.query(
      `UPDATE users
       SET password_reset_token = $1, password_reset_expires_at = $2
       WHERE id = $3`,
      [token, expiresAt, user.id]
    )

    // Generate reset link
    const resetLink = `${authConfig.frontendUrl}/reset-password?token=${token}`

    // Send email
    const html = forgotPasswordTemplate({
      firstName: user.first_name,
      resetLink,
      expiryTime: '1 hour',
    })

    await sendEmail({
      to: user.email,
      subject: authMessages.FORGOT_PASSWORD_EMAIL_SUBJECT,
      html,
    })
  },

  async validateResetToken(token: string): Promise<boolean> {
    try {
      // Verify JWT signature
      const decoded = verifyToken<PasswordResetJwtPayload>(
        token,
        authConfig.jwt.passwordReset.secret
      )

      // Check if token type is correct
      if (decoded.type !== 'password_reset') {
        return false
      }

      // Find user and check if token matches
      const result = await db.query(
        `SELECT id, password_reset_token, password_reset_expires_at
         FROM users
         WHERE id = $1`,
        [decoded.user_id]
      )

      const user = result.rows[0]

      if (!user) {
        return false
      }

      // Check if token matches the one in database
      if (user.password_reset_token !== token) {
        return false
      }

      // Check if token has expired in database
      if (new Date(user.password_reset_expires_at) < new Date()) {
        return false
      }

      return true
    } catch {
      return false
    }
  },

  async resetPassword(data: ResetPasswordRequest): Promise<void> {
    // Validate token first
    const isValid = await this.validateResetToken(data.token)

    if (!isValid) {
      throw new AppError(authMessages.RESET_TOKEN_INVALID, HTTP_STATUS.BAD_REQUEST)
    }

    // Decode token to get user_id
    const decoded = verifyToken<PasswordResetJwtPayload>(
      data.token,
      authConfig.jwt.passwordReset.secret
    )

    // Hash new password
    const hashedPassword = await Bun.password.hash(data.password)

    // Update password and clear reset token
    await db.query(
      `UPDATE users
       SET password = $1, password_reset_token = NULL, password_reset_expires_at = NULL
       WHERE id = $2`,
      [hashedPassword, decoded.user_id]
    )

    // Clear all user sessions (logout from all devices)
    await db.query(
      `DELETE FROM user_sessions WHERE user_id = $1`,
      [decoded.user_id]
    )
  },
}
