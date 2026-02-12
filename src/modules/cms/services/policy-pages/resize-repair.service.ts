import { cmsService } from '../cms.service'
import { resizeRepairContentSchema } from '../../schemas/policy-pages/resize-repair.schema'
import type { ResizeRepairContent } from '../../types/policy-pages/resize-repair.types'
import type { CmsSection } from '../../types/cms.types'

const SECTION_SLUG = 'resize-repair'
const SECTION_NAME = 'Policy Pages - Resize and Repair'

// Get resize and repair content
async function getContent(): Promise<CmsSection | null> {
  const section = await cmsService.getSectionBySlug(SECTION_SLUG)
  return section
}

// Update resize and repair content
async function updateContent(content: ResizeRepairContent): Promise<CmsSection> {
  // Validate content structure
  const validatedContent = resizeRepairContentSchema.parse(content)

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

export const resizeRepairService = {
  getContent,
  updateContent,
}
