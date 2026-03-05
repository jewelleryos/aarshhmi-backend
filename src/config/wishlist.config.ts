/**
 * Wishlist Configuration
 * Hardcoded — change requires rebuild/redeploy
 */
export const WISHLIST_CONFIG = {
  /** 'auth_only' = login required, 'guest_allowed' = guests get server-side wishlist */
  wishlistMode: 'guest_allowed' as 'auth_only' | 'guest_allowed',

  /** Days before guest wishlists are cleaned up */
  guestWishlistExpiryDays: 30,

  /** Max items per wishlist */
  maxWishlistItems: 50,
} as const
