import { z } from 'zod'

// Single luminique collection item schema
export const luminiqueCollectionItemSchema = z.object({
  id: z.string().min(1, 'Item ID is required'),
  image_url: z.string().min(1, 'Image is required'),
  image_alt_text: z.string().max(255).optional().default(''),
  redirect_url: z.string().url({ message: 'Redirect URL must be a valid URL' }),
  rank: z.number().int().min(0).default(0),
  status: z.boolean().default(true),
})

// Content schema for the entire section
export const luminiqueCollectionContentSchema = z.object({
  items: z.array(luminiqueCollectionItemSchema).default([]),
})

// Update request schema
export const updateLuminiqueCollectionSchema = z.object({
  content: luminiqueCollectionContentSchema,
})

export type LuminiqueCollectionItemInput = z.infer<typeof luminiqueCollectionItemSchema>
export type LuminiqueCollectionContentInput = z.infer<typeof luminiqueCollectionContentSchema>
export type UpdateLuminiqueCollectionInput = z.infer<typeof updateLuminiqueCollectionSchema>
