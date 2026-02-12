import { z } from 'zod'
import { categoryMessages } from './categories.messages'

// Create schema
export const createCategorySchema = z.object({
  name: z.string().min(1, categoryMessages.NAME_REQUIRED).max(100),
  slug: z.string().max(100).optional(),
  description: z.string().nullable().optional(),
  parent_category_id: z.string().nullable().optional(),
  media_url: z.string().nullable().optional(),
  media_alt_text: z.string().max(255).nullable().optional(),
  is_filterable: z.boolean().optional().default(true),
  filter_display_name: z.string().max(100).nullable().optional(),
  rank: z.number().int().min(0).optional().default(0),
  status: z.boolean().optional().default(true),
  metadata: z.record(z.unknown()).optional().default({}),
})

// Update schema
export const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().max(100).optional(),
  description: z.string().nullable().optional(),
  parent_category_id: z.string().nullable().optional(),
  media_url: z.string().nullable().optional(),
  media_alt_text: z.string().max(255).nullable().optional(),
  is_filterable: z.boolean().optional(),
  filter_display_name: z.string().max(100).nullable().optional(),
  rank: z.number().int().min(0).optional(),
  status: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
})

// Update SEO schema
export const updateCategorySeoSchema = z.object({
  meta_title: z.string().max(200).nullable().optional(),
  meta_keywords: z.string().max(500).nullable().optional(),
  meta_description: z.string().max(500).nullable().optional(),
  meta_robots: z.string().max(100).nullable().optional(),
  meta_canonical: z.string().url().nullable().optional(),
  og_title: z.string().max(200).nullable().optional(),
  og_site_name: z.string().max(200).nullable().optional(),
  og_description: z.string().max(500).nullable().optional(),
  og_url: z.string().url().nullable().optional(),
  og_image_url: z.string().url().nullable().optional(),
  twitter_card_title: z.string().max(200).nullable().optional(),
  twitter_card_site_name: z.string().max(200).nullable().optional(),
  twitter_card_description: z.string().max(500).nullable().optional(),
  twitter_url: z.string().url().nullable().optional(),
  twitter_media: z.string().url().nullable().optional(),
})
