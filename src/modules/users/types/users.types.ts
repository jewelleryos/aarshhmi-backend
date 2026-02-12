// User response (excludes sensitive fields like password, reset tokens)
export interface UserResponse {
  id: string
  email: string
  first_name: string
  last_name: string
  phone: string | null
  is_active: boolean
  permissions: number[]
  last_login_at: string | null
  created_at: string
  updated_at: string
}

// List users response
export interface UsersListResponse {
  users: UserResponse[]
  total: number
}

// Create user request
export interface CreateUserRequest {
  email: string
  first_name: string
  last_name: string
  phone?: string
  password: string
  permissions: number[]
  is_active?: boolean
}

// Update user request (no password change allowed)
export interface UpdateUserRequest {
  email?: string
  first_name?: string
  last_name?: string
  phone?: string | null
  permissions?: number[]
}

// Status change request
export interface StatusChangeRequest {
  is_active: boolean
}

// Status change response
export interface StatusChangeResponse {
  id: string
  is_active: boolean
}
