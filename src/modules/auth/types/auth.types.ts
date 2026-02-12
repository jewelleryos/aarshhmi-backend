export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  user: {
    id: string
    email: string
    first_name: string
    last_name: string
  }
  permissions: number[]
}

export interface LoginServiceResult {
  response: LoginResponse
  token: string
}

export interface JwtPayload {
  session_id: string
  user_id: string
  email: string
  first_name: string
  last_name: string
}

// Forgot Password
export interface ForgotPasswordRequest {
  email: string
}

// Reset Password
export interface ResetPasswordRequest {
  token: string
  password: string
}

export interface ValidateResetTokenResponse {
  valid: boolean
}

export interface PasswordResetJwtPayload {
  user_id: string
  email: string
  type: 'password_reset'
}
