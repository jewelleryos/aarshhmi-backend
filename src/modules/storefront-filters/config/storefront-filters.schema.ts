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

// Schema for creating a price filter range
export const createPriceFilterRangeSchema = z
  .object({
    display_name: z.string().min(1).max(100),
    min_price: z.number().int().nonnegative(),
    max_price: z.number().int().positive(),
    media_url: z.string().nullable().optional(),
    media_alt_text: z.string().max(255).nullable().optional(),
    rank: z.number().int().nonnegative().optional().default(0),
    status: z.boolean().optional().default(true),
  })
  .refine((data) => data.max_price > data.min_price, {
    message: 'max_price must be greater than min_price',
    path: ['max_price'],
  })

export type CreatePriceFilterRangeInput = z.infer<typeof createPriceFilterRangeSchema>

// Schema for updating a price filter range
export const updatePriceFilterRangeSchema = z.object({
  display_name: z.string().min(1).max(100).optional(),
  min_price: z.number().int().nonnegative().optional(),
  max_price: z.number().int().positive().optional(),
  media_url: z.string().nullable().optional(),
  media_alt_text: z.string().max(255).nullable().optional(),
  rank: z.number().int().nonnegative().optional(),
  status: z.boolean().optional(),
})

export type UpdatePriceFilterRangeInput = z.infer<typeof updatePriceFilterRangeSchema>

// Schema for updating a sort-by option (only admin-editable fields)
export const updateSortByOptionSchema = z.object({
  label: z.string().min(1).max(100).optional(),
  is_active: z.boolean().optional(),
  rank: z.number().int().nonnegative().optional(),
})

export type UpdateSortByOptionInput = z.infer<typeof updateSortByOptionSchema>

// Schema for updating a group config
export const updateGroupConfigSchema = z.object({
  display_name: z.string().max(100).nullable().optional(),
  is_filterable: z.boolean().optional(),
  rank: z.number().int().nonnegative().optional(),
})

export type UpdateGroupConfigInput = z.infer<typeof updateGroupConfigSchema>
