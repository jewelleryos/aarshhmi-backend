import { db } from '../../../lib/db'
import { AppError } from '../../../utils/app-error'
import { HTTP_STATUS } from '../../../config/constants'
import { usersMessages } from '../config/users.messages'
import { PERMISSIONS } from '../../../config/permissions.constants'
import type {
  UserResponse,
  UsersListResponse,
  CreateUserRequest,
  UpdateUserRequest,
  StatusChangeResponse,
} from '../types/users.types'

export const usersService = {
  async getAllUsers(): Promise<UsersListResponse> {
    const result = await db.query(
      `SELECT id, email, first_name, last_name, phone, is_active, permissions,
              last_login_at, created_at, updated_at
       FROM users
       ORDER BY created_at DESC`
    )

    const users: UserResponse[] = result.rows.map((row) => ({
      id: row.id,
      email: row.email,
      first_name: row.first_name,
      last_name: row.last_name,
      phone: row.phone,
      is_active: row.is_active,
      permissions: row.permissions || [],
      last_login_at: row.last_login_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }))

    return {
      users,
      total: users.length,
    }
  },

  async getUserById(id: string): Promise<UserResponse> {
    const result = await db.query(
      `SELECT id, email, first_name, last_name, phone, is_active, permissions,
              last_login_at, created_at, updated_at
       FROM users
       WHERE id = $1`,
      [id]
    )

    if (result.rows.length === 0) {
      throw new AppError(usersMessages.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    const row = result.rows[0]
    return {
      id: row.id,
      email: row.email,
      first_name: row.first_name,
      last_name: row.last_name,
      phone: row.phone,
      is_active: row.is_active,
      permissions: row.permissions || [],
      last_login_at: row.last_login_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }
  },

  async createUser(data: CreateUserRequest): Promise<UserResponse> {
    // Check if email already exists
    const existingUser = await db.query(
      `SELECT id FROM users WHERE email = $1`,
      [data.email]
    )

    if (existingUser.rows.length > 0) {
      throw new AppError(usersMessages.EMAIL_ALREADY_EXISTS, HTTP_STATUS.CONFLICT)
    }

    // Hash password using Bun's native password API
    const hashedPassword = await Bun.password.hash(data.password)

    // Create user
    const result = await db.query(
      `INSERT INTO users (email, first_name, last_name, phone, password, permissions, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, email, first_name, last_name, phone, is_active, permissions, created_at, updated_at`,
      [
        data.email,
        data.first_name,
        data.last_name,
        data.phone || null,
        hashedPassword,
        data.permissions,
        data.is_active ?? true,
      ]
    )

    const row = result.rows[0]
    return {
      id: row.id,
      email: row.email,
      first_name: row.first_name,
      last_name: row.last_name,
      phone: row.phone,
      is_active: row.is_active,
      permissions: row.permissions || [],
      last_login_at: null,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }
  },

  async updateUser(
    id: string,
    data: UpdateUserRequest,
    currentUserId: string,
    currentUserPermissions: number[]
  ): Promise<UserResponse> {
    // Check if target user exists
    const existingUser = await db.query(
      `SELECT id, permissions FROM users WHERE id = $1`,
      [id]
    )

    if (existingUser.rows.length === 0) {
      throw new AppError(usersMessages.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    const isUpdatingSelf = id === currentUserId
    const hasManageOwnPermissions = currentUserPermissions.includes(PERMISSIONS.USER.MANAGE_OWN_PERMISSIONS)

    // If updating own permissions without MANAGE_OWN_PERMISSIONS permission
    if (isUpdatingSelf && data.permissions !== undefined && !hasManageOwnPermissions) {
      throw new AppError(usersMessages.CANNOT_UPDATE_OWN_PERMISSIONS, HTTP_STATUS.FORBIDDEN)
    }

    // If updating self and trying to remove MANAGE_OWN_PERMISSIONS
    if (
      isUpdatingSelf &&
      data.permissions !== undefined &&
      hasManageOwnPermissions &&
      !data.permissions.includes(PERMISSIONS.USER.MANAGE_OWN_PERMISSIONS)
    ) {
      throw new AppError(usersMessages.CANNOT_REMOVE_OWN_PERMISSION, HTTP_STATUS.FORBIDDEN)
    }

    // Check if email is being changed and if it's already taken
    if (data.email) {
      const emailExists = await db.query(
        `SELECT id FROM users WHERE email = $1 AND id != $2`,
        [data.email, id]
      )

      if (emailExists.rows.length > 0) {
        throw new AppError(usersMessages.EMAIL_ALREADY_EXISTS, HTTP_STATUS.CONFLICT)
      }
    }

    // Build dynamic update query
    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (data.email !== undefined) {
      updates.push(`email = $${paramIndex}`)
      values.push(data.email)
      paramIndex++
    }

    if (data.first_name !== undefined) {
      updates.push(`first_name = $${paramIndex}`)
      values.push(data.first_name)
      paramIndex++
    }

    if (data.last_name !== undefined) {
      updates.push(`last_name = $${paramIndex}`)
      values.push(data.last_name)
      paramIndex++
    }

    if (data.phone !== undefined) {
      updates.push(`phone = $${paramIndex}`)
      values.push(data.phone)
      paramIndex++
    }

    if (data.permissions !== undefined) {
      updates.push(`permissions = $${paramIndex}`)
      values.push(data.permissions)
      paramIndex++
    }

    // If no updates, just return the user
    if (updates.length === 0) {
      return this.getUserById(id)
    }

    values.push(id)

    const result = await db.query(
      `UPDATE users
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, email, first_name, last_name, phone, is_active, permissions,
                 last_login_at, created_at, updated_at`,
      values
    )

    const row = result.rows[0]
    return {
      id: row.id,
      email: row.email,
      first_name: row.first_name,
      last_name: row.last_name,
      phone: row.phone,
      is_active: row.is_active,
      permissions: row.permissions || [],
      last_login_at: row.last_login_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }
  },

  async changeStatus(
    id: string,
    isActive: boolean,
    currentUserId: string
  ): Promise<StatusChangeResponse> {
    // Check if target user exists
    const existingUser = await db.query(
      `SELECT id FROM users WHERE id = $1`,
      [id]
    )

    if (existingUser.rows.length === 0) {
      throw new AppError(usersMessages.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    // User cannot deactivate themselves
    if (id === currentUserId && !isActive) {
      throw new AppError(usersMessages.CANNOT_DEACTIVATE_SELF, HTTP_STATUS.FORBIDDEN)
    }

    // Update status
    const result = await db.query(
      `UPDATE users SET is_active = $1 WHERE id = $2 RETURNING id, is_active`,
      [isActive, id]
    )

    // If deactivating, invalidate all user sessions
    if (!isActive) {
      await db.query(
        `DELETE FROM user_sessions WHERE user_id = $1`,
        [id]
      )
    }

    const row = result.rows[0]
    return {
      id: row.id,
      is_active: row.is_active,
    }
  },

  async deleteUser(id: string, currentUserId: string): Promise<void> {
    // Check if target user exists
    const existingUser = await db.query(
      `SELECT id FROM users WHERE id = $1`,
      [id]
    )

    if (existingUser.rows.length === 0) {
      throw new AppError(usersMessages.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    // User cannot delete themselves
    if (id === currentUserId) {
      throw new AppError(usersMessages.CANNOT_DELETE_SELF, HTTP_STATUS.FORBIDDEN)
    }

    // Delete all user sessions first
    await db.query(
      `DELETE FROM user_sessions WHERE user_id = $1`,
      [id]
    )

    // Delete user
    await db.query(
      `DELETE FROM users WHERE id = $1`,
      [id]
    )
  },
}
