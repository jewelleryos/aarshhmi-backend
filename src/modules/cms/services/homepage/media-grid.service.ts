import { cmsService } from '../cms.service'
import { mediaGridContentSchema } from '../../schemas/homepage/media-grid.schema'
import type { MediaGridContent } from '../../types/homepage/media-grid.types'
import type { CmsSection } from '../../types/cms.types'

const SECTION_SLUG = 'homepage-media-grid'
const SECTION_NAME = 'Homepage Media Grid'

// Get media grid items
async function getItems(): Promise<CmsSection | null> {
  const section = await cmsService.getSectionBySlug(SECTION_SLUG)
  return section
}

// Update media grid items
async function updateItems(content: MediaGridContent): Promise<CmsSection> {
  // Validate content structure
  const validatedContent = mediaGridContentSchema.parse(content)

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

export const mediaGridService = {
  getItems,
  updateItems,
}
