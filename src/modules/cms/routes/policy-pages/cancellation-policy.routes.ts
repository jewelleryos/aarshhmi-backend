import { Hono } from 'hono'
import { cancellationPolicyService } from '../../services/policy-pages/cancellation-policy.service'
import { updateCancellationPolicySchema } from '../../schemas/policy-pages/cancellation-policy.schema'
import { cmsMessages } from '../../config/cms.messages'
import { successResponse } from '../../../../utils/response'
import { errorHandler } from '../../../../utils/error-handler'
import { authWithPermission } from '../../../../middleware/auth.middleware'
import { PERMISSIONS } from '../../../../config/permissions.constants'
import type { AppEnv } from '../../../../types/hono.types'

export const cancellationPolicyRoutes = new Hono<AppEnv>()

// GET / - Get cancellation policy content
cancellationPolicyRoutes.get('/', authWithPermission(PERMISSIONS.CMS.MANAGE), async (c) => {
  try {
    const section = await cancellationPolicyService.getContent()
    return successResponse(c, cmsMessages.CANCELLATION_POLICY_FETCHED, section)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// PUT / - Update cancellation policy content
cancellationPolicyRoutes.put('/', authWithPermission(PERMISSIONS.CMS.MANAGE), async (c) => {
  try {
    const body = await c.req.json()
    const data = updateCancellationPolicySchema.parse(body)

    const section = await cancellationPolicyService.updateContent(data.content)
    return successResponse(c, cmsMessages.CANCELLATION_POLICY_UPDATED, section)
  } catch (error) {
    return errorHandler(error, c)
  }
})
