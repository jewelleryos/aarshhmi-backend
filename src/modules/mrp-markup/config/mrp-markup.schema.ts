import { z } from 'zod'

export const updateMrpMarkupSchema = z.object({
  diamond: z
    .number()
    .min(0, 'Diamond markup must be at least 0')
    .max(99999999.99, 'Diamond markup is too large')
    .optional(),
  gemstone: z
    .number()
    .min(0, 'Gemstone markup must be at least 0')
    .max(99999999.99, 'Gemstone markup is too large')
    .optional(),
  pearl: z
    .number()
    .min(0, 'Pearl markup must be at least 0')
    .max(99999999.99, 'Pearl markup is too large')
    .optional(),
  making_charge: z
    .number()
    .min(0, 'Making charge markup must be at least 0')
    .max(99999999.99, 'Making charge markup is too large')
    .optional(),
})
