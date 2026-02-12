import { Hono } from 'hono'
import { returnPolicyService } from '../../services/policy-pages/return-policy.service'
import { updateReturnPolicySchema } from '../../schemas/policy-pages/return-policy.schema'
import { cmsMessages } from '../../config/cms.messages'
import { successResponse } from '../../../../utils/response'
import { errorHandler } from '../../../../utils/error-handler'
import { authWithPermission } from '../../../../middleware/auth.middleware'
import { PERMISSIONS } from '../../../../config/permissions.constants'
import type { AppEnv } from '../../../../types/hono.types'

export const returnPolicyRoutes = new Hono<AppEnv>()

// GET / - Get return policy content
returnPolicyRoutes.get('/', authWithPermission(PERMISSIONS.CMS.MANAGE), async (c) => {
  try {
    const section = await returnPolicyService.getContent()
    return successResponse(c, cmsMessages.RETURN_POLICY_FETCHED, section)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// PUT / - Update return policy content
returnPolicyRoutes.put('/', authWithPermission(PERMISSIONS.CMS.MANAGE), async (c) => {
  try {
    const body = await c.req.json()
    const data = updateReturnPolicySchema.parse(body)

    const section = await returnPolicyService.updateContent(data.content)
    return successResponse(c, cmsMessages.RETURN_POLICY_UPDATED, section)
  } catch (error) {
    return errorHandler(error, c)
  }
})
