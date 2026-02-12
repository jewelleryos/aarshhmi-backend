// Customer database record
export interface Customer {
  id: string
  email: string | null
  phone: string | null
  first_name: string | null
  last_name: string | null
  profile_picture: string | null
  birth_date: Date | null
  anniversary_date: Date | null
  password: string | null
  password_reset_token: string | null
  password_reset_expires_at: Date | null
  google_id: string | null
  facebook_id: string | null
  is_active: boolean
  last_login_at: Date | null
  last_login_method: string | null
  metadata: Record<string, unknown>
  created_at: Date
  updated_at: Date
}

// Customer public profile (safe to return to frontend)
export interface CustomerProfile {
  id: string
  email: string | null
  phone: string | null
  first_name: string | null
  last_name: string | null
  profile_picture: string | null
  birth_date: Date | null
  anniversary_date: Date | null
  last_login_at: Date | null
  last_login_method: string | null
}

// JWT payload for customer tokens
export interface CustomerJwtPayload {
  session_id: string
  customer_id: string
  email: string | null
  phone: string | null
}

// Login method types
export type LoginMethod = 'google' | 'facebook'

// ========================================
// Request/Response types
// ========================================

// Google token verification (mobile)
export interface GoogleTokenRequest {
  id_token: string
}

// Auth response (used for all auth methods)
export interface AuthResponse {
  token: string
  customer: CustomerProfile
  is_new_user: boolean
}

// Service result (internal)
export interface AuthServiceResult {
  response: AuthResponse
  token: string
}

// ========================================
// Google OAuth types
// ========================================

export interface GoogleUserInfo {
  sub: string          // Google user ID
  email: string
  email_verified: boolean
  name: string
  given_name: string
  family_name: string
  picture: string
}

export interface GoogleTokenResponse {
  access_token: string
  expires_in: number
  refresh_token?: string
  scope: string
  token_type: string
  id_token: string
}

// ========================================
// Session types
// ========================================

export interface CustomerSession {
  id: string
  customer_id: string
  token: string
  login_method: LoginMethod
  device_info: Record<string, unknown>
  ip_address: string | null
  created_at: Date
}
