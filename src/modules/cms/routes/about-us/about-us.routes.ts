import { Hono } from 'hono'
import { aboutUsService } from '../../services/about-us/about-us.service'
import { updateAboutUsSchema } from '../../schemas/about-us/about-us.schema'
import { cmsMessages } from '../../config/cms.messages'
import { successResponse } from '../../../../utils/response'
import { errorHandler } from '../../../../utils/error-handler'
import { authWithPermission } from '../../../../middleware/auth.middleware'
import { PERMISSIONS } from '../../../../config/permissions.constants'
import type { AppEnv } from '../../../../types/hono.types'

export const aboutUsRoutes = new Hono<AppEnv>()

// GET / - Get about us content
aboutUsRoutes.get('/', authWithPermission(PERMISSIONS.CMS.MANAGE), async (c) => {
  try {
    const section = await aboutUsService.getContent()
    return successResponse(c, cmsMessages.ABOUT_US_FETCHED, section)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// PUT / - Update about us content
aboutUsRoutes.put('/', authWithPermission(PERMISSIONS.CMS.MANAGE), async (c) => {
  try {
    const body = await c.req.json()
    const data = updateAboutUsSchema.parse(body)

    const section = await aboutUsService.updateContent(data.content)
    return successResponse(c, cmsMessages.ABOUT_US_UPDATED, section)
  } catch (error) {
    return errorHandler(error, c)
  }
})
