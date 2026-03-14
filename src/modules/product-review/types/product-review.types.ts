export interface ProductReview {
  id: string
  product_id: string
  type: 'system' | 'user'
  user_id: string | null
  order_id: string | null
  customer_name: string
  customer_image_path: string | null
  title: string
  rating: number
  description: string
  order_date: string | null
  review_date: string
  media: ReviewMediaItem[]
  metadata: Record<string, unknown>
  status: boolean
  approval_status: 'approved' | 'pending' | 'rejected'
  created_at: string
  updated_at: string
}

export interface ReviewMediaItem {
  id: string
  type: 'image' | 'video'
  path: string
  alt_text: string
}

export interface ProductReviewListItem {
  id: string
  product_id: string
  product_name: string
  product_sku: string
  type: 'system' | 'user'
  customer_name: string
  title: string
  rating: number
  status: boolean
  approval_status: 'approved' | 'pending' | 'rejected'
  review_date: string
  created_at: string
}

export interface ProductReviewListResponse {
  items: ProductReviewListItem[]
}

export interface CreateProductReviewRequest {
  product_id: string
  customer_name: string
  customer_image_path?: string | null
  title: string
  rating: number
  description: string
  order_date: string
  review_date: string
  media?: ReviewMediaItem[]
  metadata?: Record<string, unknown>
  status?: boolean
}

export interface UpdateProductReviewRequest {
  customer_name?: string
  customer_image_path?: string | null
  title?: string
  rating?: number
  description?: string
  order_date?: string
  review_date?: string
  media?: ReviewMediaItem[]
  metadata?: Record<string, unknown>
  status?: boolean
}

export interface StorefrontReviewResponse {
  stats: {
    average_rating: number
    total_reviews: number
    rating_1: number
    rating_2: number
    rating_3: number
    rating_4: number
    rating_5: number
  }
  reviews: StorefrontReviewItem[]
}

export interface StorefrontReviewItem {
  id: string
  customer_name: string
  customer_image_path: string | null
  title: string
  rating: number
  description: string
  review_date: string
  media: ReviewMediaItem[]
}
