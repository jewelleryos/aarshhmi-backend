import { z } from 'zod'

export const cmsSectionCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  slug: z.string().min(1, 'Slug is required').max(255),
  content: z.record(z.string(), z.unknown()).default({}),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const cmsSectionUpdateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  content: z.record(z.string(), z.unknown()),
  metadata: z.record(z.string(), z.unknown()).optional(),
})
