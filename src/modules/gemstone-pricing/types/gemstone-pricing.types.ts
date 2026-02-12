export interface GemstonePrice {
  id: string
  stone_group_id: string
  stone_type_id: string
  stone_shape_id: string
  stone_quality_id: string
  stone_color_id: string
  ct_from: number
  ct_to: number
  price: number
  status: boolean
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  // Joined fields for display
  type_name?: string
  shape_name?: string
  quality_name?: string
  color_name?: string
}

export interface CreateGemstonePriceRequest {
  stone_type_id: string
  stone_shape_id: string
  stone_quality_id: string
  stone_color_id: string
  ct_from: number
  ct_to: number
  price: number
  status?: boolean
  metadata?: Record<string, unknown>
}

export interface UpdateGemstonePriceRequest {
  stone_type_id?: string
  stone_shape_id?: string
  stone_quality_id?: string
  stone_color_id?: string
  ct_from?: number
  ct_to?: number
  price?: number
  status?: boolean
  metadata?: Record<string, unknown>
}

export interface GemstonePriceListResponse {
  items: GemstonePrice[]
}

export interface GemstonePriceFilters {
  stone_type_id?: string
  stone_shape_id?: string
  stone_quality_id?: string
  stone_color_id?: string
}

// ============ Bulk Operations ============

// Header definitions for CSV files
export const CREATE_HEADERS = ['gemstone_type', 'shape', 'quality', 'color', 'from', 'to', 'price'] as const
export const UPDATE_HEADERS = ['id', 'gemstone_type', 'shape', 'quality', 'color', 'from', 'to', 'price'] as const

export type CreateHeaders = (typeof CREATE_HEADERS)[number]
export type UpdateHeaders = (typeof UPDATE_HEADERS)[number]

// CSV row structure for CREATE
export interface GemstonePriceCreateRow {
  gemstone_type: string // slug
  shape: string // slug
  quality: string // slug
  color: string // slug
  from: number
  to: number
  price: number
}

// CSV row structure for UPDATE
export interface GemstonePriceUpdateRow {
  id: string
  gemstone_type: string // slug (read-only reference)
  shape: string // slug (read-only reference)
  quality: string // slug (read-only reference)
  color: string // slug (read-only reference)
  from: number // read-only reference
  to: number // read-only reference
  price: number // only this is updated
}

// Bulk create result item
export interface BulkCreateResultItem {
  row: number
  id: string
  gemstone_type: string
  shape: string
  quality: string
  color: string
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
    gemstone_type?: string
    shape?: string
    quality?: string
    color?: string
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
    gemstone_type?: string
    shape?: string
    quality?: string
    color?: string
    price?: number
  }
}

// Bulk update warning item
export interface BulkUpdateWarningItem {
  row: number
  warning: string
  data?: {
    id?: string
    gemstone_type?: string
    shape?: string
    quality?: string
    color?: string
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
  gemstone_type_name: string
  gemstone_type_slug: string
  shape_name: string
  shape_slug: string
  quality_name: string
  quality_slug: string
  color_name: string
  color_slug: string
}

// Export row structure
export interface GemstonePriceExportRow {
  [key: string]: unknown
  id: string
  gemstone_type: string
  shape: string
  quality: string
  color: string
  from: number
  to: number
  price: number
}
