import { cmsService } from '../cms.service'
import { termsConditionsContentSchema } from '../../schemas/policy-pages/terms-conditions.schema'
import type { TermsConditionsContent } from '../../types/policy-pages/terms-conditions.types'
import type { CmsSection } from '../../types/cms.types'

const SECTION_SLUG = 'terms-conditions'
const SECTION_NAME = 'Policy Pages - Terms and Conditions'

// Get terms and conditions content
async function getContent(): Promise<CmsSection | null> {
  const section = await cmsService.getSectionBySlug(SECTION_SLUG)
  return section
}

// Update terms and conditions content
async function updateContent(content: TermsConditionsContent): Promise<CmsSection> {
  // Validate content structure
  const validatedContent = termsConditionsContentSchema.parse(content)

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

export const termsConditionsService = {
  getContent,
  updateContent,
}
