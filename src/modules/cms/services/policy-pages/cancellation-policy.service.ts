import { cmsService } from '../cms.service'
import { cancellationPolicyContentSchema } from '../../schemas/policy-pages/cancellation-policy.schema'
import type { CancellationPolicyContent } from '../../types/policy-pages/cancellation-policy.types'
import type { CmsSection } from '../../types/cms.types'

const SECTION_SLUG = 'cancellation-policy'
const SECTION_NAME = 'Policy Pages - Cancellation Policy'

// Get cancellation policy content
async function getContent(): Promise<CmsSection | null> {
  const section = await cmsService.getSectionBySlug(SECTION_SLUG)
  return section
}

// Update cancellation policy content
async function updateContent(content: CancellationPolicyContent): Promise<CmsSection> {
  // Validate content structure
  const validatedContent = cancellationPolicyContentSchema.parse(content)

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

export const cancellationPolicyService = {
  getContent,
  updateContent,
}
