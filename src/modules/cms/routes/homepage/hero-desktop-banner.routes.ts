import { Hono } from 'hono'
import { heroDesktopBannerService } from '../../services/homepage/hero-desktop-banner.service'
import { heroDesktopBannerUpdateSchema } from '../../schemas/homepage/hero-desktop-banner.schema'
import { cmsMessages } from '../../config/cms.messages'
import { successResponse } from '../../../../utils/response'
import { errorHandler } from '../../../../utils/error-handler'
import { authWithPermission } from '../../../../middleware/auth.middleware'
import { PERMISSIONS } from '../../../../config/permissions.constants'
import type { AppEnv } from '../../../../types/hono.types'

export const heroDesktopBannerRoutes = new Hono<AppEnv>()

// GET / - Get hero desktop banners
heroDesktopBannerRoutes.get('/', authWithPermission(PERMISSIONS.CMS.MANAGE), async (c) => {
  try {
    const section = await heroDesktopBannerService.getBanners()
    return successResponse(c, cmsMessages.HERO_DESKTOP_BANNER_FETCHED, section)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// PUT / - Update hero desktop banners
heroDesktopBannerRoutes.put('/', authWithPermission(PERMISSIONS.CMS.MANAGE), async (c) => {
  try {
    const body = await c.req.json()
    const data = heroDesktopBannerUpdateSchema.parse(body)

    const section = await heroDesktopBannerService.updateBanners(data.content)
    return successResponse(c, cmsMessages.HERO_DESKTOP_BANNER_UPDATED, section)
  } catch (error) {
    return errorHandler(error, c)
  }
})
