// Product module - Common/Base schema
import { z } from 'zod'

// Product status change schema
export const productStatusChangeSchema = z.object({
  status: z.enum(['draft', 'inactive', 'active', 'archived']),
})

export type ProductStatusChangeInput = z.infer<typeof productStatusChangeSchema>

// Variant stock update schema
export const variantStockUpdateSchema = z.object({
  stock_quantity: z
    .number()
    .int('Stock quantity must be a whole number')
    .nonnegative('Stock quantity cannot be negative'),
})

export type VariantStockUpdateInput = z.infer<typeof variantStockUpdateSchema>
