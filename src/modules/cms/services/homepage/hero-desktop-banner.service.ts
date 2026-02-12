import { cmsService } from '../cms.service'
import { heroDesktopBannerContentSchema } from '../../schemas/homepage/hero-desktop-banner.schema'
import type { HeroDesktopBannerContent } from '../../types/homepage/hero-desktop-banner.types'
import type { CmsSection } from '../../types/cms.types'

const SECTION_SLUG = 'hero-banner-desktop'
const SECTION_NAME = 'Hero Banner Desktop'

// Get hero desktop banners
async function getBanners(): Promise<CmsSection | null> {
  const section = await cmsService.getSectionBySlug(SECTION_SLUG)
  return section
}

// Update hero desktop banners
async function updateBanners(content: HeroDesktopBannerContent): Promise<CmsSection> {
  // Validate content structure
  const validatedContent = heroDesktopBannerContentSchema.parse(content)

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

export const heroDesktopBannerService = {
  getBanners,
  updateBanners,
}
