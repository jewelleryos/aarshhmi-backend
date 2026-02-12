// Main entity type
export interface Badge {
  id: string
  name: string
  slug: string
  bg_color: string
  font_color: string
  position: number
  status: boolean
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

// Create request - all fields required except status and metadata
export interface CreateBadgeRequest {
  name: string
  slug: string
  bg_color: string
  font_color: string
  position: number
  status?: boolean
  metadata?: Record<string, unknown>
}

// Update request
export interface UpdateBadgeRequest {
  name?: string
  slug?: string
  bg_color?: string
  font_color?: string
  position?: number
  status?: boolean
  metadata?: Record<string, unknown>
}

// Response types
export interface BadgeListResponse {
  items: Badge[]
}
