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

// Create schema
export const createTagGroupSchema = z.object({
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
  media_url: z.string().nullable().optional(),
  media_alt_text: z.string().max(255, 'Alt text must be 255 characters or less').nullable().optional(),
  is_filterable: z.boolean().default(true),
  filter_display_name: z.string().max(100, 'Filter display name must be 100 characters or less').nullable().optional(),
  rank: z.number().int().min(0, 'Rank must be a positive number').default(0),
  status: z.boolean().default(true),
  metadata: z.record(z.unknown()).default({}),
})

// Update schema
export const updateTagGroupSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less').optional(),
  slug: z
    .string()
    .max(100, 'Slug must be 100 characters or less')
    .transform((val) => val.toLowerCase().trim().replace(/\s+/g, '-'))
    .optional(),
  description: z.string().nullable().optional(),
  media_url: z.string().nullable().optional(),
  media_alt_text: z.string().max(255, 'Alt text must be 255 characters or less').nullable().optional(),
  is_filterable: z.boolean().optional(),
  filter_display_name: z.string().max(100, 'Filter display name must be 100 characters or less').nullable().optional(),
  rank: z.number().int().min(0, 'Rank must be a positive number').optional(),
  status: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
})

// SEO update schema
export const updateTagGroupSeoSchema = z.object({
  meta_title: z.string().max(200).nullable().optional(),
  meta_keywords: z.string().max(500).nullable().optional(),
  meta_description: z.string().max(500).nullable().optional(),
  meta_robots: z.string().max(100).nullable().optional(),
  meta_canonical: z.string().nullable().optional(),
  og_title: z.string().max(200).nullable().optional(),
  og_site_name: z.string().max(200).nullable().optional(),
  og_description: z.string().max(500).nullable().optional(),
  og_url: z.string().nullable().optional(),
  og_image_url: z.string().nullable().optional(),
  twitter_card_title: z.string().max(200).nullable().optional(),
  twitter_card_site_name: z.string().max(200).nullable().optional(),
  twitter_card_description: z.string().max(500).nullable().optional(),
  twitter_url: z.string().nullable().optional(),
  twitter_media: z.string().nullable().optional(),
})

// ID schema
export const tagGroupIdSchema = z.object({
  id: z.string().min(1, 'ID is required'),
})
