export interface MetalPurity {
  id: string
  metal_type_id: string
  name: string
  slug: string
  description: string | null
  image_url: string | null
  image_alt_text: string | null
  price: number // Stored in smallest unit (paise/cents)
  status: boolean
  created_at: string
  updated_at: string
}

// Extended type with metal type name for list responses
export interface MetalPurityWithMetalType extends MetalPurity {
  metal_type_name: string
}

export interface CreateMetalPurityRequest {
  metal_type_id: string
  name: string
  slug?: string
  description?: string | null
  image_url?: string | null
  image_alt_text?: string | null
  price: number // Frontend sends actual amount (6500.50)
  status?: boolean
}

export interface UpdateMetalPurityRequest {
  name?: string
  slug?: string
  description?: string | null
  image_url?: string | null
  image_alt_text?: string | null
  price?: number // Frontend sends actual amount (6500.50)
  status?: boolean
  // NOTE: metal_type_id is NOT updatable
}

export interface MetalPurityListResponse {
  items: MetalPurityWithMetalType[]
}
