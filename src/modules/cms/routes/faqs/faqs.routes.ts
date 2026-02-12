import { Hono } from 'hono'
import { faqsService } from '../../services/faqs/faqs.service'
import { updateFAQsSchema } from '../../schemas/faqs/faqs.schema'
import { cmsMessages } from '../../config/cms.messages'
import { successResponse } from '../../../../utils/response'
import { errorHandler } from '../../../../utils/error-handler'
import { authWithPermission } from '../../../../middleware/auth.middleware'
import { PERMISSIONS } from '../../../../config/permissions.constants'
import type { AppEnv } from '../../../../types/hono.types'

export const faqsRoutes = new Hono<AppEnv>()

// GET / - Get FAQs content
faqsRoutes.get('/', authWithPermission(PERMISSIONS.CMS.MANAGE), async (c) => {
  try {
    const section = await faqsService.getContent()
    return successResponse(c, cmsMessages.FAQS_FETCHED, section)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// PUT / - Update FAQs content
faqsRoutes.put('/', authWithPermission(PERMISSIONS.CMS.MANAGE), async (c) => {
  try {
    const body = await c.req.json()
    const data = updateFAQsSchema.parse(body)

    const section = await faqsService.updateContent(data.content)
    return successResponse(c, cmsMessages.FAQS_UPDATED, section)
  } catch (error) {
    return errorHandler(error, c)
  }
})
