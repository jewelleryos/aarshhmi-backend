import { cmsService } from '../cms.service'
import { shopByCategoryContentSchema } from '../../schemas/homepage/shop-by-category.schema'
import type { ShopByCategoryContent } from '../../types/homepage/shop-by-category.types'
import type { CmsSection } from '../../types/cms.types'

const SECTION_SLUG = 'homepage-shop-by-category'
const SECTION_NAME = 'Homepage - Shop by Category'

// Get shop by category
async function getCategories(): Promise<CmsSection | null> {
  const section = await cmsService.getSectionBySlug(SECTION_SLUG)
  return section
}

// Update shop by category
async function updateCategories(content: ShopByCategoryContent): Promise<CmsSection> {
  // Validate content structure
  const validatedContent = shopByCategoryContentSchema.parse(content)

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

export const shopByCategoryService = {
  getCategories,
  updateCategories,
}
