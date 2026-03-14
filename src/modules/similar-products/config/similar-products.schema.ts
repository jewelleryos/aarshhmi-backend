import { z } from 'zod'

export const updateManualPicksSchema = z.object({
  manual_product_ids: z.array(z.string().min(1)).max(10),
  removed_system_product_ids: z.array(z.string().min(1)).max(10).optional(),
})

export const updateScoringConfigSchema = z.object({
  weight: z.number().min(0).max(100).optional(),
  is_active: z.boolean().optional(),
})
