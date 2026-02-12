import { z } from 'zod'

// Content schema for terms and conditions
export const termsConditionsContentSchema = z.object({
  htmlText: z.string().min(1, 'Content is required'),
})

// Update request schema
export const updateTermsConditionsSchema = z.object({
  content: termsConditionsContentSchema,
})

export type TermsConditionsContentInput = z.infer<typeof termsConditionsContentSchema>
export type UpdateTermsConditionsInput = z.infer<typeof updateTermsConditionsSchema>
