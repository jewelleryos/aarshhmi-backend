export interface GemstoneType {
  id: string
  stone_group_id: string
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

export interface CreateGemstoneTypeRequest {
  name: string
  slug: string
  description?: string | null
  image_url?: string | null
  image_alt_text?: string | null
  status?: boolean
  metadata?: Record<string, unknown>
}

export interface UpdateGemstoneTypeRequest {
  name?: string
  slug?: string
  description?: string | null
  image_url?: string | null
  image_alt_text?: string | null
  status?: boolean
  metadata?: Record<string, unknown>
}

export interface GemstoneTypeListResponse {
  items: GemstoneType[]
}
