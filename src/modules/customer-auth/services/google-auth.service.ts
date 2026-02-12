import { db } from '../../../lib/db'
import { generateToken } from '../../../utils/jwt'
import { customerAuthConfig } from '../config/customer-auth.config'
import { customerAuthMessages } from '../config/customer-auth.messages'
import { AppError } from '../../../utils/app-error'
import { HTTP_STATUS } from '../../../config/constants'
import type {
  GoogleUserInfo,
  GoogleTokenResponse,
  CustomerProfile,
  CustomerJwtPayload,
  AuthServiceResult,
  LoginMethod,
} from '../types/customer-auth.types'

/**
 * Generate Google OAuth authorization URL
 */
export function getGoogleAuthUrl(state?: string): string {
  const { clientId, redirectUri, authUrl, scopes } = customerAuthConfig.google

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    ...(state && { state }),
  })

  return `${authUrl}?${params.toString()}`
}

/**
 * Exchange authorization code for tokens
 */
async function exchangeCodeForTokens(code: string): Promise<GoogleTokenResponse> {
  const { clientId, clientSecret, redirectUri, tokenUrl } = customerAuthConfig.google

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Google token exchange error:', error)
    throw new AppError(customerAuthMessages.GOOGLE_AUTH_FAILED, HTTP_STATUS.BAD_REQUEST)
  }

  return response.json()
}

/**
 * Get user info from Google using access token
 */
async function getGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const { userInfoUrl } = customerAuthConfig.google

  const response = await fetch(userInfoUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new AppError(customerAuthMessages.GOOGLE_AUTH_FAILED, HTTP_STATUS.BAD_REQUEST)
  }

  return response.json()
}

/**
 * Verify Google ID token (for mobile apps)
 */
async function verifyGoogleIdToken(idToken: string): Promise<GoogleUserInfo> {
  const { clientId } = customerAuthConfig.google

  // Verify token with Google
  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`
  )

  if (!response.ok) {
    throw new AppError(customerAuthMessages.GOOGLE_TOKEN_INVALID, HTTP_STATUS.BAD_REQUEST)
  }

  const payload = await response.json()

  // Verify audience matches our client ID
  if (payload.aud !== clientId) {
    throw new AppError(customerAuthMessages.GOOGLE_TOKEN_INVALID, HTTP_STATUS.BAD_REQUEST)
  }

  return {
    sub: payload.sub,
    email: payload.email,
    email_verified: payload.email_verified === 'true',
    name: payload.name || '',
    given_name: payload.given_name || '',
    family_name: payload.family_name || '',
    picture: payload.picture || '',
  }
}

/**
 * Find or create customer from Google user info
 * Implements account linking by email
 */
async function findOrCreateCustomerFromGoogle(
  userInfo: GoogleUserInfo
): Promise<{ customer: CustomerProfile; isNewUser: boolean }> {
  const { sub: googleId, email, given_name, family_name, picture } = userInfo

  // 1. First, try to find by google_id
  let result = await db.query(
    `SELECT id, email, phone, first_name, last_name, profile_picture, is_active, last_login_at, last_login_method
     FROM customers
     WHERE google_id = $1`,
    [googleId]
  )

  if (result.rows.length > 0) {
    const customer = result.rows[0]

    if (!customer.is_active) {
      throw new AppError(customerAuthMessages.CUSTOMER_INACTIVE, HTTP_STATUS.FORBIDDEN)
    }

    return { customer: formatCustomerProfile(customer), isNewUser: false }
  }

  // 2. Try to find by email (account linking)
  if (email) {
    result = await db.query(
      `SELECT id, email, phone, first_name, last_name, profile_picture, is_active, last_login_at, last_login_method
       FROM customers
       WHERE email = $1`,
      [email.toLowerCase()]
    )

    if (result.rows.length > 0) {
      const customer = result.rows[0]

      if (!customer.is_active) {
        throw new AppError(customerAuthMessages.CUSTOMER_INACTIVE, HTTP_STATUS.FORBIDDEN)
      }

      // Link Google account to existing customer
      await db.query(
        `UPDATE customers SET google_id = $1 WHERE id = $2`,
        [googleId, customer.id]
      )

      return { customer: formatCustomerProfile(customer), isNewUser: false }
    }
  }

  // 3. Create new customer
  const insertResult = await db.query(
    `INSERT INTO customers (email, google_id, first_name, last_name, profile_picture)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, email, phone, first_name, last_name, profile_picture, last_login_at, last_login_method`,
    [email?.toLowerCase() || null, googleId, given_name || null, family_name || null, picture || null]
  )

  return {
    customer: formatCustomerProfile(insertResult.rows[0]),
    isNewUser: true,
  }
}

/**
 * Format customer row to CustomerProfile
 */
function formatCustomerProfile(row: Record<string, unknown>): CustomerProfile {
  return {
    id: row.id as string,
    email: row.email as string | null,
    phone: row.phone as string | null,
    first_name: row.first_name as string | null,
    last_name: row.last_name as string | null,
    profile_picture: row.profile_picture as string | null,
    last_login_at: row.last_login_at as Date | null,
    last_login_method: row.last_login_method as string | null,
  }
}

/**
 * Create session and generate JWT token
 */
async function createSessionAndToken(
  customerId: string,
  customerProfile: CustomerProfile,
  loginMethod: LoginMethod,
  ipAddress?: string
): Promise<{ token: string; sessionId: string }> {
  // Create session with empty token first
  const sessionResult = await db.query(
    `INSERT INTO customer_sessions (customer_id, token, login_method, ip_address)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [customerId, '', loginMethod, ipAddress || null]
  )

  const sessionId = sessionResult.rows[0].id

  // Generate JWT token
  const payload: CustomerJwtPayload = {
    session_id: sessionId,
    customer_id: customerId,
    email: customerProfile.email,
    phone: customerProfile.phone,
  }

  const token = generateToken(
    payload,
    customerAuthConfig.jwt.secret,
    customerAuthConfig.jwt.expiresIn
  )

  // Update session with token
  await db.query(
    `UPDATE customer_sessions SET token = $1 WHERE id = $2`,
    [token, sessionId]
  )

  // Update customer last login
  await db.query(
    `UPDATE customers SET last_login_at = NOW(), last_login_method = $1 WHERE id = $2`,
    [loginMethod, customerId]
  )

  return { token, sessionId }
}

/**
 * Handle Google OAuth callback
 * Called when user is redirected back from Google
 */
export async function handleGoogleCallback(
  code: string,
  ipAddress?: string
): Promise<AuthServiceResult> {
  // Exchange code for tokens
  const tokens = await exchangeCodeForTokens(code)

  // Get user info using access token
  const userInfo = await getGoogleUserInfo(tokens.access_token)

  // Find or create customer
  const { customer, isNewUser } = await findOrCreateCustomerFromGoogle(userInfo)

  // Create session and generate token
  const { token } = await createSessionAndToken(
    customer.id,
    customer,
    'google',
    ipAddress
  )

  // Update profile with latest Google info if needed
  if (!isNewUser) {
    await db.query(
      `UPDATE customers
       SET profile_picture = COALESCE(profile_picture, $1)
       WHERE id = $2`,
      [userInfo.picture || null, customer.id]
    )
  }

  return {
    response: {
      token,
      customer,
      is_new_user: isNewUser,
    },
    token,
  }
}

/**
 * Handle Google ID token verification (for mobile apps)
 */
export async function handleGoogleToken(
  idToken: string,
  ipAddress?: string
): Promise<AuthServiceResult> {
  // Verify ID token
  const userInfo = await verifyGoogleIdToken(idToken)

  // Find or create customer
  const { customer, isNewUser } = await findOrCreateCustomerFromGoogle(userInfo)

  // Create session and generate token
  const { token } = await createSessionAndToken(
    customer.id,
    customer,
    'google',
    ipAddress
  )

  return {
    response: {
      token,
      customer,
      is_new_user: isNewUser,
    },
    token,
  }
}

export const googleAuthService = {
  getGoogleAuthUrl,
  handleGoogleCallback,
  handleGoogleToken,
}
