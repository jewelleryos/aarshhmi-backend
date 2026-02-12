import { cmsService } from '../cms.service'
import { aboutLuminiqueContentSchema } from '../../schemas/homepage/about-luminique.schema'
import type { AboutLuminiqueContent } from '../../types/homepage/about-luminique.types'
import type { CmsSection } from '../../types/cms.types'

const SECTION_SLUG = 'homepage-about-luminique'
const SECTION_NAME = 'Homepage About Luminique'

// Get about luminique content
async function getContent(): Promise<CmsSection | null> {
  const section = await cmsService.getSectionBySlug(SECTION_SLUG)
  return section
}

// Update about luminique content
async function updateContent(content: AboutLuminiqueContent): Promise<CmsSection> {
  // Validate content structure
  const validatedContent = aboutLuminiqueContentSchema.parse(content)

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

export const aboutLuminiqueService = {
  getContent,
  updateContent,
}
