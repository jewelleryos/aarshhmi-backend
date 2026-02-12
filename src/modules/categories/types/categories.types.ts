// SEO type
export interface CategorySeo {
  meta_title?: string
  meta_keywords?: string
  meta_description?: string
  meta_robots?: string
  meta_canonical?: string
  og_title?: string
  og_site_name?: string
  og_description?: string
  og_url?: string
  og_image_url?: string
  twitter_card_title?: string
  twitter_card_site_name?: string
  twitter_card_description?: string
  twitter_url?: string
  twitter_media?: string
}

// Main entity type
export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  parent_category_id: string | null
  mpath: string
  media_url: string | null
  media_alt_text: string | null
  seo: CategorySeo
  is_filterable: boolean
  filter_display_name: string | null
  rank: number
  status: boolean
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

// Extended type with children (for hierarchical response)
export interface CategoryWithChildren extends Category {
  children: Category[]
}

// Create request (no SEO at creation)
export interface CreateCategoryRequest {
  name: string
  slug?: string
  description?: string | null
  parent_category_id?: string | null
  media_url?: string | null
  media_alt_text?: string | null
  is_filterable?: boolean
  filter_display_name?: string | null
  rank?: number
  status?: boolean
  metadata?: Record<string, unknown>
}

// Update request
export interface UpdateCategoryRequest {
  name?: string
  slug?: string
  description?: string | null
  parent_category_id?: string | null
  media_url?: string | null
  media_alt_text?: string | null
  is_filterable?: boolean
  filter_display_name?: string | null
  rank?: number
  status?: boolean
  metadata?: Record<string, unknown>
}

// Update SEO request (separate endpoint)
export interface UpdateCategorySeoRequest {
  meta_title?: string | null
  meta_keywords?: string | null
  meta_description?: string | null
  meta_robots?: string | null
  meta_canonical?: string | null
  og_title?: string | null
  og_site_name?: string | null
  og_description?: string | null
  og_url?: string | null
  og_image_url?: string | null
  twitter_card_title?: string | null
  twitter_card_site_name?: string | null
  twitter_card_description?: string | null
  twitter_url?: string | null
  twitter_media?: string | null
}

// Response types
export interface CategoryListResponse {
  items: CategoryWithChildren[]
}

export interface CategoryFlatListResponse {
  items: Category[]
}
