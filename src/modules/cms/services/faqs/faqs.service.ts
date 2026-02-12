import { cmsService } from '../cms.service'
import { faqsContentSchema } from '../../schemas/faqs/faqs.schema'
import type { FAQsContent } from '../../types/faqs/faqs.types'
import type { CmsSection } from '../../types/cms.types'

const SECTION_SLUG = 'faqs'
const SECTION_NAME = 'FAQs'

// Get FAQs content
async function getContent(): Promise<CmsSection | null> {
  const section = await cmsService.getSectionBySlug(SECTION_SLUG)
  return section
}

// Update FAQs content
async function updateContent(content: FAQsContent): Promise<CmsSection> {
  // Validate content structure
  const validatedContent = faqsContentSchema.parse(content)

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

export const faqsService = {
  getContent,
  updateContent,
}
