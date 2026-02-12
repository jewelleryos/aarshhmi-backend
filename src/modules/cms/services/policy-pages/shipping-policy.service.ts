import { cmsService } from '../cms.service'
import { shippingPolicyContentSchema } from '../../schemas/policy-pages/shipping-policy.schema'
import type { ShippingPolicyContent } from '../../types/policy-pages/shipping-policy.types'
import type { CmsSection } from '../../types/cms.types'

const SECTION_SLUG = 'shipping-policy'
const SECTION_NAME = 'Policy Pages - Shipping Policy'

// Get shipping policy content
async function getContent(): Promise<CmsSection | null> {
  const section = await cmsService.getSectionBySlug(SECTION_SLUG)
  return section
}

// Update shipping policy content
async function updateContent(content: ShippingPolicyContent): Promise<CmsSection> {
  // Validate content structure
  const validatedContent = shippingPolicyContentSchema.parse(content)

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

export const shippingPolicyService = {
  getContent,
  updateContent,
}
