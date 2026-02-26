import { Hono } from 'hono'
import { customerAuth } from '../../customer-auth/middleware/customer-auth.middleware'
import { customerAuthOptional } from '../../customer-auth/middleware/customer-auth-optional.middleware'
import { wishlistService } from '../services/wishlist.service'
import { wishlistMessages } from '../config/wishlist.messages'
import { toggleWishlistSchema, checkWishlistSchema, mergeWishlistSchema } from '../config/wishlist.schema'
import { successResponse } from '../../../utils/response'
import { errorHandler } from '../../../utils/error-handler'
import type { AppEnv } from '../../../types/hono.types'
import type { AuthCustomer } from '../../customer-auth/middleware/customer-auth.middleware'

export const wishlistRoutes = new Hono<AppEnv>()

// POST /toggle — add or remove wishlist item
wishlistRoutes.post('/toggle', customerAuthOptional(), async (c) => {
  try {
    const customer = c.get('customer') as AuthCustomer | undefined
    const body = await c.req.json()
    const data = toggleWishlistSchema.parse(body)

    const { response, added } = await wishlistService.toggle(
      customer,
      data.product_id,
      data.variant_id,
      data.wishlist_id
    )

    return successResponse(
      c,
      added ? wishlistMessages.ITEM_ADDED : wishlistMessages.ITEM_REMOVED,
      response
    )
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET / — get wishlist items
wishlistRoutes.get('/', customerAuthOptional(), async (c) => {
  try {
    const customer = c.get('customer') as AuthCustomer | undefined
    const wishlistId = c.req.query('wishlist_id')

    const response = await wishlistService.getWishlist(customer, wishlistId)

    return successResponse(c, wishlistMessages.FETCHED, response)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// DELETE /items/:item_id — remove specific item
wishlistRoutes.delete('/items/:item_id', customerAuthOptional(), async (c) => {
  try {
    const customer = c.get('customer') as AuthCustomer | undefined
    const itemId = c.req.param('item_id')
    const wishlistId = c.req.query('wishlist_id')

    const response = await wishlistService.removeItem(customer, itemId, wishlistId)

    return successResponse(c, wishlistMessages.ITEM_REMOVED, response)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// POST /check — bulk check which variants are wishlisted
wishlistRoutes.post('/check', customerAuthOptional(), async (c) => {
  try {
    const customer = c.get('customer') as AuthCustomer | undefined
    const body = await c.req.json()
    const data = checkWishlistSchema.parse(body)

    const response = await wishlistService.check(
      customer,
      data.variant_ids,
      data.wishlist_id
    )

    return successResponse(c, wishlistMessages.CHECKED, response)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /count — item count for header badge
wishlistRoutes.get('/count', customerAuthOptional(), async (c) => {
  try {
    const customer = c.get('customer') as AuthCustomer | undefined
    const wishlistId = c.req.query('wishlist_id')

    const response = await wishlistService.getCount(customer, wishlistId)

    return successResponse(c, wishlistMessages.COUNT_FETCHED, response)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// POST /merge — merge guest wishlist into user's wishlist (requires login)
wishlistRoutes.post('/merge', customerAuth(), async (c) => {
  try {
    const customer = c.get('customer') as AuthCustomer
    const body = await c.req.json()
    const data = mergeWishlistSchema.parse(body)

    const response = await wishlistService.merge(customer.id, data.wishlist_id)

    return successResponse(c, wishlistMessages.MERGED, response)
  } catch (error) {
    return errorHandler(error, c)
  }
})
