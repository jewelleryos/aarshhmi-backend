import { Hono } from 'hono'
import { heroDesktopBannerRoutes } from './homepage/hero-desktop-banner.routes'
import { heroMobileBannerRoutes } from './homepage/hero-mobile-banner.routes'
import { shopByCategoryRoutes } from './homepage/shop-by-category.routes'
import { mediaGridRoutes } from './homepage/media-grid.routes'
import { luminiqueCollectionRoutes } from './homepage/luminique-collection.routes'
import { aboutLuminiqueRoutes } from './homepage/about-luminique.routes'
import { luminiqueTrustRoutes } from './homepage/luminique-trust.routes'
import { faqRoutes } from './homepage/faq.routes'
import { lifetimeExchangeRoutes } from './policy-pages/lifetime-exchange.routes'
import { returnPolicyRoutes } from './policy-pages/return-policy.routes'
import { resizeRepairRoutes } from './policy-pages/resize-repair.routes'
import { cancellationPolicyRoutes } from './policy-pages/cancellation-policy.routes'
import { shippingPolicyRoutes } from './policy-pages/shipping-policy.routes'
import { privacyPolicyRoutes } from './policy-pages/privacy-policy.routes'
import { termsConditionsRoutes } from './policy-pages/terms-conditions.routes'
import { faqsRoutes } from './faqs/faqs.routes'
import { aboutUsRoutes } from './about-us/about-us.routes'
import type { AppEnv } from '../../../types/hono.types'

export const cmsRoutes = new Hono<AppEnv>()

// Mount homepage routes
cmsRoutes.route('/homepage/hero-desktop-banner', heroDesktopBannerRoutes)
cmsRoutes.route('/homepage/hero-mobile-banner', heroMobileBannerRoutes)
cmsRoutes.route('/homepage/shop-by-category', shopByCategoryRoutes)
cmsRoutes.route('/homepage/media-grid', mediaGridRoutes)
cmsRoutes.route('/homepage/luminique-collection', luminiqueCollectionRoutes)
cmsRoutes.route('/homepage/about-luminique', aboutLuminiqueRoutes)
cmsRoutes.route('/homepage/luminique-trust', luminiqueTrustRoutes)
cmsRoutes.route('/homepage/faq', faqRoutes)

// Mount policy pages routes
cmsRoutes.route('/policy-pages/lifetime-exchange', lifetimeExchangeRoutes)
cmsRoutes.route('/policy-pages/return-policy', returnPolicyRoutes)
cmsRoutes.route('/policy-pages/resize-repair', resizeRepairRoutes)
cmsRoutes.route('/policy-pages/cancellation-policy', cancellationPolicyRoutes)
cmsRoutes.route('/policy-pages/shipping-policy', shippingPolicyRoutes)
cmsRoutes.route('/policy-pages/privacy-policy', privacyPolicyRoutes)
cmsRoutes.route('/policy-pages/terms-conditions', termsConditionsRoutes)

// Mount FAQs routes
cmsRoutes.route('/faqs', faqsRoutes)

// Mount About Us routes
cmsRoutes.route('/about-us', aboutUsRoutes)
