import { z } from 'zod'

// Single banner item schema
export const heroMobileBannerItemSchema = z.object({
  id: z.string().min(1, 'Banner ID is required'),
  image_url: z.string().min(1, 'Image is required'),
  image_alt_text: z.string().max(255).optional().default(''),
  redirect_url: z.string().url({ message: 'Redirect URL must be a valid URL' }),
  rank: z.number().int().min(0).default(0),
  status: z.boolean().default(true),
})

// Content schema for hero-mobile-banner section
export const heroMobileBannerContentSchema = z.object({
  banners: z.array(heroMobileBannerItemSchema).default([]),
})

// Update request schema
export const heroMobileBannerUpdateSchema = z.object({
  content: heroMobileBannerContentSchema,
})
