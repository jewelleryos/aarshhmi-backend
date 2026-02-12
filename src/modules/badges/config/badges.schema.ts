import { z } from 'zod'
import { badgeMessages } from './badges.messages'

// Create schema - all fields required except status and metadata
export const createBadgeSchema = z.object({
  name: z.string().min(1, badgeMessages.NAME_REQUIRED).max(100),
  slug: z.string().min(1, badgeMessages.SLUG_REQUIRED).max(100),
  bg_color: z.string().min(1, badgeMessages.BG_COLOR_REQUIRED).max(100),
  font_color: z.string().min(1, badgeMessages.FONT_COLOR_REQUIRED).max(100),
  position: z.number().int().min(1).max(6, badgeMessages.INVALID_POSITION),
  status: z.boolean().optional().default(true),
  metadata: z.record(z.unknown()).optional().default({}),
})

// Update schema
export const updateBadgeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(100).optional(),
  bg_color: z.string().min(1).max(100).optional(),
  font_color: z.string().min(1).max(100).optional(),
  position: z.number().int().min(1).max(6).optional(),
  status: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
})
