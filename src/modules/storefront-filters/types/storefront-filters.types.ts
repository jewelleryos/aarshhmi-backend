// Filter value (tag) for storefront filters
export interface FilterValue {
  id: string
  name: string
  slug: string
  display_name: string | null
  media_url: string | null
  media_alt_text: string | null
  is_filterable: boolean
  rank: number
  is_system_generated: boolean
}

// Filter group (tag group) with its values
export interface FilterGroup {
  id: string
  name: string
  slug: string
  display_name: string | null
  media_url: string | null
  media_alt_text: string | null
  is_filterable: boolean
  rank: number
  is_system_generated: boolean
  values: FilterValue[]
}

// Request to update a filter group
export interface UpdateFilterGroupRequest {
  filter_display_name?: string | null
  media_url?: string | null
  media_alt_text?: string | null
  is_filterable?: boolean
  rank?: number
}

// Request to update a filter value
export interface UpdateFilterValueRequest {
  filter_display_name?: string | null
  media_url?: string | null
  media_alt_text?: string | null
  is_filterable?: boolean
  rank?: number
}

// Response for list
export interface FilterListResponse {
  filters: FilterGroup[]
}

// Price filter range entity
export interface PriceFilterRange {
  id: string
  display_name: string
  min_price: number
  max_price: number
  media_url: string | null
  media_alt_text: string | null
  rank: number
  status: boolean
  created_at: string
  updated_at: string
}

// Request to create a price filter range
export interface CreatePriceFilterRangeRequest {
  display_name: string
  min_price: number
  max_price: number
  media_url?: string | null
  media_alt_text?: string | null
  rank?: number
  status?: boolean
}

// Request to update a price filter range
export interface UpdatePriceFilterRangeRequest {
  display_name?: string
  min_price?: number
  max_price?: number
  media_url?: string | null
  media_alt_text?: string | null
  rank?: number
  status?: boolean
}

// Sort-by option entity
export interface SortByOption {
  id: string
  key: string
  label: string
  sort_column: string
  sort_direction: string
  tiebreaker_column: string | null
  tiebreaker_direction: string | null
  is_active: boolean
  rank: number
  created_at: string
  updated_at: string
}

// Request to update a sort-by option (only admin-editable fields)
export interface UpdateSortByOptionRequest {
  label?: string
  is_active?: boolean
  rank?: number
}

// Storefront filter group config entity
export interface StorefrontFilterGroupConfig {
  id: string
  type: string
  display_name: string | null
  is_filterable: boolean
  rank: number
  created_at: string
  updated_at: string
}

// Request to update a group config
export interface UpdateGroupConfigRequest {
  display_name?: string | null
  is_filterable?: boolean
  rank?: number
}
