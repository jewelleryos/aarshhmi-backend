import { z } from 'zod'

// Schema for updating filter group
export const updateFilterGroupSchema = z.object({
  filter_display_name: z.string().max(100).nullable().optional(),
  media_url: z.string().nullable().optional(),
  media_alt_text: z.string().max(255).nullable().optional(),
  is_filterable: z.boolean().optional(),
  rank: z.number().int().nonnegative().optional(),
})

export type UpdateFilterGroupInput = z.infer<typeof updateFilterGroupSchema>

// Schema for updating filter value
export const updateFilterValueSchema = z.object({
  filter_display_name: z.string().max(100).nullable().optional(),
  media_url: z.string().nullable().optional(),
  media_alt_text: z.string().max(255).nullable().optional(),
  is_filterable: z.boolean().optional(),
  rank: z.number().int().nonnegative().optional(),
})

export type UpdateFilterValueInput = z.infer<typeof updateFilterValueSchema>

// Schema for ID parameter
export const idParamSchema = z.object({
  id: z.string().min(1),
})

// Schema for group and value ID parameters
export const groupValueIdParamSchema = z.object({
  id: z.string().min(1),
  valueId: z.string().min(1),
})
