export interface DiamondPrice {
  id: string
  stone_group_id: string
  stone_type_id: string
  stone_shape_id: string
  stone_quality_id: string
  stone_color_id: string | null
  ct_from: number
  ct_to: number
  price: number
  status: boolean
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  // Joined fields for display
  shape_name?: string
  quality_name?: string
}

export interface CreateDiamondPriceRequest {
  stone_shape_id: string
  stone_quality_id: string
  ct_from: number
  ct_to: number
  price: number
  status?: boolean
  metadata?: Record<string, unknown>
}

export interface UpdateDiamondPriceRequest {
  stone_shape_id?: string
  stone_quality_id?: string
  ct_from?: number
  ct_to?: number
  price?: number
  status?: boolean
  metadata?: Record<string, unknown>
}

export interface DiamondPriceListResponse {
  items: DiamondPrice[]
}

export interface DiamondPriceFilters {
  stone_shape_id?: string
  stone_quality_id?: string
}

// ============ Bulk Operations ============

// Header definitions for CSV files
export const CREATE_HEADERS = ['shape', 'clarity/color', 'from', 'to', 'price'] as const
export const UPDATE_HEADERS = ['id', 'shape', 'clarity/color', 'from', 'to', 'price'] as const

export type CreateHeaders = (typeof CREATE_HEADERS)[number]
export type UpdateHeaders = (typeof UPDATE_HEADERS)[number]

// CSV row structure for CREATE
export interface DiamondPriceCreateRow {
  shape: string // slug
  'clarity/color': string // slug
  from: number
  to: number
  price: number
}

// CSV row structure for UPDATE
export interface DiamondPriceUpdateRow {
  id: string
  shape: string // slug (read-only reference)
  'clarity/color': string // slug (read-only reference)
  from: number // read-only reference
  to: number // read-only reference
  price: number // only this is updated
}

// Bulk create result item
export interface BulkCreateResultItem {
  row: number
  id: string
  shape: string
  clarity_color: string
  from: number
  to: number
  price: number
}

// Bulk create success result
export interface BulkCreateResult {
  created_count: number
  created: BulkCreateResultItem[]
}

// Bulk create error item
export interface BulkCreateErrorItem {
  row: number
  error: string
  data?: {
    shape?: string
    clarity_color?: string
    from?: number
    to?: number
    price?: number
  }
}

// Bulk create error result (file rejected)
export interface BulkCreateError {
  total_rows: number
  error_count: number
  errors: BulkCreateErrorItem[]
}

// Bulk update failed item
export interface BulkUpdateFailedItem {
  row: number
  error: string
  data?: {
    id?: string
    shape?: string
    clarity_color?: string
    price?: number
  }
}

// Bulk update warning item
export interface BulkUpdateWarningItem {
  row: number
  warning: string
  data?: {
    id?: string
    shape?: string
    clarity_color?: string
  }
}

// Bulk update result (partial success allowed)
export interface BulkUpdateResult {
  summary: {
    total: number
    updated: number
    failed: number
  }
  failed: BulkUpdateFailedItem[]
  warnings: BulkUpdateWarningItem[]
}

// Reference data row for download
export interface ReferenceDataRow {
  [key: string]: unknown
  shape_name: string
  shape_slug: string
  clarity_color_name: string
  clarity_color_slug: string
}

// Export row structure
export interface DiamondPriceExportRow {
  [key: string]: unknown
  id: string
  shape: string
  'clarity/color': string
  from: number
  to: number
  price: number
}
