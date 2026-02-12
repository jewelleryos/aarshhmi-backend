import { z } from 'zod'

// Content schema for privacy policy
export const privacyPolicyContentSchema = z.object({
  htmlText: z.string().min(1, 'Content is required'),
})

// Update request schema
export const updatePrivacyPolicySchema = z.object({
  content: privacyPolicyContentSchema,
})

export type PrivacyPolicyContentInput = z.infer<typeof privacyPolicyContentSchema>
export type UpdatePrivacyPolicyInput = z.infer<typeof updatePrivacyPolicySchema>
