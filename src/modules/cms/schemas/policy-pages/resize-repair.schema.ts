import { z } from 'zod'

// Content schema for resize and repair policy
export const resizeRepairContentSchema = z.object({
  htmlText: z.string().min(1, 'Content is required'),
})

// Update request schema
export const updateResizeRepairSchema = z.object({
  content: resizeRepairContentSchema,
})

export type ResizeRepairContentInput = z.infer<typeof resizeRepairContentSchema>
export type UpdateResizeRepairInput = z.infer<typeof updateResizeRepairSchema>
