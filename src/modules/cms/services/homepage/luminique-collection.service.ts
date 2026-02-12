import { cmsService } from '../cms.service'
import { luminiqueCollectionContentSchema } from '../../schemas/homepage/luminique-collection.schema'
import type { LuminiqueCollectionContent } from '../../types/homepage/luminique-collection.types'
import type { CmsSection } from '../../types/cms.types'

const SECTION_SLUG = 'homepage-luminique-collection'
const SECTION_NAME = 'Homepage Luminique Collection'

// Get luminique collection items
async function getItems(): Promise<CmsSection | null> {
  const section = await cmsService.getSectionBySlug(SECTION_SLUG)
  return section
}

// Update luminique collection items
async function updateItems(content: LuminiqueCollectionContent): Promise<CmsSection> {
  // Validate content structure
  const validatedContent = luminiqueCollectionContentSchema.parse(content)

  // Check if section exists
  const exists = await cmsService.slugExists(SECTION_SLUG)

  if (exists) {
    return await cmsService.updateSectionBySlug(SECTION_SLUG, {
      name: SECTION_NAME,
      content: validatedContent,
    })
  } else {
    return await cmsService.createSection({
      name: SECTION_NAME,
      slug: SECTION_SLUG,
      content: validatedContent,
    })
  }
}

export const luminiqueCollectionService = {
  getItems,
  updateItems,
}
