import { Hono } from 'hono'
import { aboutLuminiqueService } from '../../services/homepage/about-luminique.service'
import { updateAboutLuminiqueSchema } from '../../schemas/homepage/about-luminique.schema'
import { cmsMessages } from '../../config/cms.messages'
import { successResponse } from '../../../../utils/response'
import { errorHandler } from '../../../../utils/error-handler'
import { authWithPermission } from '../../../../middleware/auth.middleware'
import { PERMISSIONS } from '../../../../config/permissions.constants'
import type { AppEnv } from '../../../../types/hono.types'

export const aboutLuminiqueRoutes = new Hono<AppEnv>()

// GET / - Get about luminique content
aboutLuminiqueRoutes.get('/', authWithPermission(PERMISSIONS.CMS.MANAGE), async (c) => {
  try {
    const section = await aboutLuminiqueService.getContent()
    return successResponse(c, cmsMessages.ABOUT_LUMINIQUE_FETCHED, section)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// PUT / - Update about luminique content
aboutLuminiqueRoutes.put('/', authWithPermission(PERMISSIONS.CMS.MANAGE), async (c) => {
  try {
    const body = await c.req.json()
    const data = updateAboutLuminiqueSchema.parse(body)

    const section = await aboutLuminiqueService.updateContent(data.content)
    return successResponse(c, cmsMessages.ABOUT_LUMINIQUE_UPDATED, section)
  } catch (error) {
    return errorHandler(error, c)
  }
})
