export const makingChargeMessages = {
  // Success
  LIST_FETCHED: 'Making charges fetched successfully',
  FETCHED: 'Making charge fetched successfully',
  CREATED: 'Making charge created successfully',
  UPDATED: 'Making charge updated successfully',
  DELETED: 'Making charge deleted successfully',

  // Errors
  NOT_FOUND: 'Making charge not found',
  INVALID_ID: 'Invalid making charge ID',
  METAL_TYPE_NOT_FOUND: 'Metal type not found',
  METAL_TYPE_REQUIRED: 'Metal type is required',
  FROM_REQUIRED: 'From weight is required',
  TO_REQUIRED: 'To weight is required',
  AMOUNT_REQUIRED: 'Amount is required',
  INVALID_WEIGHT_RANGE: 'From weight must be less than To weight',
  AMOUNT_MUST_BE_POSITIVE: 'Amount must be positive',
  PERCENTAGE_EXCEEDS_LIMIT: 'Percentage cannot exceed 100',
  RANGE_OVERLAP: 'Weight range overlaps with an existing entry for this metal type',
}
