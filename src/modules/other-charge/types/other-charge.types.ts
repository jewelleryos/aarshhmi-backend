export interface OtherCharge {
  id: string
  name: string
  description: string | null
  amount: number
  metadata: Record<string, unknown>
  status: boolean
  created_at: string
  updated_at: string
}

export interface CreateOtherChargeRequest {
  name: string
  description?: string | null
  amount: number
  metadata?: Record<string, unknown>
}

export interface UpdateOtherChargeRequest {
  name?: string
  description?: string | null
  amount?: number
  metadata?: Record<string, unknown>
}

export interface OtherChargeListResponse {
  items: OtherCharge[]
}
