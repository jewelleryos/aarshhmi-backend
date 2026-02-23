export interface MetalColor {
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

export interface CreateMetalColorRequest {
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
}

export interface MetalColorListResponse {
  items: MetalColor[]
}
