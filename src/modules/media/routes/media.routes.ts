import { Hono } from 'hono'
import { mediaService } from '../services/media.service'
import { mediaMessages } from '../config/media.messages'
import { createFolderSchema, deleteFilesSchema } from '../config/media.schema'
import { successResponse } from '../../../utils/response'
import { errorHandler } from '../../../utils/error-handler'
import { authWithPermission } from '../../../middleware/auth.middleware'
import { PERMISSIONS } from '../../../config/permissions.constants'
import type { AppEnv } from '../../../types/hono.types'
import type { MediaListResponse, UploadResult, DeleteResult, CreateFolderResponse } from '../types/media.types'

export const mediaRoutes = new Hono<AppEnv>()


// GET /api/media/list - List files and folders
mediaRoutes.get('/list', authWithPermission(PERMISSIONS.MEDIA_MANAGER.READ), async (c) => {
  try {
    const path = c.req.query('path') || ''
    const result = await mediaService.listItems(path)

    console.log('Media items fetched for path:', path, result)

    return successResponse<MediaListResponse>(c, mediaMessages.FILES_FETCHED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// POST /api/media/folder - Create folder
mediaRoutes.post('/folder', authWithPermission(PERMISSIONS.MEDIA_MANAGER.READ), async (c) => {
  try {
    const body = await c.req.json()
    const data = createFolderSchema.parse(body)
    const result = await mediaService.createFolder(data.path, data.name)

    return successResponse<CreateFolderResponse>(c, mediaMessages.FOLDER_CREATED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// POST /api/media/upload - Upload files (single or multiple)
mediaRoutes.post('/upload', authWithPermission(PERMISSIONS.MEDIA_MANAGER.READ), async (c) => {
  try {
    const formData = await c.req.formData()
    const path = formData.get('path') as string || ''
    const files = formData.getAll('files') as File[]

    if (!files || files.length === 0) {
      return c.json({ success: false, message: mediaMessages.NO_FILES_PROVIDED }, 400)
    }

    const result = await mediaService.uploadFiles(path, files)

    return successResponse<UploadResult>(c, mediaMessages.FILES_UPLOADED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// POST /api/media/delete-files - Delete files (single or multiple)
mediaRoutes.post('/delete-files', authWithPermission(PERMISSIONS.MEDIA_MANAGER.READ), async (c) => {
  try {
    const body = await c.req.json()
    const data = deleteFilesSchema.parse(body)
    const result = await mediaService.deleteFiles(data.paths)

    return successResponse<DeleteResult>(c, mediaMessages.FILES_DELETED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// DELETE /api/media/folder - Delete folder
mediaRoutes.delete('/folder', authWithPermission(PERMISSIONS.MEDIA_MANAGER.READ), async (c) => {
  try {
    const path = c.req.query('path')

    if (!path) {
      return c.json({ success: false, message: mediaMessages.INVALID_PATH }, 400)
    }

    await mediaService.deleteFolder(path)

    return successResponse(c, mediaMessages.FOLDER_DELETED, null)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/media/download/file - Download file
mediaRoutes.get('/download/file', authWithPermission(PERMISSIONS.MEDIA_MANAGER.READ), async (c) => {
  try {
    const path = c.req.query('path')

    if (!path) {
      return c.json({ success: false, message: mediaMessages.INVALID_PATH }, 400)
    }

    const file = await mediaService.downloadFile(path)

    return new Response(new Uint8Array(file.buffer), {
      headers: {
        'Content-Type': file.contentType,
        'Content-Disposition': `attachment; filename="${file.filename}"`,
      },
    })
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/media/download/folder - Download folder as ZIP
mediaRoutes.get('/download/folder', authWithPermission(PERMISSIONS.MEDIA_MANAGER.READ), async (c) => {
  try {
    const path = c.req.query('path')

    if (!path) {
      return c.json({ success: false, message: mediaMessages.INVALID_PATH }, 400)
    }

    const file = await mediaService.downloadFolder(path)

    return new Response(new Uint8Array(file.buffer), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${file.filename}"`,
      },
    })
  } catch (error) {
    return errorHandler(error, c)
  }
})
