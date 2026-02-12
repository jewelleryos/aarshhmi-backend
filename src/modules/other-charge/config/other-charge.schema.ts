import { z } from 'zod'

export const createOtherChargeSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or less'),
  description: z
    .string()
    .max(500, 'Description must be 500 characters or less')
    .nullable()
    .optional(),
  amount: z
    .number()
    .min(0, 'Amount must be non-negative'),
  metadata: z.record(z.unknown()).optional(),
})

export const updateOtherChargeSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or less')
    .optional(),
  description: z
    .string()
    .max(500, 'Description must be 500 characters or less')
    .nullable()
    .optional(),
  amount: z
    .number()
    .min(0, 'Amount must be non-negative')
    .optional(),
  metadata: z.record(z.unknown()).optional(),
})
