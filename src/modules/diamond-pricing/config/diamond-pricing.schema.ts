import { z } from 'zod'

// Validate decimal precision (max 4 decimal places)
const caratSchema = z
  .number()
  .min(0, 'Carat must be non-negative')
  .refine(
    (val) => {
      const decimals = (val.toString().split('.')[1] || '').length
      return decimals <= 4
    },
    { message: 'Maximum 4 decimal places allowed' }
  )

export const createDiamondPriceSchema = z
  .object({
    stone_shape_id: z.string().min(1, 'Shape is required'),
    stone_quality_id: z.string().min(1, 'Clarity/Color is required'),
    ct_from: caratSchema,
    ct_to: caratSchema,
    price: z.number().int().min(0, 'Price must be non-negative'),
    status: z.boolean().default(true),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((data) => data.ct_from < data.ct_to, {
    message: 'Carat from must be less than carat to',
    path: ['ct_from'],
  })

export const updateDiamondPriceSchema = z
  .object({
    stone_shape_id: z.string().min(1, 'Shape is required').optional(),
    stone_quality_id: z.string().min(1, 'Clarity/Color is required').optional(),
    ct_from: caratSchema.optional(),
    ct_to: caratSchema.optional(),
    price: z.number().int().min(0, 'Price must be non-negative').optional(),
    status: z.boolean().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .refine(
    (data) => {
      if (data.ct_from !== undefined && data.ct_to !== undefined) {
        return data.ct_from < data.ct_to
      }
      return true
    },
    {
      message: 'Carat from must be less than carat to',
      path: ['ct_from'],
    }
  )

export const diamondPriceIdSchema = z.object({
  id: z.string().min(1, 'ID is required'),
})

export const diamondPriceFiltersSchema = z.object({
  stone_shape_id: z.string().optional(),
  stone_quality_id: z.string().optional(),
})
