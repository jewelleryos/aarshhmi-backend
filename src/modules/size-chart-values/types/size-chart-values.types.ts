// Main entity type
export interface SizeChartValue {
  id: string
  size_chart_group_id: string
  name: string
  description: string | null
  difference: number
  is_default: boolean
  created_at: string
  updated_at: string
}

// Extended type with group name (for list display)
export interface SizeChartValueWithGroup extends SizeChartValue {
  size_chart_group_name: string
}

// Create request - NO is_default field
export interface CreateSizeChartValueRequest {
  size_chart_group_id: string
  name: string
  description?: string | null
  difference: number
}

// Update request - NO is_default field (use make-default endpoint)
export interface UpdateSizeChartValueRequest {
  name?: string
  description?: string | null
  difference?: number
}

// Response types
export interface SizeChartValueListResponse {
  items: SizeChartValueWithGroup[]
}

// List query params
export interface SizeChartValueListQuery {
  size_chart_group_id?: string // Optional filter by group
}
