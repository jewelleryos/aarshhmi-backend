import { z } from 'zod'

// Content schema for return policy
export const returnPolicyContentSchema = z.object({
  htmlText: z.string().min(1, 'Content is required'),
})

// Update request schema
export const updateReturnPolicySchema = z.object({
  content: returnPolicyContentSchema,
})

export type ReturnPolicyContentInput = z.infer<typeof returnPolicyContentSchema>
export type UpdateReturnPolicyInput = z.infer<typeof updateReturnPolicySchema>
