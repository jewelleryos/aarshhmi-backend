import { cmsService } from '../cms.service'
import { privacyPolicyContentSchema } from '../../schemas/policy-pages/privacy-policy.schema'
import type { PrivacyPolicyContent } from '../../types/policy-pages/privacy-policy.types'
import type { CmsSection } from '../../types/cms.types'

const SECTION_SLUG = 'privacy-policy'
const SECTION_NAME = 'Policy Pages - Privacy Policy'

// Get privacy policy content
async function getContent(): Promise<CmsSection | null> {
  const section = await cmsService.getSectionBySlug(SECTION_SLUG)
  return section
}

// Update privacy policy content
async function updateContent(content: PrivacyPolicyContent): Promise<CmsSection> {
  // Validate content structure
  const validatedContent = privacyPolicyContentSchema.parse(content)

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

export const privacyPolicyService = {
  getContent,
  updateContent,
}
