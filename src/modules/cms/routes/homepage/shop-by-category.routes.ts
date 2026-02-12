import { Hono } from 'hono'
import { shopByCategoryService } from '../../services/homepage/shop-by-category.service'
import { shopByCategoryUpdateSchema } from '../../schemas/homepage/shop-by-category.schema'
import { cmsMessages } from '../../config/cms.messages'
import { successResponse } from '../../../../utils/response'
import { errorHandler } from '../../../../utils/error-handler'
import { authWithPermission } from '../../../../middleware/auth.middleware'
import { PERMISSIONS } from '../../../../config/permissions.constants'
import type { AppEnv } from '../../../../types/hono.types'

export const shopByCategoryRoutes = new Hono<AppEnv>()

// GET / - Get shop by category
shopByCategoryRoutes.get('/', authWithPermission(PERMISSIONS.CMS.MANAGE), async (c) => {
  try {
    const section = await shopByCategoryService.getCategories()
    return successResponse(c, cmsMessages.SHOP_BY_CATEGORY_FETCHED, section)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// PUT / - Update shop by category
shopByCategoryRoutes.put('/', authWithPermission(PERMISSIONS.CMS.MANAGE), async (c) => {
  try {
    const body = await c.req.json()
    const data = shopByCategoryUpdateSchema.parse(body)

    const section = await shopByCategoryService.updateCategories(data.content)
    return successResponse(c, cmsMessages.SHOP_BY_CATEGORY_UPDATED, section)
  } catch (error) {
    return errorHandler(error, c)
  }
})
