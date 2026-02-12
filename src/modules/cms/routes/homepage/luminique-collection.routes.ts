import { Hono } from 'hono'
import { luminiqueCollectionService } from '../../services/homepage/luminique-collection.service'
import { updateLuminiqueCollectionSchema } from '../../schemas/homepage/luminique-collection.schema'
import { cmsMessages } from '../../config/cms.messages'
import { successResponse } from '../../../../utils/response'
import { errorHandler } from '../../../../utils/error-handler'
import { authWithPermission } from '../../../../middleware/auth.middleware'
import { PERMISSIONS } from '../../../../config/permissions.constants'
import type { AppEnv } from '../../../../types/hono.types'

export const luminiqueCollectionRoutes = new Hono<AppEnv>()

// GET / - Get luminique collection items
luminiqueCollectionRoutes.get('/', authWithPermission(PERMISSIONS.CMS.MANAGE), async (c) => {
  try {
    const section = await luminiqueCollectionService.getItems()
    return successResponse(c, cmsMessages.LUMINIQUE_COLLECTION_FETCHED, section)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// PUT / - Update luminique collection items
luminiqueCollectionRoutes.put('/', authWithPermission(PERMISSIONS.CMS.MANAGE), async (c) => {
  try {
    const body = await c.req.json()
    const data = updateLuminiqueCollectionSchema.parse(body)

    const section = await luminiqueCollectionService.updateItems(data.content)
    return successResponse(c, cmsMessages.LUMINIQUE_COLLECTION_UPDATED, section)
  } catch (error) {
    return errorHandler(error, c)
  }
})
