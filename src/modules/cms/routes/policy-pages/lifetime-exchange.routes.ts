import { Hono } from 'hono'
import { lifetimeExchangeService } from '../../services/policy-pages/lifetime-exchange.service'
import { updateLifetimeExchangeSchema } from '../../schemas/policy-pages/lifetime-exchange.schema'
import { cmsMessages } from '../../config/cms.messages'
import { successResponse } from '../../../../utils/response'
import { errorHandler } from '../../../../utils/error-handler'
import { authWithPermission } from '../../../../middleware/auth.middleware'
import { PERMISSIONS } from '../../../../config/permissions.constants'
import type { AppEnv } from '../../../../types/hono.types'

export const lifetimeExchangeRoutes = new Hono<AppEnv>()

// GET / - Get lifetime exchange content
lifetimeExchangeRoutes.get('/', authWithPermission(PERMISSIONS.CMS.MANAGE), async (c) => {
  try {
    const section = await lifetimeExchangeService.getContent()
    return successResponse(c, cmsMessages.LIFETIME_EXCHANGE_FETCHED, section)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// PUT / - Update lifetime exchange content
lifetimeExchangeRoutes.put('/', authWithPermission(PERMISSIONS.CMS.MANAGE), async (c) => {
  try {
    const body = await c.req.json()
    const data = updateLifetimeExchangeSchema.parse(body)

    const section = await lifetimeExchangeService.updateContent(data.content)
    return successResponse(c, cmsMessages.LIFETIME_EXCHANGE_UPDATED, section)
  } catch (error) {
    return errorHandler(error, c)
  }
})
