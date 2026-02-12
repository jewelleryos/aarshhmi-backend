import { bunnyService } from '../../../shared/bunny-service'
import { bunnyConfig } from '../../../shared/bunny-service/bunny.config'
import { mediaConfig, isAllowedMimeType, getMaxSizeForType } from '../config/media.config'
import { mediaMessages } from '../config/media.messages'
import { AppError } from '../../../utils/app-error'
import { HTTP_STATUS } from '../../../config/constants'
import type {
  MediaItem,
  MediaListResponse,
  UploadResult,
  DeleteResult,
  CreateFolderResponse,
} from '../types/media.types'

// Strip storage zone name from Bunny path
// Bunny returns: /Aarshhmijewel/demo/ -> we need: /demo/
const stripStoragePrefix = (bunnyPath: string): string => {
  // Get storage name without trailing slash
  const storageName = bunnyConfig.storageName.replace(/\/$/, '')
  const prefix = `/${storageName}/`

  if (bunnyPath.startsWith(prefix)) {
    return '/' + bunnyPath.slice(prefix.length)
  }
  return bunnyPath
}

// List files and folders
const listItems = async (path: string): Promise<MediaListResponse> => {
  const result = await bunnyService.listFiles(path)

  if (!result.success || !result.data) {
    throw new AppError(result.error || 'Failed to list files', HTTP_STATUS.BAD_REQUEST)
  }

  const items: MediaItem[] = result.data.map((item) => {
    // Build raw path from Bunny response
    const rawPath = item.Path + item.ObjectName + (item.IsDirectory ? '/' : '')
    // Strip storage zone prefix for frontend use
    const cleanPath = stripStoragePrefix(rawPath)

    return {
      name: item.ObjectName,
      path: cleanPath,
      type: item.IsDirectory ? 'folder' : 'file',
      size: item.Length,
      contentType: item.ContentType || undefined,
      url: item.IsDirectory ? undefined : bunnyService.getPublicUrl(cleanPath),
      lastModified: item.LastChanged,
    }
  })

  return { path, items }
}

// Create folder
const createFolder = async (path: string, name: string): Promise<CreateFolderResponse> => {
  const result = await bunnyService.createFolder(path, name)

  if (!result.success || !result.data) {
    throw new AppError(result.error || 'Failed to create folder', HTTP_STATUS.BAD_REQUEST)
  }

  return { path: result.data.path }
}

// Upload files
interface FileToUpload {
  name: string
  type: string
  size: number
  arrayBuffer: () => Promise<ArrayBuffer>
}

const uploadFiles = async (path: string, files: FileToUpload[]): Promise<UploadResult> => {
  // Check max files limit
  if (files.length > mediaConfig.maxFilesPerUpload) {
    throw new AppError(
      mediaMessages.TOO_MANY_FILES.replace('{max}', String(mediaConfig.maxFilesPerUpload)),
      HTTP_STATUS.BAD_REQUEST
    )
  }

  const uploaded: UploadResult['uploaded'] = []
  const failed: UploadResult['failed'] = []

  for (const file of files) {
    // Check mime type
    if (!isAllowedMimeType(file.type)) {
      failed.push({ name: file.name, error: mediaMessages.FILE_TYPE_NOT_ALLOWED })
      continue
    }

    // Check file size
    const maxSize = getMaxSizeForType(file.type)
    if (file.size > maxSize) {
      const maxSizeMB = Math.round(maxSize / (1024 * 1024))
      failed.push({ name: file.name, error: `${mediaMessages.FILE_SIZE_EXCEEDED} (${maxSizeMB}MB)` })
      continue
    }

    // Upload file
    const buffer = Buffer.from(await file.arrayBuffer())
    const result = await bunnyService.uploadFile(path, buffer, file.name)

    if (result.success && result.data) {
      uploaded.push({
        name: file.name,
        path: result.data.path,
        url: result.data.url,
        size: file.size,
      })
    } else {
      failed.push({ name: file.name, error: result.error || 'Upload failed' })
    }
  }

  return { uploaded, failed }
}

// Delete files
const deleteFiles = async (paths: string[]): Promise<DeleteResult> => {
console.log('deleteFiles called with paths:', paths)

  const deleted: string[] = []
  const failed: DeleteResult['failed'] = []

  for (const path of paths) {
    const result = await bunnyService.deleteFile(path)

    if (result.success) {
      deleted.push(path)
    } else {
      failed.push({ path, error: result.error || 'Delete failed' })
    }
  }

  return { deleted, failed }
}

// Delete folder
const deleteFolder = async (path: string): Promise<void> => {
  const result = await bunnyService.deleteFolder(path)

  if (!result.success) {
    throw new AppError(result.error || 'Failed to delete folder', HTTP_STATUS.BAD_REQUEST)
  }
}

// Download file
const downloadFile = async (path: string) => {
  const result = await bunnyService.downloadFile(path)

  if (!result.success || !result.data) {
    throw new AppError(result.error || mediaMessages.FILE_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
  }

  return result.data
}

// Download folder as ZIP
const downloadFolder = async (path: string) => {
  const result = await bunnyService.downloadFolder(path)

  if (!result.success || !result.data) {
    throw new AppError(result.error || mediaMessages.FOLDER_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
  }

  return result.data
}

export const mediaService = {
  listItems,
  createFolder,
  uploadFiles,
  deleteFiles,
  deleteFolder,
  downloadFile,
  downloadFolder,
}
