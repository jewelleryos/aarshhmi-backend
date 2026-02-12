import { cmsService } from '../cms.service'
import { lifetimeExchangeContentSchema } from '../../schemas/policy-pages/lifetime-exchange.schema'
import type { LifetimeExchangeContent } from '../../types/policy-pages/lifetime-exchange.types'
import type { CmsSection } from '../../types/cms.types'

const SECTION_SLUG = 'lifetime-exchange'
const SECTION_NAME = 'Policy Pages - Lifetime Exchange'

// Get lifetime exchange content
async function getContent(): Promise<CmsSection | null> {
  const section = await cmsService.getSectionBySlug(SECTION_SLUG)
  return section
}

// Update lifetime exchange content
async function updateContent(content: LifetimeExchangeContent): Promise<CmsSection> {
  // Validate content structure
  const validatedContent = lifetimeExchangeContentSchema.parse(content)

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

export const lifetimeExchangeService = {
  getContent,
  updateContent,
}
