export const mediaConfig = {
  // Allowed file types with size limits
  allowedTypes: {
    image: {
      extensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'],
      maxSize: 10 * 1024 * 1024, // 10MB
      mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'],
    },
    video: {
      extensions: ['.mp4', '.webm', '.mov'],
      maxSize: 100 * 1024 * 1024, // 100MB
      mimeTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
    },
  },

  // Max files per upload request
  maxFilesPerUpload: 10,
}

// Get all allowed extensions
export const getAllowedExtensions = (): string[] => {
  return [
    ...mediaConfig.allowedTypes.image.extensions,
    ...mediaConfig.allowedTypes.video.extensions,
  ]
}

// Get all allowed mime types
export const getAllowedMimeTypes = (): string[] => {
  return [
    ...mediaConfig.allowedTypes.image.mimeTypes,
    ...mediaConfig.allowedTypes.video.mimeTypes,
  ]
}

// Get max size for a file type
export const getMaxSizeForType = (mimeType: string): number => {
  if (mediaConfig.allowedTypes.image.mimeTypes.includes(mimeType)) {
    return mediaConfig.allowedTypes.image.maxSize
  }
  if (mediaConfig.allowedTypes.video.mimeTypes.includes(mimeType)) {
    return mediaConfig.allowedTypes.video.maxSize
  }
  return 0
}

// Check if file type is allowed
export const isAllowedMimeType = (mimeType: string): boolean => {
  return getAllowedMimeTypes().includes(mimeType)
}

// Check if extension is allowed
export const isAllowedExtension = (extension: string): boolean => {
  return getAllowedExtensions().includes(extension.toLowerCase())
}
