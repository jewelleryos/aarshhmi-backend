// Main entity type
export interface SizeChartGroup {
  id: string
  name: string
  created_at: string
  updated_at: string
}

// Create request - includes first value data
export interface CreateSizeChartGroupRequest {
  name: string
  // First value data (compulsory)
  value_name: string
  value_description?: string | null
  value_difference: number
}

// Update request - only name can be changed
export interface UpdateSizeChartGroupRequest {
  name: string
}

// Response types
export interface SizeChartGroupListResponse {
  items: SizeChartGroup[]
}
