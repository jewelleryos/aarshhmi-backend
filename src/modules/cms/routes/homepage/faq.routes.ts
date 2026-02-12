import { Hono } from 'hono'
import { faqService } from '../../services/homepage/faq.service'
import { updateFAQSchema } from '../../schemas/homepage/faq.schema'
import { cmsMessages } from '../../config/cms.messages'
import { successResponse } from '../../../../utils/response'
import { errorHandler } from '../../../../utils/error-handler'
import { authWithPermission } from '../../../../middleware/auth.middleware'
import { PERMISSIONS } from '../../../../config/permissions.constants'
import type { AppEnv } from '../../../../types/hono.types'

export const faqRoutes = new Hono<AppEnv>()

// GET / - Get FAQ items
faqRoutes.get('/', authWithPermission(PERMISSIONS.CMS.MANAGE), async (c) => {
  try {
    const section = await faqService.getItems()
    return successResponse(c, cmsMessages.FAQ_FETCHED, section)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// PUT / - Update FAQ items
faqRoutes.put('/', authWithPermission(PERMISSIONS.CMS.MANAGE), async (c) => {
  try {
    const body = await c.req.json()
    const data = updateFAQSchema.parse(body)

    const section = await faqService.updateItems(data.content)
    return successResponse(c, cmsMessages.FAQ_UPDATED, section)
  } catch (error) {
    return errorHandler(error, c)
  }
})
