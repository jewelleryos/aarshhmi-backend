import { z } from 'zod'
import { FAQ_TYPES_ARRAY } from '../../config/faq.constants'

// FAQ item schema
export const faqItemSchema = z.object({
  id: z.string().min(1, 'ID is required'),
  type: z.enum(FAQ_TYPES_ARRAY as [string, ...string[]], {
    errorMap: () => ({ message: 'Invalid FAQ type' }),
  }),
  question: z.string().min(1, 'Question is required'),
  answer: z.string().min(1, 'Answer is required'),
  rank: z.number().int().positive('Rank must be a positive integer'),
  status: z.boolean(),
})

// Content schema for FAQs
export const faqsContentSchema = z.object({
  items: z.array(faqItemSchema),
})

// Update request schema
export const updateFAQsSchema = z.object({
  content: faqsContentSchema,
})

export type FAQItemInput = z.infer<typeof faqItemSchema>
export type FAQsContentInput = z.infer<typeof faqsContentSchema>
export type UpdateFAQsInput = z.infer<typeof updateFAQsSchema>
