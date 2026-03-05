export const couponMessages = {
  // CRUD
  CREATED: 'Coupon created successfully',
  UPDATED: 'Coupon updated successfully',
  DELETED: 'Coupon deleted successfully',
  FETCHED: 'Coupon fetched successfully',
  LIST_FETCHED: 'Coupons fetched successfully',
  TYPES_FETCHED: 'Coupon types fetched successfully',

  // Dependency
  NO_DEPENDENCIES: 'No dependencies found. Coupon can be deleted.',
  HAS_DEPENDENCIES: 'Coupon is currently applied to active carts.',

  // Errors — Admin
  NOT_FOUND: 'Coupon not found',
  CODE_ALREADY_EXISTS: 'A coupon with this code already exists',
  INVALID_TYPE: 'Invalid coupon type',
  TYPE_NOT_ENABLED: 'This coupon type is not yet available',
  TYPE_CANNOT_CHANGE: 'Coupon type cannot be changed after creation',
  DISCOUNT_VALUE_REQUIRED: 'Discount value is required for this type',
  DISCOUNT_PERCENT_REQUIRED: 'Discount percentage is required for this type',
  MAX_DISCOUNT_REQUIRED: 'Maximum discount cap is required for percentage types',
  DISCOUNT_TYPE_REQUIRED: 'Discount type (flat or percentage) is required for this type',
  PRODUCT_IDS_REQUIRED: 'Product IDs are required for this coupon type',
  PRODUCT_TARGETING_REQUIRED: 'At least one product-level condition or product IDs required for this coupon type',
  CUSTOMER_EMAILS_REQUIRED: 'Customer emails are required for this coupon type',
  INVALID_CONDITION_FIELD: 'Invalid condition field for this coupon type',
}
