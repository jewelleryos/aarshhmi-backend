import { Hono } from 'hono'
import { shippingPolicyService } from '../../services/policy-pages/shipping-policy.service'
import { updateShippingPolicySchema } from '../../schemas/policy-pages/shipping-policy.schema'
import { cmsMessages } from '../../config/cms.messages'
import { successResponse } from '../../../../utils/response'
import { errorHandler } from '../../../../utils/error-handler'
import { authWithPermission } from '../../../../middleware/auth.middleware'
import { PERMISSIONS } from '../../../../config/permissions.constants'
import type { AppEnv } from '../../../../types/hono.types'

export const shippingPolicyRoutes = new Hono<AppEnv>()

// GET / - Get shipping policy content
shippingPolicyRoutes.get('/', authWithPermission(PERMISSIONS.CMS.MANAGE), async (c) => {
  try {
    const section = await shippingPolicyService.getContent()
    return successResponse(c, cmsMessages.SHIPPING_POLICY_FETCHED, section)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// PUT / - Update shipping policy content
shippingPolicyRoutes.put('/', authWithPermission(PERMISSIONS.CMS.MANAGE), async (c) => {
  try {
    const body = await c.req.json()
    const data = updateShippingPolicySchema.parse(body)

    const section = await shippingPolicyService.updateContent(data.content)
    return successResponse(c, cmsMessages.SHIPPING_POLICY_UPDATED, section)
  } catch (error) {
    return errorHandler(error, c)
  }
})
