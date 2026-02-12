# Bunny Storage Service - Implementation Plan

## Overview

A TypeScript service for interacting with Bunny.net Edge Storage API. This service will handle all file/folder operations for the Media Manager module.

---

## Environment Variables

```env
BUNNY_STORAGE_ZONE=luminique          # Storage zone name
BUNNY_STORAGE_KEY=xxx                 # Storage zone API key (from FTP & API Access)
BUNNY_STORAGE_REGION=sg               # Region code (de, uk, ny, la, sg, se, br, jh, syd)
BUNNY_CDN_URL=https://cdn.example.com # CDN pull zone URL for public access
BUNNY_API_KEY=xxx                     # Global API key (for cache purge only)
```

---

## File Structure

```
backend/src/shared/bunny-service/
├── index.ts              # Exports all functions and types
├── bunny.service.ts      # Main service with all operations
├── bunny.config.ts       # Configuration and constants
└── bunny.types.ts        # TypeScript interfaces
```

---

## Types & Interfaces

### BunnyFile (Response from List API)

```typescript
interface BunnyFile {
  Guid: string              // Unique identifier
  StorageZoneName: string   // Storage zone name
  Path: string              // Directory path
  ObjectName: string        // File/folder name
  Length: number            // File size in bytes (0 for folders)
  LastChanged: string       // ISO date string
  ServerId: number          // Server ID
  ArrayNumber: number       // Array number
  IsDirectory: boolean      // true = folder, false = file
  UserId: string            // User ID
  ContentType: string       // MIME type (empty for folders)
  DateCreated: string       // ISO date string
  StorageZoneId: number     // Storage zone ID
  Checksum: string          // File checksum (empty for folders)
  ReplicatedZones: string   // Replicated zone info
}
```

### Service Response Types

```typescript
interface ListResponse {
  success: boolean
  data: BunnyFile[]
  error?: string
}

interface UploadResponse {
  success: boolean
  data: {
    path: string      // Full path to uploaded file
    url: string       // CDN URL for public access
  }
  error?: string
}

interface DeleteResponse {
  success: boolean
  message: string
  error?: string
}

interface DownloadResponse {
  success: boolean
  data: {
    buffer: Buffer
    contentType: string
    filename: string
  }
  error?: string
}
```

---

## Functions

### 1. `listFiles(path: string)`

**Purpose:** List all files and folders in a directory

**How it works:**
1. Receive path (e.g., `/products/rings/`)
2. Normalize path (ensure leading slash, trailing slash for directories)
3. Make GET request to `{STORAGE_API}/{ZONE}/{path}/`
4. Return array of BunnyFile objects

**API Call:**
```
GET https://{region}.storage.bunnycdn.com/{storageZone}/{path}/
Headers: { AccessKey: {STORAGE_KEY} }
```

**Returns:** `ListResponse` with array of files/folders

---

### 2. `uploadFile(path: string, file: Buffer, filename: string)`

**Purpose:** Upload a file to specified path

**How it works:**
1. Receive destination path, file buffer, and filename
2. Sanitize filename (remove special chars, lowercase)
3. Determine file extension based on content type
4. Make PUT request with file buffer as body
5. Purge CDN cache for the new file
6. Return success with CDN URL

**API Call:**
```
PUT https://{region}.storage.bunnycdn.com/{storageZone}/{path}/{filename}
Headers: { AccessKey: {STORAGE_KEY}, Content-Type: application/octet-stream }
Body: file buffer
```

**Returns:** `UploadResponse` with path and CDN URL

---

### 3. `deleteFile(path: string)`

**Purpose:** Delete a single file

**How it works:**
1. Receive file path (e.g., `/products/ring.jpg`)
2. Normalize path (remove trailing slashes for files)
3. Make DELETE request
4. Purge CDN cache for deleted file
5. Return success/failure

**API Call:**
```
DELETE https://{region}.storage.bunnycdn.com/{storageZone}/{path}
Headers: { AccessKey: {STORAGE_KEY} }
```

**Returns:** `DeleteResponse`

---

### 4. `deleteFolder(path: string)`

**Purpose:** Delete a folder and ALL its contents (recursive)

**How it works:**
1. Receive folder path (e.g., `/products/old-collection/`)
2. Normalize path (ensure trailing slash for folders)
3. Make DELETE request
4. Bunny deletes folder and all contents recursively
5. Return success/failure

**API Call:**
```
DELETE https://{region}.storage.bunnycdn.com/{storageZone}/{path}/
Headers: { AccessKey: {STORAGE_KEY} }
```

**Returns:** `DeleteResponse`

**Warning:** This is destructive and recursive!

---

### 5. `createFolder(path: string, name: string)`

**Purpose:** Create a new empty folder

**How it works:**
1. Receive parent path and folder name
2. Sanitize folder name (remove special chars, lowercase, replace spaces with hyphens)
3. Make PUT request to path ending with `/`
4. Bunny auto-creates the folder structure

**API Call:**
```
PUT https://{region}.storage.bunnycdn.com/{storageZone}/{path}/{name}/
Headers: { AccessKey: {STORAGE_KEY} }
Body: empty
```

**Returns:** `{ success: boolean, path: string }`

---

### 6. `downloadFile(path: string)`

**Purpose:** Download a single file

**How it works:**
1. Receive file path
2. Make GET request to file URL
3. Return buffer with content type and filename

**API Call:**
```
GET https://{region}.storage.bunnycdn.com/{storageZone}/{path}
Headers: { AccessKey: {STORAGE_KEY} }
```

**Returns:** `DownloadResponse` with buffer, content type, filename

---

### 7. `downloadFolder(path: string)`

**Purpose:** Download folder as ZIP

**How it works:**
1. Receive folder path
2. Make POST request to storage zone root with folder paths
3. Bunny returns ZIP file containing all folder contents
4. Return ZIP buffer

**API Call:**
```
POST https://{region}.storage.bunnycdn.com/{storageZone}/
Headers: { AccessKey: {STORAGE_KEY}, Content-Type: application/json }
Body: {
  "RootPath": "/{storageZone}/",
  "Paths": ["/{storageZone}/{path}/"]
}
```

**Important:** Both RootPath and Paths MUST have leading AND trailing slashes

**Returns:** ZIP file buffer

---

### 8. `purgeCache(url: string)`

**Purpose:** Purge CDN cache for a specific URL

**How it works:**
1. Receive CDN URL to purge
2. Make POST request to Bunny purge API
3. Uses global API key (not storage key)

**API Call:**
```
POST https://api.bunny.net/purge?url={cdnUrl}
Headers: { AccessKey: {BUNNY_API_KEY} }
```

**Note:** This uses the global Bunny API key, not the storage zone key

---

### 9. `getPublicUrl(path: string)`

**Purpose:** Generate CDN URL for a file

**How it works:**
1. Receive file path
2. Combine with CDN base URL
3. Return public URL

**Returns:** `string` - Full CDN URL (e.g., `https://cdn.example.com/products/ring.jpg`)

---

## Helper Functions

### `sanitizePath(path: string)`
- Remove leading slashes
- Handle double slashes
- Normalize path format

### `sanitizeFilename(name: string)`
- Remove special characters
- Replace spaces with hyphens
- Convert to lowercase
- Preserve file extension

### `getStorageUrl()`
- Returns regional storage API URL based on configured region

---

## Regional Endpoints Map

```typescript
const STORAGE_ENDPOINTS = {
  de: 'storage.bunnycdn.com',      // Frankfurt (default)
  uk: 'uk.storage.bunnycdn.com',   // London
  ny: 'ny.storage.bunnycdn.com',   // New York
  la: 'la.storage.bunnycdn.com',   // Los Angeles
  sg: 'sg.storage.bunnycdn.com',   // Singapore
  se: 'se.storage.bunnycdn.com',   // Stockholm
  br: 'br.storage.bunnycdn.com',   // São Paulo
  jh: 'jh.storage.bunnycdn.com',   // Johannesburg
  syd: 'syd.storage.bunnycdn.com', // Sydney
}
```

---

## Error Handling

All functions should:
1. Catch errors and return structured response
2. Never throw - always return `{ success: false, error: message }`
3. Log errors for debugging
4. Handle common HTTP errors:
   - 401: Invalid API key
   - 404: File/folder not found
   - 400: Bad request (usually path issues)

---

## Usage Example

```typescript
import { bunnyService } from '@/shared/bunny-service'

// List files
const files = await bunnyService.listFiles('/products/')

// Upload file
const result = await bunnyService.uploadFile(
  '/products/rings/',
  fileBuffer,
  'diamond-ring.jpg'
)

// Delete file
await bunnyService.deleteFile('/products/rings/old-ring.jpg')

// Create folder
await bunnyService.createFolder('/products/', 'new-collection')

// Download file
const file = await bunnyService.downloadFile('/products/rings/ring.jpg')

// Download folder as ZIP
const zip = await bunnyService.downloadFolder('/products/rings/')
```

---

## Notes

1. **No rename/move API** - Must implement as copy + delete
2. **No server-side search** - List all files, filter on backend
3. **No bulk operations** - Loop through items individually
4. **Folder paths need trailing slash** - Files do not
5. **DELETE is recursive for folders** - Be careful!
