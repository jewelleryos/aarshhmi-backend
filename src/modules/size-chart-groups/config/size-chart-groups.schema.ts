import { z } from 'zod'
import { sizeChartGroupMessages } from './size-chart-groups.messages'

// Create schema - includes first value
export const createSizeChartGroupSchema = z.object({
  name: z.string().min(1, sizeChartGroupMessages.NAME_REQUIRED).max(100),
  value_name: z.string().min(1, sizeChartGroupMessages.VALUE_NAME_REQUIRED).max(100),
  value_description: z.string().max(255).nullable().optional(),
  value_difference: z.number({ required_error: sizeChartGroupMessages.VALUE_DIFFERENCE_REQUIRED }),
})

// Update schema - only name
export const updateSizeChartGroupSchema = z.object({
  name: z.string().min(1, sizeChartGroupMessages.NAME_REQUIRED).max(100),
})
