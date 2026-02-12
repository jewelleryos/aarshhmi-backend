import { Hono } from 'hono'
import { cmsService } from '../../services/cms.service'
import { cmsMessages } from '../../config/cms.messages'
import { successResponse } from '../../../../utils/response'
import { errorHandler } from '../../../../utils/error-handler'
import type { AppEnv } from '../../../../types/hono.types'
import type { HeroDesktopBannerContent, HeroDesktopBannerItem } from '../../types/homepage/hero-desktop-banner.types'
import type { HeroMobileBannerContent, HeroMobileBannerItem } from '../../types/homepage/hero-mobile-banner.types'
import type { ShopByCategoryContent, ShopByCategoryItem } from '../../types/homepage/shop-by-category.types'
import type { MediaGridContent, MediaGridItem } from '../../types/homepage/media-grid.types'
import type { LuminiqueCollectionContent, LuminiqueCollectionItem } from '../../types/homepage/luminique-collection.types'
import type { AboutLuminiqueContent } from '../../types/homepage/about-luminique.types'
import type { LuminiqueTrustContent } from '../../types/homepage/luminique-trust.types'
import type { FAQContent, FAQItem } from '../../types/homepage/faq.types'
import type { LifetimeExchangeContent } from '../../types/policy-pages/lifetime-exchange.types'
import type { ReturnPolicyContent } from '../../types/policy-pages/return-policy.types'
import type { ResizeRepairContent } from '../../types/policy-pages/resize-repair.types'
import type { CancellationPolicyContent } from '../../types/policy-pages/cancellation-policy.types'
import type { ShippingPolicyContent } from '../../types/policy-pages/shipping-policy.types'
import type { PrivacyPolicyContent } from '../../types/policy-pages/privacy-policy.types'
import type { TermsConditionsContent } from '../../types/policy-pages/terms-conditions.types'
import type { FAQsContent, FAQItem as FAQsSectionItem, FAQsGroupedResponse } from '../../types/faqs/faqs.types'
import type { AboutUsContent } from '../../types/about-us/about-us.types'
import { FAQ_TYPES_ARRAY } from '../../config/faq.constants'

export const cmsStorefrontRoutes = new Hono<AppEnv>()

// GET /homepage/hero-desktop-banner - Get active hero desktop banners (public)
cmsStorefrontRoutes.get('/homepage/hero-desktop-banner', async (c) => {
  try {
    const section = await cmsService.getSectionBySlug('hero-banner-desktop')

    if (!section) {
      return successResponse(c, cmsMessages.HERO_DESKTOP_BANNER_FETCHED, { banners: [] })
    }

    // Filter only active banners and sort by rank
    const content = section.content as unknown as HeroDesktopBannerContent
    const activeBanners = (content.banners || [])
      .filter((banner: HeroDesktopBannerItem) => banner.status === true)
      .sort((a: HeroDesktopBannerItem, b: HeroDesktopBannerItem) => a.rank - b.rank)

    return successResponse(c, cmsMessages.HERO_DESKTOP_BANNER_FETCHED, { banners: activeBanners })
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /homepage/hero-mobile-banner - Get active hero mobile banners (public)
cmsStorefrontRoutes.get('/homepage/hero-mobile-banner', async (c) => {
  try {
    const section = await cmsService.getSectionBySlug('hero-banner-mobile')

    if (!section) {
      return successResponse(c, cmsMessages.HERO_MOBILE_BANNER_FETCHED, { banners: [] })
    }

    // Filter only active banners and sort by rank
    const content = section.content as unknown as HeroMobileBannerContent
    const activeBanners = (content.banners || [])
      .filter((banner: HeroMobileBannerItem) => banner.status === true)
      .sort((a: HeroMobileBannerItem, b: HeroMobileBannerItem) => a.rank - b.rank)

    return successResponse(c, cmsMessages.HERO_MOBILE_BANNER_FETCHED, { banners: activeBanners })
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /homepage/shop-by-category - Get active shop by category items (public)
cmsStorefrontRoutes.get('/homepage/shop-by-category', async (c) => {
  try {
    const section = await cmsService.getSectionBySlug('homepage-shop-by-category')

    if (!section) {
      return successResponse(c, cmsMessages.SHOP_BY_CATEGORY_FETCHED, { categories: [] })
    }

    // Filter only active categories and sort by rank
    const content = section.content as unknown as ShopByCategoryContent
    const activeCategories = (content.categories || [])
      .filter((category: ShopByCategoryItem) => category.status === true)
      .sort((a: ShopByCategoryItem, b: ShopByCategoryItem) => a.rank - b.rank)

    return successResponse(c, cmsMessages.SHOP_BY_CATEGORY_FETCHED, { categories: activeCategories })
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /homepage/media-grid - Get active media grid items (public)
cmsStorefrontRoutes.get('/homepage/media-grid', async (c) => {
  try {
    const section = await cmsService.getSectionBySlug('homepage-media-grid')

    if (!section) {
      return successResponse(c, cmsMessages.MEDIA_GRID_FETCHED, { items: [] })
    }

    // Filter only active items and sort by rank
    const content = section.content as unknown as MediaGridContent
    const activeItems = (content.items || [])
      .filter((item: MediaGridItem) => item.status === true)
      .sort((a: MediaGridItem, b: MediaGridItem) => a.rank - b.rank)

    return successResponse(c, cmsMessages.MEDIA_GRID_FETCHED, { items: activeItems })
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /homepage/luminique-collection - Get active luminique collection items (public)
cmsStorefrontRoutes.get('/homepage/luminique-collection', async (c) => {
  try {
    const section = await cmsService.getSectionBySlug('homepage-luminique-collection')

    if (!section) {
      return successResponse(c, cmsMessages.LUMINIQUE_COLLECTION_FETCHED, { items: [] })
    }

    // Filter only active items and sort by rank
    const content = section.content as unknown as LuminiqueCollectionContent
    const activeItems = (content.items || [])
      .filter((item: LuminiqueCollectionItem) => item.status === true)
      .sort((a: LuminiqueCollectionItem, b: LuminiqueCollectionItem) => a.rank - b.rank)

    return successResponse(c, cmsMessages.LUMINIQUE_COLLECTION_FETCHED, { items: activeItems })
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /homepage/about-luminique - Get about luminique content (public)
cmsStorefrontRoutes.get('/homepage/about-luminique', async (c) => {
  try {
    const section = await cmsService.getSectionBySlug('homepage-about-luminique')

    if (!section) {
      return successResponse(c, cmsMessages.ABOUT_LUMINIQUE_FETCHED, null)
    }

    // Return the content directly (no array, no status filter)
    const content = section.content as unknown as AboutLuminiqueContent
    return successResponse(c, cmsMessages.ABOUT_LUMINIQUE_FETCHED, content)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /homepage/luminique-trust - Get luminique trust content (public)
cmsStorefrontRoutes.get('/homepage/luminique-trust', async (c) => {
  try {
    const section = await cmsService.getSectionBySlug('homepage-luminique-trust')

    if (!section) {
      return successResponse(c, cmsMessages.LUMINIQUE_TRUST_FETCHED, null)
    }

    // Return the content directly (title, subtext, and trusts array)
    const content = section.content as unknown as LuminiqueTrustContent
    return successResponse(c, cmsMessages.LUMINIQUE_TRUST_FETCHED, content)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /homepage/faq - Get active FAQ items (public)
cmsStorefrontRoutes.get('/homepage/faq', async (c) => {
  try {
    const section = await cmsService.getSectionBySlug('homepage-faq')

    if (!section) {
      return successResponse(c, cmsMessages.FAQ_FETCHED, { items: [] })
    }

    // Filter only active items and sort by rank
    const content = section.content as unknown as FAQContent
    const activeItems = (content.items || [])
      .filter((item: FAQItem) => item.status === true)
      .sort((a: FAQItem, b: FAQItem) => a.rank - b.rank)

    return successResponse(c, cmsMessages.FAQ_FETCHED, { items: activeItems })
  } catch (error) {
    return errorHandler(error, c)
  }
})

// ============================================
// POLICY PAGES
// ============================================

// GET /policy-pages/lifetime-exchange - Get lifetime exchange content (public)
cmsStorefrontRoutes.get('/policy-pages/lifetime-exchange', async (c) => {
  try {
    const section = await cmsService.getSectionBySlug('lifetime-exchange')

    if (!section) {
      return successResponse(c, cmsMessages.LIFETIME_EXCHANGE_FETCHED, null)
    }

    // Return the content directly
    const content = section.content as unknown as LifetimeExchangeContent
    return successResponse(c, cmsMessages.LIFETIME_EXCHANGE_FETCHED, content)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /policy-pages/return-policy - Get return policy content (public)
cmsStorefrontRoutes.get('/policy-pages/return-policy', async (c) => {
  try {
    const section = await cmsService.getSectionBySlug('return-policy')

    if (!section) {
      return successResponse(c, cmsMessages.RETURN_POLICY_FETCHED, null)
    }

    // Return the content directly
    const content = section.content as unknown as ReturnPolicyContent
    return successResponse(c, cmsMessages.RETURN_POLICY_FETCHED, content)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /policy-pages/resize-repair - Get resize and repair content (public)
cmsStorefrontRoutes.get('/policy-pages/resize-repair', async (c) => {
  try {
    const section = await cmsService.getSectionBySlug('resize-repair')

    if (!section) {
      return successResponse(c, cmsMessages.RESIZE_REPAIR_FETCHED, null)
    }

    // Return the content directly
    const content = section.content as unknown as ResizeRepairContent
    return successResponse(c, cmsMessages.RESIZE_REPAIR_FETCHED, content)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /policy-pages/cancellation-policy - Get cancellation policy content (public)
cmsStorefrontRoutes.get('/policy-pages/cancellation-policy', async (c) => {
  try {
    const section = await cmsService.getSectionBySlug('cancellation-policy')

    if (!section) {
      return successResponse(c, cmsMessages.CANCELLATION_POLICY_FETCHED, null)
    }

    // Return the content directly
    const content = section.content as unknown as CancellationPolicyContent
    return successResponse(c, cmsMessages.CANCELLATION_POLICY_FETCHED, content)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /policy-pages/shipping-policy - Get shipping policy content (public)
cmsStorefrontRoutes.get('/policy-pages/shipping-policy', async (c) => {
  try {
    const section = await cmsService.getSectionBySlug('shipping-policy')

    if (!section) {
      return successResponse(c, cmsMessages.SHIPPING_POLICY_FETCHED, null)
    }

    // Return the content directly
    const content = section.content as unknown as ShippingPolicyContent
    return successResponse(c, cmsMessages.SHIPPING_POLICY_FETCHED, content)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /policy-pages/privacy-policy - Get privacy policy content (public)
cmsStorefrontRoutes.get('/policy-pages/privacy-policy', async (c) => {
  try {
    const section = await cmsService.getSectionBySlug('privacy-policy')

    if (!section) {
      return successResponse(c, cmsMessages.PRIVACY_POLICY_FETCHED, null)
    }

    // Return the content directly
    const content = section.content as unknown as PrivacyPolicyContent
    return successResponse(c, cmsMessages.PRIVACY_POLICY_FETCHED, content)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /policy-pages/terms-conditions - Get terms and conditions content (public)
cmsStorefrontRoutes.get('/policy-pages/terms-conditions', async (c) => {
  try {
    const section = await cmsService.getSectionBySlug('terms-conditions')

    if (!section) {
      return successResponse(c, cmsMessages.TERMS_CONDITIONS_FETCHED, null)
    }

    // Return the content directly
    const content = section.content as unknown as TermsConditionsContent
    return successResponse(c, cmsMessages.TERMS_CONDITIONS_FETCHED, content)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// ============================================
// FAQS
// ============================================

// GET /faqs - Get all active FAQs grouped by type (public)
cmsStorefrontRoutes.get('/faqs', async (c) => {
  try {
    const section = await cmsService.getSectionBySlug('faqs')

    // Initialize empty response with all types
    const groupedFaqs: FAQsGroupedResponse = {
      orders: [],
      shipping: [],
      productions: [],
      returns: [],
      repairs: [],
      sizing: [],
    }

    if (!section) {
      return successResponse(c, cmsMessages.FAQS_FETCHED, groupedFaqs)
    }

    const content = section.content as unknown as FAQsContent
    const items = content.items || []

    // Filter active items and group by type
    items
      .filter((item: FAQsSectionItem) => item.status === true)
      .sort((a: FAQsSectionItem, b: FAQsSectionItem) => a.rank - b.rank)
      .forEach((item: FAQsSectionItem) => {
        const { id, question, answer, rank } = item
        const faqData = { id, question, answer, rank }

        if (item.type in groupedFaqs) {
          groupedFaqs[item.type as keyof FAQsGroupedResponse].push(faqData)
        }
      })

    return successResponse(c, cmsMessages.FAQS_FETCHED, groupedFaqs)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// ============================================
// ABOUT US
// ============================================

// GET /about-us - Get about us content (public)
cmsStorefrontRoutes.get('/about-us', async (c) => {
  try {
    const section = await cmsService.getSectionBySlug('about-us')

    if (!section) {
      return successResponse(c, cmsMessages.ABOUT_US_FETCHED, null)
    }

    // Return the content directly
    const content = section.content as unknown as AboutUsContent
    return successResponse(c, cmsMessages.ABOUT_US_FETCHED, content)
  } catch (error) {
    return errorHandler(error, c)
  }
})
