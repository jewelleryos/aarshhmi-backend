export type JobStatus = 'pending' | 'running' | 'completed' | 'cancelled' | 'failed'

export interface ProductError {
  productId: string
  productName: string
  error: string
}

export interface ScoringCondition {
  id: string
  condition_key: string
  label: string
  description: string | null
  weight: number
  is_active: boolean
  rank: number
}

export interface SimilarProductEntry {
  id: string
  product_id: string
  similar_product_id: string
  source: 'manual' | 'system'
  score: number
  rank: number
}
