import { z } from 'zod'

export const createMakingChargeSchema = z
  .object({
    metal_type_id: z.string().min(1, 'Metal type is required'),
    from: z.number().positive('From weight must be positive'),
    to: z.number().positive('To weight must be positive'),
    is_fixed_pricing: z.boolean().default(true),
    amount: z.number().positive('Amount must be positive'),
    metadata: z.record(z.unknown()).optional().default({}),
  })
  .refine((data) => data.from < data.to, {
    message: 'From weight must be less than To weight',
    path: ['to'],
  })
  .refine((data) => data.is_fixed_pricing || data.amount <= 100, {
    message: 'Percentage cannot exceed 100',
    path: ['amount'],
  })

export const updateMakingChargeSchema = z
  .object({
    metal_type_id: z.string().min(1, 'Metal type is required').optional(),
    from: z.number().positive('From weight must be positive').optional(),
    to: z.number().positive('To weight must be positive').optional(),
    is_fixed_pricing: z.boolean().optional(),
    amount: z.number().positive('Amount must be positive').optional(),
    metadata: z.record(z.unknown()).optional(),
  })
  .refine(
    (data) => {
      // Only validate if both from and to are provided
      if (data.from !== undefined && data.to !== undefined) {
        return data.from < data.to
      }
      return true
    },
    {
      message: 'From weight must be less than To weight',
      path: ['to'],
    }
  )

export const makingChargeIdSchema = z.object({
  id: z.string().min(1, 'ID is required'),
})
