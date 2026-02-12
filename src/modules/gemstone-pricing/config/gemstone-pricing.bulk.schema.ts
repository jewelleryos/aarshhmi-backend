import { z } from 'zod'

// Carat validation (max 4 decimal places)
const caratSchema = z
  .number()
  .min(0, 'Must be non-negative')
  .refine(
    (val) => {
      const decimals = (val.toString().split('.')[1] || '').length
      return decimals <= 4
    },
    { message: 'Maximum 4 decimal places allowed' }
  )

// Schema for validating a CREATE row from CSV
export const bulkCreateRowSchema = z
  .object({
    gemstone_type: z.string().min(1, 'Gemstone type is required'),
    shape: z.string().min(1, 'Shape is required'),
    quality: z.string().min(1, 'Quality is required'),
    color: z.string().min(1, 'Color is required'),
    from: caratSchema,
    to: caratSchema,
    price: z.number().min(0, 'Price must be non-negative'),
  })
  .refine((data) => data.from < data.to, {
    message: 'From must be less than To',
    path: ['from'],
  })

// Schema for validating an UPDATE row from CSV
export const bulkUpdateRowSchema = z.object({
  id: z.string().min(1, 'ID is required'),
  gemstone_type: z.string().min(1, 'Gemstone type is required'),
  shape: z.string().min(1, 'Shape is required'),
  quality: z.string().min(1, 'Quality is required'),
  color: z.string().min(1, 'Color is required'),
  from: z.number().min(0),
  to: z.number().min(0),
  price: z.number().min(0, 'Price must be non-negative'),
})

// File constraints
export const BULK_FILE_CONSTRAINTS = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_ROWS: 10000,
  ALLOWED_EXTENSIONS: ['.csv'],
} as const

// Type exports for use in service
export type BulkCreateRowInput = z.infer<typeof bulkCreateRowSchema>
export type BulkUpdateRowInput = z.infer<typeof bulkUpdateRowSchema>
