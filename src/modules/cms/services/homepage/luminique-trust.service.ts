import { cmsService } from '../cms.service'
import { luminiqueTrustContentSchema } from '../../schemas/homepage/luminique-trust.schema'
import type { LuminiqueTrustContent } from '../../types/homepage/luminique-trust.types'
import type { CmsSection } from '../../types/cms.types'

const SECTION_SLUG = 'homepage-luminique-trust'
const SECTION_NAME = 'Homepage Luminique Trust'

// Get luminique trust content
async function getContent(): Promise<CmsSection | null> {
  const section = await cmsService.getSectionBySlug(SECTION_SLUG)
  return section
}

// Update luminique trust content
async function updateContent(content: LuminiqueTrustContent): Promise<CmsSection> {
  // Validate content structure (ensures exactly 6 trust items)
  const validatedContent = luminiqueTrustContentSchema.parse(content)

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

export const luminiqueTrustService = {
  getContent,
  updateContent,
}
