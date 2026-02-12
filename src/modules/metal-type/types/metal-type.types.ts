export interface MetalType {
  id: string
  name: string
  slug: string
  description: string | null
  image_url: string | null
  image_alt_text: string | null
  status: boolean
  created_at: string
  updated_at: string
}

export interface CreateMetalTypeRequest {
  name: string
  slug?: string
  description?: string | null
  image_url?: string | null
  image_alt_text?: string | null
  status?: boolean
}

export interface UpdateMetalTypeRequest {
  name?: string
  slug?: string
  description?: string | null
  image_url?: string | null
  image_alt_text?: string | null
  status?: boolean
}

export interface MetalTypeListResponse {
  items: MetalType[]
}
