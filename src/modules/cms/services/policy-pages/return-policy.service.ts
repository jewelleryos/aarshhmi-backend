import { cmsService } from '../cms.service'
import { returnPolicyContentSchema } from '../../schemas/policy-pages/return-policy.schema'
import type { ReturnPolicyContent } from '../../types/policy-pages/return-policy.types'
import type { CmsSection } from '../../types/cms.types'

const SECTION_SLUG = 'return-policy'
const SECTION_NAME = 'Policy Pages - Return Policy'

// Get return policy content
async function getContent(): Promise<CmsSection | null> {
  const section = await cmsService.getSectionBySlug(SECTION_SLUG)
  return section
}

// Update return policy content
async function updateContent(content: ReturnPolicyContent): Promise<CmsSection> {
  // Validate content structure
  const validatedContent = returnPolicyContentSchema.parse(content)

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

export const returnPolicyService = {
  getContent,
  updateContent,
}
