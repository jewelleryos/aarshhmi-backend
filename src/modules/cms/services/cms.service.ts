import { db } from '../../../lib/db'
import type { CmsSection, CmsSectionCreateInput, CmsSectionUpdateInput } from '../types/cms.types'

// Get all sections
async function getAllSections(): Promise<CmsSection[]> {
  const result = await db.query('SELECT * FROM cms_sections ORDER BY name ASC')
  return result.rows
}

// Get section by slug
async function getSectionBySlug(slug: string): Promise<CmsSection | null> {
  const result = await db.query('SELECT * FROM cms_sections WHERE slug = $1', [slug])
  return result.rows[0] || null
}

// Create section
async function createSection(data: CmsSectionCreateInput): Promise<CmsSection> {
  const result = await db.query(
    `INSERT INTO cms_sections (name, slug, content, metadata)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [data.name, data.slug, JSON.stringify(data.content || {}), JSON.stringify(data.metadata || {})]
  )
  return result.rows[0]
}

// Update section by slug
async function updateSectionBySlug(slug: string, data: CmsSectionUpdateInput): Promise<CmsSection> {
  const result = await db.query(
    `UPDATE cms_sections
     SET name = $1, content = $2, metadata = COALESCE($3, metadata), updated_at = NOW()
     WHERE slug = $4
     RETURNING *`,
    [data.name, JSON.stringify(data.content), data.metadata ? JSON.stringify(data.metadata) : null, slug]
  )
  return result.rows[0]
}

// Delete section by slug
async function deleteSectionBySlug(slug: string): Promise<void> {
  await db.query('DELETE FROM cms_sections WHERE slug = $1', [slug])
}

// Check if slug exists
async function slugExists(slug: string): Promise<boolean> {
  const result = await db.query('SELECT 1 FROM cms_sections WHERE slug = $1', [slug])
  return result.rows.length > 0
}

export const cmsService = {
  getAllSections,
  getSectionBySlug,
  createSection,
  updateSectionBySlug,
  deleteSectionBySlug,
  slugExists,
}
