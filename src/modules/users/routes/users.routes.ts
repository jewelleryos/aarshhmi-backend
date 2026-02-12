import { Hono } from 'hono'
import { usersService } from '../services/users.service'
import { usersMessages } from '../config/users.messages'
import { createUserSchema, updateUserSchema, statusChangeSchema } from '../config/users.schema'
import { successResponse } from '../../../utils/response'
import { errorHandler } from '../../../utils/error-handler'
import { authWithPermission } from '../../../middleware/auth.middleware'
import { PERMISSIONS } from '../../../config/permissions.constants'
import { HTTP_STATUS } from '../../../config/constants'
import type { UsersListResponse, UserResponse, StatusChangeResponse } from '../types/users.types'
import type { AppEnv } from '../../../types/hono.types'

export const usersRoutes = new Hono<AppEnv>()

// GET /api/users - List all users
usersRoutes.get('/', authWithPermission(PERMISSIONS.USER.READ), async (c) => {
  try {
    const result = await usersService.getAllUsers()

    return successResponse<UsersListResponse>(c, usersMessages.USERS_FETCHED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/users/:id - Get single user
usersRoutes.get('/:id', authWithPermission(PERMISSIONS.USER.READ), async (c) => {
  try {
    const id = c.req.param('id')
    const user = await usersService.getUserById(id)

    return successResponse<UserResponse>(c, usersMessages.USER_FETCHED, user)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// POST /api/users - Create user
usersRoutes.post('/', authWithPermission(PERMISSIONS.USER.CREATE), async (c) => {
  try {
    const body = await c.req.json()
    const data = createUserSchema.parse(body)
    const user = await usersService.createUser(data)

    return successResponse<UserResponse>(c, usersMessages.USER_CREATED, user, HTTP_STATUS.CREATED)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// PUT /api/users/:id - Update user (no password change)
usersRoutes.put('/:id', authWithPermission(PERMISSIONS.USER.UPDATE), async (c) => {
  try {
    const id = c.req.param('id')
    const currentUser = c.get('user')
    const body = await c.req.json()
    const data = updateUserSchema.parse(body)

    const user = await usersService.updateUser(
      id,
      data,
      currentUser.id,
      currentUser.permissions
    )

    return successResponse<UserResponse>(c, usersMessages.USER_UPDATED, user)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// PATCH /api/users/:id/status - Toggle user status (activate/deactivate)
usersRoutes.patch('/:id/status', authWithPermission(PERMISSIONS.USER.UPDATE), async (c) => {
  try {
    const id = c.req.param('id')
    const currentUser = c.get('user')
    const body = await c.req.json()
    const data = statusChangeSchema.parse(body)

    const result = await usersService.changeStatus(id, data.is_active, currentUser.id)

    const message = data.is_active
      ? usersMessages.USER_ACTIVATED
      : usersMessages.USER_DEACTIVATED

    return successResponse<StatusChangeResponse>(c, message, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// DELETE /api/users/:id - Delete user
usersRoutes.delete('/:id', authWithPermission(PERMISSIONS.USER.DELETE), async (c) => {
  try {
    const id = c.req.param('id')
    const currentUser = c.get('user')

    await usersService.deleteUser(id, currentUser.id)

    return successResponse(c, usersMessages.USER_DELETED, null)
  } catch (error) {
    return errorHandler(error, c)
  }
})
