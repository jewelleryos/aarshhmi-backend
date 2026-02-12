import { Hono } from 'hono'
import { mediaGridService } from '../../services/homepage/media-grid.service'
import { updateMediaGridSchema } from '../../schemas/homepage/media-grid.schema'
import { cmsMessages } from '../../config/cms.messages'
import { successResponse } from '../../../../utils/response'
import { errorHandler } from '../../../../utils/error-handler'
import { authWithPermission } from '../../../../middleware/auth.middleware'
import { PERMISSIONS } from '../../../../config/permissions.constants'
import type { AppEnv } from '../../../../types/hono.types'

export const mediaGridRoutes = new Hono<AppEnv>()

// GET / - Get media grid items
mediaGridRoutes.get('/', authWithPermission(PERMISSIONS.CMS.MANAGE), async (c) => {
  try {
    const section = await mediaGridService.getItems()
    return successResponse(c, cmsMessages.MEDIA_GRID_FETCHED, section)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// PUT / - Update media grid items
mediaGridRoutes.put('/', authWithPermission(PERMISSIONS.CMS.MANAGE), async (c) => {
  try {
    const body = await c.req.json()
    const data = updateMediaGridSchema.parse(body)

    const section = await mediaGridService.updateItems(data.content)
    return successResponse(c, cmsMessages.MEDIA_GRID_UPDATED, section)
  } catch (error) {
    return errorHandler(error, c)
  }
})
