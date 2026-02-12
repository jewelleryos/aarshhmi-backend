import { z } from 'zod'

// About Luminique content schema (static - no array)
export const aboutLuminiqueContentSchema = z.object({
  image_url: z.string().min(1, 'Image is required'),
  image_alt_text: z.string().max(255).optional().default(''),
  description: z.string().min(1, 'Description is required'),
  button_text: z.string().min(1, 'Button text is required'),
  redirect_url: z.string().url({ message: 'Redirect URL must be a valid URL' }),
})

// Update request schema
export const updateAboutLuminiqueSchema = z.object({
  content: aboutLuminiqueContentSchema,
})

export type AboutLuminiqueContentInput = z.infer<typeof aboutLuminiqueContentSchema>
export type UpdateAboutLuminiqueInput = z.infer<typeof updateAboutLuminiqueSchema>
