import { z } from 'zod'

const mediaItemSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['image', 'video']),
  path: z.string().min(1),
  alt_text: z.string().optional().default(''),
})

export const createProductReviewSchema = z.object({
  product_id: z.string().min(1, 'Product is required'),
  customer_name: z.string().min(1, 'Customer name is required').max(100),
  customer_image_path: z.string().nullable().optional(),
  title: z.string().min(1, 'Title is required').max(200),
  rating: z.number().int().min(1).max(5),
  description: z.string().min(1, 'Description is required').max(5000),
  order_date: z.string().min(1, 'Order date is required'),
  review_date: z.string().min(1, 'Review date is required'),
  media: z.array(mediaItemSchema).max(10).default([]),
  metadata: z.record(z.string(), z.unknown()).optional(),
  status: z.boolean().default(true),
})

export const updateProductReviewSchema = z.object({
  customer_name: z.string().min(1).max(100).optional(),
  customer_image_path: z.string().nullable().optional(),
  title: z.string().min(1).max(200).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  description: z.string().min(1).max(5000).optional(),
  order_date: z.string().optional(),
  review_date: z.string().optional(),
  media: z.array(mediaItemSchema).max(10).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  status: z.boolean().optional(),
})

export const updateApprovalSchema = z.object({
  approval_status: z.enum(['approved', 'rejected']),
})

export const updateStatusSchema = z.object({
  status: z.boolean(),
})
