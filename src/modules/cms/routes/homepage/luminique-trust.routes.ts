import { Hono } from 'hono'
import { luminiqueTrustService } from '../../services/homepage/luminique-trust.service'
import { updateLuminiqueTrustSchema } from '../../schemas/homepage/luminique-trust.schema'
import { cmsMessages } from '../../config/cms.messages'
import { successResponse } from '../../../../utils/response'
import { errorHandler } from '../../../../utils/error-handler'
import { authWithPermission } from '../../../../middleware/auth.middleware'
import { PERMISSIONS } from '../../../../config/permissions.constants'
import type { AppEnv } from '../../../../types/hono.types'

export const luminiqueTrustRoutes = new Hono<AppEnv>()

// GET / - Get luminique trust content
luminiqueTrustRoutes.get('/', authWithPermission(PERMISSIONS.CMS.MANAGE), async (c) => {
  try {
    const section = await luminiqueTrustService.getContent()
    return successResponse(c, cmsMessages.LUMINIQUE_TRUST_FETCHED, section)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// PUT / - Update luminique trust content
luminiqueTrustRoutes.put('/', authWithPermission(PERMISSIONS.CMS.MANAGE), async (c) => {
  try {
    const body = await c.req.json()
    const data = updateLuminiqueTrustSchema.parse(body)

    const section = await luminiqueTrustService.updateContent(data.content)
    return successResponse(c, cmsMessages.LUMINIQUE_TRUST_UPDATED, section)
  } catch (error) {
    return errorHandler(error, c)
  }
})
