import { z } from 'zod'

export const addToCartSchema = z.object({
  product_id: z.string().min(1, 'product_id is required'),
  variant_id: z.string().min(1, 'variant_id is required'),
  size_chart_value_id: z.string().optional(),
  quantity: z.number().int().min(1).optional().default(1),
  cart_id: z.string().optional(),
})

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(1).optional(),
  size_chart_value_id: z.string().optional(),
  cart_id: z.string().optional(),
})

export const removeCartItemSchema = z.object({
  cart_id: z.string().optional(),
})

export const mergeCartSchema = z.object({
  cart_id: z.string().min(1, 'cart_id is required'),
})

export const moveToWishlistSchema = z.object({
  cart_id: z.string().optional(),
  wishlist_id: z.string().optional(),
})

export const moveToCartSchema = z.object({
  wishlist_item_id: z.string().min(1, 'wishlist_item_id is required'),
  size_chart_value_id: z.string().optional(),
  cart_id: z.string().optional(),
  wishlist_id: z.string().optional(),
})
