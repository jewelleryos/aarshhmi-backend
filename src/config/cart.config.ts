/**
 * Cart Configuration
 * Hardcoded — change requires rebuild/redeploy
 */
export const CART_CONFIG = {
  /** 'auth_only' = login required, 'guest_allowed' = guests get server-side cart */
  cartMode: 'guest_allowed' as 'auth_only' | 'guest_allowed',

  /** Days before guest carts are cleaned up */
  guestCartExpiryDays: 30,

  /** Max unique items (rows) per cart */
  maxCartItems: 20,

  /** Max quantity per single cart item */
  maxQuantityPerItem: 5,
} as const
