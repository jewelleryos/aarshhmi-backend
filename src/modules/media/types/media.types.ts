// Media item (file or folder)
export interface MediaItem {
  name: string
  path: string
  type: 'file' | 'folder'
  size: number
  contentType?: string
  url?: string
  lastModified: string
}

// List response
export interface MediaListResponse {
  path: string
  items: MediaItem[]
}

// Uploaded file info
export interface UploadedFile {
  name: string
  path: string
  url: string
  size: number
}

// Upload result
export interface UploadResult {
  uploaded: UploadedFile[]
  failed: { name: string; error: string }[]
}

// Delete result
export interface DeleteResult {
  deleted: string[]
  failed: { path: string; error: string }[]
}

// Create folder response
export interface CreateFolderResponse {
  path: string
}
