import { z } from 'zod'

// Content schema for lifetime exchange
export const lifetimeExchangeContentSchema = z.object({
  htmlText: z.string().min(1, 'Content is required'),
})

// Update request schema
export const updateLifetimeExchangeSchema = z.object({
  content: lifetimeExchangeContentSchema,
})

export type LifetimeExchangeContentInput = z.infer<typeof lifetimeExchangeContentSchema>
export type UpdateLifetimeExchangeInput = z.infer<typeof updateLifetimeExchangeSchema>
