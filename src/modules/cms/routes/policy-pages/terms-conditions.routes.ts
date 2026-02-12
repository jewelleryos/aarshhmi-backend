import { Hono } from 'hono'
import { termsConditionsService } from '../../services/policy-pages/terms-conditions.service'
import { updateTermsConditionsSchema } from '../../schemas/policy-pages/terms-conditions.schema'
import { cmsMessages } from '../../config/cms.messages'
import { successResponse } from '../../../../utils/response'
import { errorHandler } from '../../../../utils/error-handler'
import { authWithPermission } from '../../../../middleware/auth.middleware'
import { PERMISSIONS } from '../../../../config/permissions.constants'
import type { AppEnv } from '../../../../types/hono.types'

export const termsConditionsRoutes = new Hono<AppEnv>()

// GET / - Get terms and conditions content
termsConditionsRoutes.get('/', authWithPermission(PERMISSIONS.CMS.MANAGE), async (c) => {
  try {
    const section = await termsConditionsService.getContent()
    return successResponse(c, cmsMessages.TERMS_CONDITIONS_FETCHED, section)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// PUT / - Update terms and conditions content
termsConditionsRoutes.put('/', authWithPermission(PERMISSIONS.CMS.MANAGE), async (c) => {
  try {
    const body = await c.req.json()
    const data = updateTermsConditionsSchema.parse(body)

    const section = await termsConditionsService.updateContent(data.content)
    return successResponse(c, cmsMessages.TERMS_CONDITIONS_UPDATED, section)
  } catch (error) {
    return errorHandler(error, c)
  }
})
