import { Hono } from 'hono'
import { privacyPolicyService } from '../../services/policy-pages/privacy-policy.service'
import { updatePrivacyPolicySchema } from '../../schemas/policy-pages/privacy-policy.schema'
import { cmsMessages } from '../../config/cms.messages'
import { successResponse } from '../../../../utils/response'
import { errorHandler } from '../../../../utils/error-handler'
import { authWithPermission } from '../../../../middleware/auth.middleware'
import { PERMISSIONS } from '../../../../config/permissions.constants'
import type { AppEnv } from '../../../../types/hono.types'

export const privacyPolicyRoutes = new Hono<AppEnv>()

// GET / - Get privacy policy content
privacyPolicyRoutes.get('/', authWithPermission(PERMISSIONS.CMS.MANAGE), async (c) => {
  try {
    const section = await privacyPolicyService.getContent()
    return successResponse(c, cmsMessages.PRIVACY_POLICY_FETCHED, section)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// PUT / - Update privacy policy content
privacyPolicyRoutes.put('/', authWithPermission(PERMISSIONS.CMS.MANAGE), async (c) => {
  try {
    const body = await c.req.json()
    const data = updatePrivacyPolicySchema.parse(body)

    const section = await privacyPolicyService.updateContent(data.content)
    return successResponse(c, cmsMessages.PRIVACY_POLICY_UPDATED, section)
  } catch (error) {
    return errorHandler(error, c)
  }
})
