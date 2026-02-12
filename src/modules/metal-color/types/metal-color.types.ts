export interface MetalColor {
  id: string
  metal_type_id: string
  name: string
  slug: string
  description: string | null
  image_url: string | null
  image_alt_text: string | null
  status: boolean
  created_at: string
  updated_at: string
}

// Extended type with metal type name for list responses
export interface MetalColorWithMetalType extends MetalColor {
  metal_type_name: string
}

export interface CreateMetalColorRequest {
  metal_type_id: string
  name: string
  slug?: string
  description?: string | null
  image_url?: string | null
  image_alt_text?: string | null
  status?: boolean
}

export interface UpdateMetalColorRequest {
  name?: string
  slug?: string
  description?: string | null
  image_url?: string | null
  image_alt_text?: string | null
  status?: boolean
  // NOTE: metal_type_id is NOT updatable
}

export interface MetalColorListResponse {
  items: MetalColorWithMetalType[]
}
