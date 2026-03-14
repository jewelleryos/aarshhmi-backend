export const storefrontOrderMessages = {
  // Success
  ORDER_CREATED: 'Order created successfully',
  PAYMENT_VERIFIED: 'Payment verified successfully',
  ORDERS_FETCHED: 'Orders fetched successfully',
  ORDER_FETCHED: 'Order details fetched successfully',

  // Errors — Cart
  CART_EMPTY: 'Your cart is empty',
  CART_HAS_UNAVAILABLE_ITEMS: 'Some items in your cart are no longer available. Please remove them before checkout',
  CART_PRICE_CHANGED: 'Prices have changed for some items in your cart. Please review before checkout',

  // Errors — Payment
  PAYMENT_VERIFICATION_FAILED: 'Payment verification failed',
  PAYMENT_ALREADY_PROCESSED: 'Payment has already been processed for this order',
  ORDER_NOT_PENDING_PAYMENT: 'This order is not pending payment',

  // Errors — Order
  ORDER_NOT_FOUND: 'Order not found',

  // Cancellation
  CANCEL_REQUESTED: 'Cancellation request submitted successfully',
  CANCEL_NOT_ALLOWED: 'This sub-order cannot be cancelled',
  CANCELLATION_WINDOW_EXPIRED: 'Cancellation window has expired',
  CANCEL_REASON_REQUIRED: 'Cancellation reason is required',

  // Return
  RETURN_REQUESTED: 'Return request submitted successfully',
  RETURN_NOT_ALLOWED: 'This sub-order cannot be returned',
  RETURN_WINDOW_EXPIRED: 'Return window has expired',
  RETURN_REASON_REQUIRED: 'Return reason is required',
  RETURN_TOO_MANY_FILES: 'You can upload a maximum of 5 files (images or videos)',
  RETURN_INVALID_FILE_TYPE: 'Only images (jpg, png, webp, gif) and videos (mp4) are allowed',
  RETURN_FILE_TOO_LARGE: 'File size exceeds the allowed limit (10MB for images, 100MB for videos)',
  RETURN_FILE_UPLOAD_FAILED: 'Failed to upload return media. Please try again',
}
