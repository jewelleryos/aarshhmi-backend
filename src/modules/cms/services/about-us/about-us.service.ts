import { cmsService } from '../cms.service'
import { aboutUsContentSchema } from '../../schemas/about-us/about-us.schema'
import type { AboutUsContent } from '../../types/about-us/about-us.types'
import type { CmsSection } from '../../types/cms.types'

const SECTION_SLUG = 'about-us'
const SECTION_NAME = 'About Us'

// Get about us content
async function getContent(): Promise<CmsSection | null> {
  const section = await cmsService.getSectionBySlug(SECTION_SLUG)
  return section
}

// Update about us content
async function updateContent(content: AboutUsContent): Promise<CmsSection> {
  // Validate content structure
  const validatedContent = aboutUsContentSchema.parse(content)

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

export const aboutUsService = {
  getContent,
  updateContent,
}
