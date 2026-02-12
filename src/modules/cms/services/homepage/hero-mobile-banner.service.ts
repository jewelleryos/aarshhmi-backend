import { cmsService } from '../cms.service'
import { heroMobileBannerContentSchema } from '../../schemas/homepage/hero-mobile-banner.schema'
import type { HeroMobileBannerContent } from '../../types/homepage/hero-mobile-banner.types'
import type { CmsSection } from '../../types/cms.types'

const SECTION_SLUG = 'hero-banner-mobile'
const SECTION_NAME = 'Hero Banner Mobile'

// Get hero mobile banners
async function getBanners(): Promise<CmsSection | null> {
  const section = await cmsService.getSectionBySlug(SECTION_SLUG)
  return section
}

// Update hero mobile banners
async function updateBanners(content: HeroMobileBannerContent): Promise<CmsSection> {
  // Validate content structure
  const validatedContent = heroMobileBannerContentSchema.parse(content)

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

export const heroMobileBannerService = {
  getBanners,
  updateBanners,
}
