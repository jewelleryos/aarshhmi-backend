export interface StoneShape {
  id: string
  name: string
  slug: string
  description: string | null
  image_url: string | null
  image_alt_text: string | null
  status: boolean
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface CreateStoneShapeRequest {
  name: string
  slug?: string
  description?: string | null
  image_url?: string | null
  image_alt_text?: string | null
  status?: boolean
  metadata?: Record<string, unknown> | null
}

export interface UpdateStoneShapeRequest {
  name?: string
  slug?: string
  description?: string | null
  image_url?: string | null
  image_alt_text?: string | null
  status?: boolean
  metadata?: Record<string, unknown>
}

export interface StoneShapeListResponse {
  items: StoneShape[]
}
