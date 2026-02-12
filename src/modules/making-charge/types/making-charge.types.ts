export interface MakingCharge {
  id: string
  metal_type_id: string
  from: string  // Decimal as string from DB
  to: string    // Decimal as string from DB
  is_fixed_pricing: boolean
  amount: string  // Decimal as string from DB (stored as-is)
  metadata: Record<string, unknown>
  status: boolean
  created_at: string
  updated_at: string
}

// Extended type with metal type name for list responses
export interface MakingChargeWithMetalType extends MakingCharge {
  metal_type_name: string
}

export interface CreateMakingChargeRequest {
  metal_type_id: string
  from: number
  to: number
  is_fixed_pricing?: boolean  // Default: true
  amount: number  // Stored as-is (no conversion)
  metadata?: Record<string, unknown>
}

export interface UpdateMakingChargeRequest {
  metal_type_id?: string
  from?: number
  to?: number
  is_fixed_pricing?: boolean
  amount?: number  // Stored as-is (no conversion)
  metadata?: Record<string, unknown>
}

export interface MakingChargeListResponse {
  items: MakingChargeWithMetalType[]
}
