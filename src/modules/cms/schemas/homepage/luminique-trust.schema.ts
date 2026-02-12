import { z } from 'zod'

// Single trust item schema
export const luminiqueTrustItemSchema = z.object({
  id: z.string().min(1, 'Item ID is required'),
  image_url: z.string().min(1, 'Image is required'),
  image_alt_text: z.string().max(255).optional().default(''),
  text_one: z.string().min(1, 'Text one is required').max(255),
  text_two: z.string().min(1, 'Text two is required').max(255),
})

// Content schema with fixed 6 items
export const luminiqueTrustContentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  subtext: z.string().min(1, 'Subtext is required').max(500),
  trusts: z
    .array(luminiqueTrustItemSchema)
    .length(6, 'Exactly 6 trust items are required'),
})

// Update request schema
export const updateLuminiqueTrustSchema = z.object({
  content: luminiqueTrustContentSchema,
})

export type LuminiqueTrustItemInput = z.infer<typeof luminiqueTrustItemSchema>
export type LuminiqueTrustContentInput = z.infer<typeof luminiqueTrustContentSchema>
export type UpdateLuminiqueTrustInput = z.infer<typeof updateLuminiqueTrustSchema>
