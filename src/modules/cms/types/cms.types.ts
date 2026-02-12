export interface CmsSection {
  id: string
  name: string
  slug: string
  content: Record<string, unknown>
  metadata: Record<string, unknown>
  created_at: Date
  updated_at: Date
}

export interface CmsSectionCreateInput {
  name: string
  slug: string
  content?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

export interface CmsSectionUpdateInput {
  name: string
  content: Record<string, unknown>
  metadata?: Record<string, unknown>
}
