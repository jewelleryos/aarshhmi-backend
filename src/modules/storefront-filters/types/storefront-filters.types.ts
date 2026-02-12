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
