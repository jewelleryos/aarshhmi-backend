import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import './lib/db'
import { authRoutes } from './modules/auth/routes/auth.routes'
import { usersRoutes } from './modules/users/routes/users.routes'
import { mediaRoutes } from './modules/media/routes/media.routes'
import { metalTypeRoutes } from './modules/metal-type/routes/metal-type.routes'
import { metalColorRoutes } from './modules/metal-color/routes/metal-color.routes'
import { metalPurityRoutes } from './modules/metal-purity/routes/metal-purity.routes'
import { stoneShapeRoutes } from './modules/stone-shape/routes/stone-shape.routes'
import { gemstoneTypeRoutes } from './modules/gemstone-type/routes/gemstone-type.routes'
import { gemstoneQualityRoutes } from './modules/gemstone-quality/routes/gemstone-quality.routes'
import { gemstoneColorRoutes } from './modules/gemstone-color/routes/gemstone-color.routes'
import { diamondClarityColorRoutes } from './modules/diamond-clarity-color/routes/diamond-clarity-color.routes'
import { diamondPricingRoutes } from './modules/diamond-pricing/routes/diamond-pricing.routes'
import { gemstonePricingRoutes } from './modules/gemstone-pricing/routes/gemstone-pricing.routes'
import { makingChargeRoutes } from './modules/making-charge/routes/making-charge.routes'
import { otherChargeRoutes } from './modules/other-charge/routes/other-charge.routes'
import { pearlTypeRoutes } from './modules/pearl-type/routes/pearl-type.routes'
import { pearlQualityRoutes } from './modules/pearl-quality/routes/pearl-quality.routes'
import { mrpMarkupRoutes } from './modules/mrp-markup/routes/mrp-markup.routes'
import { tagGroupRoutes } from './modules/tag-groups/routes/tag-groups.routes'
import { tagRoutes } from './modules/tags/routes/tags.routes'
import { categoryRoutes } from './modules/categories/routes/categories.routes'
import { badgeRoutes } from './modules/badges/routes/badges.routes'
import { sizeChartGroupRoutes } from './modules/size-chart-groups/routes/size-chart-groups.routes'
import { sizeChartValueRoutes } from './modules/size-chart-values/routes/size-chart-values.routes'
import { productRoutes } from './modules/product/routes/product.routes'
import { pricingRuleRoutes } from './modules/pricing-rule/routes/pricing-rule.routes'
import { storefrontFiltersRoutes } from './modules/storefront-filters/routes/storefront-filters.routes'
import { customerAuthRoutes } from './modules/customer-auth/routes/customer-auth.routes'
import { priceRecalculationRoutes } from './modules/price-recalculation/routes/price-recalculation.routes'


const app = new Hono()

// Middleware
app.use('*', logger())
app.use(
  '*',
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || [],
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
)

// Prevent browser/CDN from caching API responses  ← NEW
app.use('/api/*', async (c, next) => {
  await next()
  c.header('Cache-Control', 'no-store, no-cache, must-revalidate')
  c.header('Pragma', 'no-cache')
  c.header('Expires', '0')
})

// Health check endpoint for server monitoring
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.get('/', (c) => {
  return c.json({ message: 'Aarshhmi API' })
})

// Routes
app.route('/api/auth', authRoutes)
app.route('/api/users', usersRoutes)
app.route('/api/media', mediaRoutes)
app.route('/api/metal-types', metalTypeRoutes)
app.route('/api/metal-colors', metalColorRoutes)
app.route('/api/metal-purities', metalPurityRoutes)
app.route('/api/stone-shapes', stoneShapeRoutes)
app.route('/api/gemstone-types', gemstoneTypeRoutes)
app.route('/api/gemstone-qualities', gemstoneQualityRoutes)
app.route('/api/gemstone-colors', gemstoneColorRoutes)
app.route('/api/diamond-clarity-color', diamondClarityColorRoutes)
app.route('/api/diamond-prices', diamondPricingRoutes)
app.route('/api/gemstone-prices', gemstonePricingRoutes)
app.route('/api/making-charges', makingChargeRoutes)
app.route('/api/other-charges', otherChargeRoutes)
app.route('/api/pearl-types', pearlTypeRoutes)
app.route('/api/pearl-qualities', pearlQualityRoutes)
app.route('/api/mrp-markup', mrpMarkupRoutes)
app.route('/api/tag-groups', tagGroupRoutes)
app.route('/api/tags', tagRoutes)
app.route('/api/categories', categoryRoutes)
app.route('/api/badges', badgeRoutes)
app.route('/api/size-chart-groups', sizeChartGroupRoutes)
app.route('/api/size-chart-values', sizeChartValueRoutes)
app.route('/api/products', productRoutes)
app.route('/api/pricing-rules', pricingRuleRoutes)
app.route('/api/storefront-filters', storefrontFiltersRoutes)
app.route('/api/customer/auth', customerAuthRoutes)
app.route('/api/price-recalculation', priceRecalculationRoutes)



// Server configuration
const port = Number(process.env.PORT) || 3000
const host = process.env.HOST || '0.0.0.0'
const env = process.env.NODE_ENV || 'development'

console.log(`[${env}] Server running at http://${host}:${port}`)

export default {
  port,
  hostname: host,
  fetch: app.fetch,
}
