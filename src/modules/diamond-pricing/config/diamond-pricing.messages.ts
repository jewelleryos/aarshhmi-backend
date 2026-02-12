export const diamondPricingMessages = {
  // Success
  LIST_FETCHED: 'Diamond prices fetched successfully',
  FETCHED: 'Diamond price fetched successfully',
  CREATED: 'Diamond price created successfully',
  UPDATED: 'Diamond price updated successfully',
  DELETED: 'Diamond price deleted successfully',

  // Errors
  NOT_FOUND: 'Diamond price not found',
  DUPLICATE_ENTRY: 'A price entry with this combination already exists',
  INVALID_SHAPE: 'Invalid stone shape',
  INVALID_QUALITY: 'Invalid diamond clarity/color',
  INVALID_CARAT_RANGE: 'Carat from must be less than carat to',

  // ============ Bulk Operations ============

  // Bulk success messages
  BULK_CREATE_SUCCESS: 'Successfully created {count} diamond price entries',
  BULK_UPDATE_SUCCESS: 'Bulk update completed successfully',
  BULK_UPDATE_PARTIAL: 'Bulk update completed with some errors',
  EXPORT_SUCCESS: 'Diamond prices exported successfully',
  TEMPLATE_GENERATED: 'Template generated successfully',
  REFERENCE_GENERATED: 'Reference data generated successfully',

  // File validation errors
  NO_FILE_PROVIDED: 'No file provided',
  INVALID_FILE_TYPE: 'Only CSV files (.csv) are allowed',
  FILE_TOO_LARGE: 'File size exceeds 5MB limit',
  FILE_EMPTY: 'File contains no data rows',
  TOO_MANY_ROWS: 'File exceeds maximum of 10,000 rows',

  // Header validation errors
  INVALID_HEADERS: 'Invalid headers',

  // Bulk create errors
  BULK_CREATE_FAILED: 'Bulk create failed. Please fix all errors and try again.',

  // Row-level error message templates
  INVALID_SHAPE_SLUG: "Invalid shape slug: '{slug}'. Check reference data for valid options.",
  INVALID_QUALITY_SLUG: "Invalid clarity/color slug: '{slug}'. Check reference data for valid options.",
  DUPLICATE_EXISTS: 'Duplicate entry already exists for {shape} + {quality} + {from}-{to}',
  PRICE_NOT_FOUND: 'Price entry not found with ID: {id}',
  INVALID_ID_FORMAT: 'Invalid ID format',

  // Warning message templates
  SHAPE_MISMATCH: "Shape mismatch: CSV has '{csv}' but record has '{db}'. Price updated anyway.",
  QUALITY_MISMATCH: "Clarity/color mismatch: CSV has '{csv}' but record has '{db}'. Price updated anyway.",
  CARAT_MISMATCH: "Carat range mismatch: CSV has '{csvFrom}-{csvTo}' but record has '{dbFrom}-{dbTo}'. Price updated anyway.",
}
