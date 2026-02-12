import { Hono } from 'hono'
import { pricingRuleService } from '../services/pricing-rule.service'
import { pricingRuleMessages } from '../config/pricing-rule.messages'
import {
  createPricingRuleSchema,
  updatePricingRuleSchema,
} from '../config/pricing-rule.schema'
import { successResponse } from '../../../utils/response'
import { errorHandler } from '../../../utils/error-handler'
import { authWithPermission } from '../../../middleware/auth.middleware'
import { PERMISSIONS } from '../../../config/permissions.constants'
import type { AppEnv } from '../../../types/hono.types'
import type { PricingRule } from '../types/pricing-rule.types'

export const pricingRuleRoutes = new Hono<AppEnv>()

// GET /api/pricing-rules - List all pricing rules
pricingRuleRoutes.get('/', authWithPermission(PERMISSIONS.PRICING_RULE.READ), async (c) => {
  try {
    const items = await pricingRuleService.list()
    return successResponse<{ items: PricingRule[] }>(c, pricingRuleMessages.LIST_FETCHED, { items })
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /api/pricing-rules/:id - Get single pricing rule
pricingRuleRoutes.get('/:id', authWithPermission(PERMISSIONS.PRICING_RULE.READ), async (c) => {
  try {
    const id = c.req.param('id')
    const result = await pricingRuleService.getById(id)
    return successResponse<PricingRule>(c, pricingRuleMessages.FETCHED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// POST /api/pricing-rules - Create pricing rule
pricingRuleRoutes.post('/', authWithPermission(PERMISSIONS.PRICING_RULE.CREATE), async (c) => {
  try {
    const body = await c.req.json()
    const data = createPricingRuleSchema.parse(body)
    const result = await pricingRuleService.create(data)
    return successResponse<PricingRule>(c, pricingRuleMessages.CREATED, result, 201)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// PUT /api/pricing-rules/:id - Update pricing rule
pricingRuleRoutes.put('/:id', authWithPermission(PERMISSIONS.PRICING_RULE.UPDATE), async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()
    const data = updatePricingRuleSchema.parse(body)
    const result = await pricingRuleService.update(id, data)
    return successResponse<PricingRule>(c, pricingRuleMessages.UPDATED, result)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// DELETE /api/pricing-rules/:id - Delete pricing rule
pricingRuleRoutes.delete('/:id', authWithPermission(PERMISSIONS.PRICING_RULE.DELETE), async (c) => {
  try {
    const id = c.req.param('id')
    await pricingRuleService.delete(id)
    return successResponse(c, pricingRuleMessages.DELETED, null)
  } catch (error) {
    return errorHandler(error, c)
  }
})
