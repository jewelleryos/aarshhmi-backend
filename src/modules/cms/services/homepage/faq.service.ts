import { cmsService } from '../cms.service'
import { faqContentSchema } from '../../schemas/homepage/faq.schema'
import type { FAQContent } from '../../types/homepage/faq.types'
import type { CmsSection } from '../../types/cms.types'

const SECTION_SLUG = 'homepage-faq'
const SECTION_NAME = 'Homepage FAQ'

// Get FAQ items
async function getItems(): Promise<CmsSection | null> {
  const section = await cmsService.getSectionBySlug(SECTION_SLUG)
  return section
}

// Update FAQ items
async function updateItems(content: FAQContent): Promise<CmsSection> {
  // Validate content structure
  const validatedContent = faqContentSchema.parse(content)

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

export const faqService = {
  getItems,
  updateItems,
}
