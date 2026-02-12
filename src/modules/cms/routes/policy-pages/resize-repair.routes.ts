import { Hono } from 'hono'
import { resizeRepairService } from '../../services/policy-pages/resize-repair.service'
import { updateResizeRepairSchema } from '../../schemas/policy-pages/resize-repair.schema'
import { cmsMessages } from '../../config/cms.messages'
import { successResponse } from '../../../../utils/response'
import { errorHandler } from '../../../../utils/error-handler'
import { authWithPermission } from '../../../../middleware/auth.middleware'
import { PERMISSIONS } from '../../../../config/permissions.constants'
import type { AppEnv } from '../../../../types/hono.types'

export const resizeRepairRoutes = new Hono<AppEnv>()

// GET / - Get resize and repair content
resizeRepairRoutes.get('/', authWithPermission(PERMISSIONS.CMS.MANAGE), async (c) => {
  try {
    const section = await resizeRepairService.getContent()
    return successResponse(c, cmsMessages.RESIZE_REPAIR_FETCHED, section)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// PUT / - Update resize and repair content
resizeRepairRoutes.put('/', authWithPermission(PERMISSIONS.CMS.MANAGE), async (c) => {
  try {
    const body = await c.req.json()
    const data = updateResizeRepairSchema.parse(body)

    const section = await resizeRepairService.updateContent(data.content)
    return successResponse(c, cmsMessages.RESIZE_REPAIR_UPDATED, section)
  } catch (error) {
    return errorHandler(error, c)
  }
})
