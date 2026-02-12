import { z } from 'zod'

// Single category item schema
export const shopByCategoryItemSchema = z.object({
  id: z.string().min(1, 'Category ID is required'),
  title: z.string().min(1, 'Title is required').max(255),
  image_url: z.string().min(1, 'Image is required'),
  image_alt_text: z.string().max(255).optional().default(''),
  redirect_url: z.string().url({ message: 'Redirect URL must be a valid URL' }),
  rank: z.number().int().min(0).default(0),
  status: z.boolean().default(true),
})

// Content schema for shop-by-category section
export const shopByCategoryContentSchema = z.object({
  categories: z.array(shopByCategoryItemSchema).default([]),
})

// Update request schema
export const shopByCategoryUpdateSchema = z.object({
  content: shopByCategoryContentSchema,
})
