import { z } from 'zod'

// Content schema for shipping policy
export const shippingPolicyContentSchema = z.object({
  htmlText: z.string().min(1, 'Content is required'),
})

// Update request schema
export const updateShippingPolicySchema = z.object({
  content: shippingPolicyContentSchema,
})

export type ShippingPolicyContentInput = z.infer<typeof shippingPolicyContentSchema>
export type UpdateShippingPolicyInput = z.infer<typeof updateShippingPolicySchema>
