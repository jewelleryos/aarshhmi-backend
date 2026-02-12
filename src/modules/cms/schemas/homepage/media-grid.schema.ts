import { z } from 'zod'

// Single media grid item schema
export const mediaGridItemSchema = z.object({
  id: z.string().min(1, 'Item ID is required'),
  media_url: z.string().min(1, 'Media is required'),
  media_alt_text: z.string().max(255).optional().default(''),
  redirect_url: z.string().url({ message: 'Redirect URL must be a valid URL' }),
  rank: z.number().int().min(0).default(0),
  status: z.boolean().default(true),
})

// Content schema for the entire section
export const mediaGridContentSchema = z.object({
  items: z.array(mediaGridItemSchema).default([]),
})

// Update request schema
export const updateMediaGridSchema = z.object({
  content: mediaGridContentSchema,
})

export type MediaGridItemInput = z.infer<typeof mediaGridItemSchema>
export type MediaGridContentInput = z.infer<typeof mediaGridContentSchema>
export type UpdateMediaGridInput = z.infer<typeof updateMediaGridSchema>
