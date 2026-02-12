import { z } from 'zod'
import { sizeChartValueMessages } from './size-chart-values.messages'

// Create schema - NO is_default
export const createSizeChartValueSchema = z.object({
  size_chart_group_id: z.string().min(1, sizeChartValueMessages.GROUP_ID_REQUIRED),
  name: z.string().min(1, sizeChartValueMessages.NAME_REQUIRED).max(100),
  description: z.string().max(255).nullable().optional(),
  difference: z.number({ required_error: sizeChartValueMessages.DIFFERENCE_REQUIRED }),
})

// Update schema - NO is_default
export const updateSizeChartValueSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(255).nullable().optional(),
  difference: z.number().optional(),
})
