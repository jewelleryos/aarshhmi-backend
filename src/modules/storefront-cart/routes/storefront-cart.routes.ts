import { Hono } from 'hono'
import { customerAuth } from '../../customer-auth/middleware/customer-auth.middleware'
import { customerAuthOptional } from '../../customer-auth/middleware/customer-auth-optional.middleware'
import { storefrontCartService } from '../services/storefront-cart.service'
import { storefrontCartMessages } from '../config/storefront-cart.messages'
import {
  addToCartSchema,
  updateCartItemSchema,
  mergeCartSchema,
  moveToWishlistSchema,
  moveToCartSchema,
} from '../config/storefront-cart.schema'
import { successResponse } from '../../../utils/response'
import { errorHandler } from '../../../utils/error-handler'
import type { AppEnv } from '../../../types/hono.types'
import type { AuthCustomer } from '../../customer-auth/middleware/customer-auth.middleware'

export const storefrontCartRoutes = new Hono<AppEnv>()

// GET / — fetch cart with latest prices
storefrontCartRoutes.get('/', customerAuthOptional(), async (c) => {
  try {
    const customer = c.get('customer') as AuthCustomer | undefined
    const cartId = c.req.query('cart_id')

    const response = await storefrontCartService.getCart(customer, cartId)

    return successResponse(c, storefrontCartMessages.FETCHED, response)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// POST /items — add item to cart
storefrontCartRoutes.post('/items', customerAuthOptional(), async (c) => {
  try {
    const customer = c.get('customer') as AuthCustomer | undefined
    const body = await c.req.json()
    const data = addToCartSchema.parse(body)

    const response = await storefrontCartService.addItem(
      customer,
      data.product_id,
      data.variant_id,
      data.size_chart_value_id,
      data.quantity,
      data.cart_id
    )

    return successResponse(c, storefrontCartMessages.ITEM_ADDED, response)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// PATCH /items/:item_id — update quantity / size
storefrontCartRoutes.patch('/items/:item_id', customerAuthOptional(), async (c) => {
  try {
    const customer = c.get('customer') as AuthCustomer | undefined
    const itemId = c.req.param('item_id')
    const body = await c.req.json()
    const data = updateCartItemSchema.parse(body)

    const response = await storefrontCartService.updateItem(
      customer,
      itemId,
      data.quantity,
      data.size_chart_value_id,
      data.cart_id
    )

    return successResponse(c, storefrontCartMessages.ITEM_UPDATED, response)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// DELETE /items/:item_id — remove item
storefrontCartRoutes.delete('/items/:item_id', customerAuthOptional(), async (c) => {
  try {
    const customer = c.get('customer') as AuthCustomer | undefined
    const itemId = c.req.param('item_id')
    const cartId = c.req.query('cart_id')

    const response = await storefrontCartService.removeItem(customer, itemId, cartId)

    return successResponse(c, storefrontCartMessages.ITEM_REMOVED, response)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// GET /count — item count for header badge
storefrontCartRoutes.get('/count', customerAuthOptional(), async (c) => {
  try {
    const customer = c.get('customer') as AuthCustomer | undefined
    const cartId = c.req.query('cart_id')

    const response = await storefrontCartService.getCount(customer, cartId)

    return successResponse(c, storefrontCartMessages.COUNT_FETCHED, response)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// POST /merge — merge guest cart on login (requires auth)
storefrontCartRoutes.post('/merge', customerAuth(), async (c) => {
  try {
    const customer = c.get('customer') as AuthCustomer
    const body = await c.req.json()
    const data = mergeCartSchema.parse(body)

    const response = await storefrontCartService.merge(customer.id, data.cart_id)

    return successResponse(c, storefrontCartMessages.MERGED, response)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// POST /items/:item_id/move-to-wishlist — move cart item to wishlist
storefrontCartRoutes.post('/items/:item_id/move-to-wishlist', customerAuthOptional(), async (c) => {
  try {
    const customer = c.get('customer') as AuthCustomer | undefined
    const itemId = c.req.param('item_id')
    const body = await c.req.json()
    const data = moveToWishlistSchema.parse(body)

    const response = await storefrontCartService.moveToWishlist(
      customer,
      itemId,
      data.cart_id,
      data.wishlist_id
    )

    return successResponse(c, storefrontCartMessages.MOVED_TO_WISHLIST, response)
  } catch (error) {
    return errorHandler(error, c)
  }
})

// POST /move-to-cart — move wishlist item to cart
storefrontCartRoutes.post('/move-to-cart', customerAuthOptional(), async (c) => {
  try {
    const customer = c.get('customer') as AuthCustomer | undefined
    const body = await c.req.json()
    const data = moveToCartSchema.parse(body)

    const response = await storefrontCartService.moveToCart(
      customer,
      data.wishlist_item_id,
      data.size_chart_value_id,
      data.cart_id,
      data.wishlist_id
    )

    return successResponse(c, storefrontCartMessages.MOVED_TO_CART, response)
  } catch (error) {
    return errorHandler(error, c)
  }
})
