import { z } from 'zod'

// Helper to generate slug from name
const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export const createGemstoneTypeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  slug: z
    .string()
    .max(100, 'Slug must be 100 characters or less')
    .optional()
    .transform((val, ctx) => {
      // If slug provided, use it; otherwise generate from name
      if (val && val.trim()) {
        return val.toLowerCase().trim().replace(/\s+/g, '-')
      }
      // Get name from parent to generate slug
      const name = (ctx as any).parent?.name
      return name ? generateSlug(name) : ''
    }),
  description: z.string().nullable().optional(),
  image_url: z.string().nullable().optional(),
  image_alt_text: z.string().max(255, 'Alt text must be 255 characters or less').nullable().optional(),
  status: z.boolean().default(true),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const updateGemstoneTypeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less').optional(),
  slug: z
    .string()
    .max(100, 'Slug must be 100 characters or less')
    .transform((val) => val.toLowerCase().trim().replace(/\s+/g, '-'))
    .optional(),
  description: z.string().nullable().optional(),
  image_url: z.string().nullable().optional(),
  image_alt_text: z.string().max(255, 'Alt text must be 255 characters or less').nullable().optional(),
  status: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const gemstoneTypeIdSchema = z.object({
  id: z.string().min(1, 'ID is required'),
})
