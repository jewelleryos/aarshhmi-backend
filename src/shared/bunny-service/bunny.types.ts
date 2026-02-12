// Bunny API response for file/folder listing
export interface BunnyFile {
  Guid: string
  StorageZoneName: string
  Path: string
  ObjectName: string
  Length: number
  LastChanged: string
  ServerId: number
  ArrayNumber: number
  IsDirectory: boolean
  UserId: string
  ContentType: string
  DateCreated: string
  StorageZoneId: number
  Checksum: string
  ReplicatedZones: string
}

// Service response types
export interface BunnyResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

export interface UploadData {
  path: string
  url: string
}

export interface DownloadData {
  buffer: Buffer
  contentType: string
  filename: string
}
