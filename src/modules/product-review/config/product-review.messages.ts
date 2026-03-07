export const productReviewMessages = {
  // Success
  LIST_FETCHED: 'Product reviews fetched successfully',
  FETCHED: 'Product review fetched successfully',
  CREATED: 'Product review created successfully',
  UPDATED: 'Product review updated successfully',
  DELETED: 'Product review deleted successfully',
  APPROVAL_UPDATED: 'Review approval status updated successfully',
  STATUS_UPDATED: 'Review status updated successfully',

  // Errors
  NOT_FOUND: 'Product review not found',
  PRODUCT_NOT_FOUND: 'Product not found or inactive',
  CANNOT_EDIT_USER_REVIEW: 'User-generated reviews cannot be edited by admin',
  CANNOT_CHANGE_SYSTEM_APPROVAL: 'System-generated reviews always have approved status',
  INVALID_APPROVAL_TRANSITION: 'Cannot change approval status back to pending',
  REVIEW_DATE_BEFORE_ORDER: 'Review date cannot be before order date',
  ORDER_DATE_FUTURE: 'Order date cannot be in the future',
}
