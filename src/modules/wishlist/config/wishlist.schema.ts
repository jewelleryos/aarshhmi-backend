import { z } from 'zod'

export const toggleWishlistSchema = z.object({
  product_id: z.string().min(1, 'product_id is required'),
  variant_id: z.string().min(1, 'variant_id is required'),
  wishlist_id: z.string().optional(),
})

export const checkWishlistSchema = z.object({
  variant_ids: z.array(z.string().min(1)).min(1, 'variant_ids must have at least one item'),
  wishlist_id: z.string().optional(),
})

export const mergeWishlistSchema = z.object({
  wishlist_id: z.string().min(1, 'wishlist_id is required'),
})
