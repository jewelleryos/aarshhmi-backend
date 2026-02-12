import { z } from 'zod'

// Content schema for cancellation policy
export const cancellationPolicyContentSchema = z.object({
  htmlText: z.string().min(1, 'Content is required'),
})

// Update request schema
export const updateCancellationPolicySchema = z.object({
  content: cancellationPolicyContentSchema,
})

export type CancellationPolicyContentInput = z.infer<typeof cancellationPolicyContentSchema>
export type UpdateCancellationPolicyInput = z.infer<typeof updateCancellationPolicySchema>
