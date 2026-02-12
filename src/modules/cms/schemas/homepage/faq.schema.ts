import { z } from 'zod'

// Single FAQ item schema
export const faqItemSchema = z.object({
  id: z.string().min(1, 'Item ID is required'),
  question: z.string().min(1, 'Question is required').max(500),
  answer: z.string().min(1, 'Answer is required').max(2000),
  rank: z.number().int().min(0).default(0),
  status: z.boolean().default(true),
})

// Content schema for the entire section
export const faqContentSchema = z.object({
  items: z.array(faqItemSchema).default([]),
})

// Update request schema
export const updateFAQSchema = z.object({
  content: faqContentSchema,
})

export type FAQItemInput = z.infer<typeof faqItemSchema>
export type FAQContentInput = z.infer<typeof faqContentSchema>
export type UpdateFAQInput = z.infer<typeof updateFAQSchema>
