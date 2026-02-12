import { Hono } from 'hono'
import { heroMobileBannerService } from '../../services/homepage/hero-mobile-banner.service'
import { heroMobileBannerUpdateSchema } from '../../schemas/homepage/hero-mobile-banner.schema'
import { cmsMessages } from '../../config/cms.messages'
import { successResponse } from '../../../../utils/response'
import { errorHandler } from '../../../../utils/error-handler'
import { authWithPermission } from '../../../../middleware/auth.middleware'
import { PERMISSIONS } from '../../../../config/permissions.constants'
import type { AppEnv } from '../../../../types/hono.types'

export const heroMobileBannerRoutes = new Hono<AppEnv>()

// GET / - Get hero mobile banners
heroMobileBannerRoutes.get('/', authWithPermission(PERMISSIONS.CMS.MANAGE), async (c) => {
  try {
    const section = await heroMobileBannerService.getBanners()
    return successResponse(c, cmsMessages.HERO_MOBILE_BANNER_FETCHED, section)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// PUT / - Update hero mobile banners
heroMobileBannerRoutes.put('/', authWithPermission(PERMISSIONS.CMS.MANAGE), async (c) => {
  try {
    const body = await c.req.json()
    const data = heroMobileBannerUpdateSchema.parse(body)

    const section = await heroMobileBannerService.updateBanners(data.content)
    return successResponse(c, cmsMessages.HERO_MOBILE_BANNER_UPDATED, section)
  } catch (error) {
    return errorHandler(error, c)
  }
})
