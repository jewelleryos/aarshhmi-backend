import axios from 'axios'
import { bunnyConfig } from './bunny.config'
import type { BunnyFile, BunnyResponse, UploadData, DownloadData } from './bunny.types'

const { storageName, storageKey, storageApi, pullApi, accessKey } = bunnyConfig

// Sanitize path - remove leading slashes
const sanitizePath = (path: string): string => {
  let result = path
  while (result[0] === '/') {
    result = result.slice(1)
  }
  return result
}

// Sanitize filename - remove special chars, lowercase, preserve extension
const sanitizeFilename = (name: string): string => {
  const trimmed = name.trim()
  const lastDotIndex = trimmed.lastIndexOf('.')

  // No extension - sanitize entire name
  if (lastDotIndex === -1 || lastDotIndex === 0) {
    return trimmed
      .replace(/\s+/g, '-')
      .replace(/[`~!@#$%^&*()_|+=?;:'",<>{}\[\]\\]/gi, '-')
      .replace(/-+/g, '-')
      .toLowerCase()
  }

  // Split name and extension
  const baseName = trimmed.slice(0, lastDotIndex)
  const extension = trimmed.slice(lastDotIndex + 1)

  // Sanitize base name only, preserve extension
  const sanitizedBase = baseName
    .replace(/\s+/g, '-')
    .replace(/[`~!@#$%^&*()_|+=?;:'",.<>{}\[\]\\]/gi, '-')
    .replace(/-+/g, '-')
    .toLowerCase()

  return `${sanitizedBase}.${extension.toLowerCase()}`
}

// Get public CDN URL for a file
export const getPublicUrl = (path: string): string => {
  const cleanPath = sanitizePath(path)
  return `${pullApi}${cleanPath}`
}

// List files and folders in a directory
export const listFiles = async (path: string): Promise<BunnyResponse<BunnyFile[]>> => {
  try {
    const cleanPath = sanitizePath(path)
    const url = `${storageApi}${storageName}${cleanPath}/`

    const response = await axios({
      method: 'GET',
      url,
      headers: { AccessKey: storageKey },
    })

    return { success: true, data: response.data }
  } catch (error) {
    const message = axios.isAxiosError(error)
      ? error.response?.data?.message || error.message
      : 'Unknown error'
    return { success: false, error: message }
  }
}

// Upload a file
export const uploadFile = async (
  folder: string,
  file: Buffer,
  filename: string
): Promise<BunnyResponse<UploadData>> => {
  try {
    const cleanFolder = sanitizePath(folder)
    const cleanFilename = sanitizeFilename(filename)
    const filePath = `${cleanFolder}/${cleanFilename}`
    const url = `${storageApi}${storageName}${filePath}`

    await axios({
      method: 'PUT',
      url,
      headers: { AccessKey: storageKey },
      data: file,
    })

    // Purge CDN cache for the new file
    await purgeCache(filePath)

    return {
      success: true,
      data: {
        path: filePath,
        url: getPublicUrl(filePath),
      },
    }
  } catch (error) {
    const message = axios.isAxiosError(error)
      ? error.response?.data?.message || error.message
      : 'Unknown error'
    return { success: false, error: message }
  }
}

// Delete a file
export const deleteFile = async (path: string): Promise<BunnyResponse> => {
  try {
    let cleanPath = sanitizePath(path)
    // Remove trailing slash for files
    while (cleanPath[cleanPath.length - 1] === '/') {
      cleanPath = cleanPath.slice(0, -1)
    }

    const url = `${storageApi}${storageName}${cleanPath}`

    await axios({
      method: 'DELETE',
      url,
      headers: { AccessKey: storageKey },
    })

    // Purge CDN cache
    await purgeCache(cleanPath)

    return { success: true, message: 'File deleted successfully' }
  } catch (error) {
    const message = axios.isAxiosError(error)
      ? error.response?.data?.message || error.message
      : 'Unknown error'
    return { success: false, error: message }
  }
}

// Delete a folder (recursive - deletes all contents)
export const deleteFolder = async (path: string): Promise<BunnyResponse> => {
  try {
    let cleanPath = sanitizePath(path)
    // Remove trailing slash first
    while (cleanPath[cleanPath.length - 1] === '/') {
      cleanPath = cleanPath.slice(0, -1)
    }

    // Add trailing slash for folder delete
    const url = `${storageApi}${storageName}${cleanPath}/`

    await axios({
      method: 'DELETE',
      url,
      headers: { AccessKey: storageKey },
    })

    return { success: true, message: 'Folder deleted successfully' }
  } catch (error) {
    const message = axios.isAxiosError(error)
      ? error.response?.data?.message || error.message
      : 'Unknown error'
    return { success: false, error: message }
  }
}

// Create a folder
export const createFolder = async (path: string, name: string): Promise<BunnyResponse<{ path: string }>> => {
  try {
    const cleanPath = sanitizePath(path)
    const cleanName = sanitizeFilename(name)
    const folderPath = cleanPath ? `${cleanPath}/${cleanName}` : cleanName
    const url = `${storageApi}${storageName}${folderPath}/`

    await axios({
      method: 'PUT',
      url,
      headers: { AccessKey: storageKey },
    })

    return { success: true, data: { path: folderPath } }
  } catch (error) {
    const message = axios.isAxiosError(error)
      ? error.response?.data?.message || error.message
      : 'Unknown error'
    return { success: false, error: message }
  }
}

// Download a file
export const downloadFile = async (path: string): Promise<BunnyResponse<DownloadData>> => {
  try {
    let cleanPath = sanitizePath(path)
    while (cleanPath[cleanPath.length - 1] === '/') {
      cleanPath = cleanPath.slice(0, -1)
    }

    const url = `${storageApi}${storageName}${cleanPath}`

    const response = await axios({
      method: 'GET',
      url,
      headers: { AccessKey: storageKey },
      responseType: 'arraybuffer',
    })

    const buffer = Buffer.from(response.data)
    const contentType = response.headers['content-type'] || 'application/octet-stream'
    const filename = cleanPath.split('/').pop() || 'download'

    return {
      success: true,
      data: { buffer, contentType, filename },
    }
  } catch (error) {
    const message = axios.isAxiosError(error)
      ? error.response?.data?.message || error.message
      : 'Unknown error'
    return { success: false, error: message }
  }
}

// Download folder as ZIP
export const downloadFolder = async (path: string): Promise<BunnyResponse<DownloadData>> => {
  try {
    let cleanPath = sanitizePath(path)
    while (cleanPath[cleanPath.length - 1] === '/') {
      cleanPath = cleanPath.slice(0, -1)
    }

    const url = `${storageApi}${storageName}`

    const response = await axios({
      method: 'POST',
      url,
      headers: {
        AccessKey: storageKey,
        'Content-Type': 'application/json',
      },
      data: {
        RootPath: `/${storageName}`,
        Paths: [`/${storageName}${cleanPath}/`],
      },
      responseType: 'arraybuffer',
    })

    const buffer = Buffer.from(response.data)
    const filename = cleanPath.split('/').pop() || 'download'

    return {
      success: true,
      data: {
        buffer,
        contentType: 'application/zip',
        filename: `${filename}.zip`,
      },
    }
  } catch (error) {
    const message = axios.isAxiosError(error)
      ? error.response?.data?.message || error.message
      : 'Unknown error'
    return { success: false, error: message }
  }
}

// Purge CDN cache for a URL
export const purgeCache = async (path: string): Promise<BunnyResponse> => {
  try {
    const cdnUrl = getPublicUrl(path)
    const url = `https://api.bunny.net/purge?url=${encodeURIComponent(cdnUrl)}`

    await axios({
      method: 'POST',
      url,
      headers: { AccessKey: accessKey },
    })

    return { success: true, message: 'Cache purged successfully' }
  } catch (error) {
    const message = axios.isAxiosError(error)
      ? error.response?.data?.message || error.message
      : 'Unknown error'
    return { success: false, error: message }
  }
}

// Export all functions as bunnyService object
export const bunnyService = {
  listFiles,
  uploadFile,
  deleteFile,
  deleteFolder,
  createFolder,
  downloadFile,
  downloadFolder,
  purgeCache,
  getPublicUrl,
}
