import { z } from 'zod'

// Create folder schema
export const createFolderSchema = z.object({
  path: z.string().default(''),
  name: z.string().min(1, 'Folder name is required').max(100, 'Folder name too long'),
})

// Delete files schema
export const deleteFilesSchema = z.object({
  paths: z.array(z.string().min(1)).min(1, 'At least one path is required'),
})

// Types
export type CreateFolderInput = z.infer<typeof createFolderSchema>
export type DeleteFilesInput = z.infer<typeof deleteFilesSchema>
