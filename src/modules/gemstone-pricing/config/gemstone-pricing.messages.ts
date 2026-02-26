export const gemstonePricingMessages = {
  // Success
  LIST_FETCHED: 'Gemstone prices fetched successfully',
  FETCHED: 'Gemstone price fetched successfully',
  CREATED: 'Gemstone price created successfully',
  UPDATED: 'Gemstone price updated successfully',
  DELETED: 'Gemstone price deleted successfully',

  // Dependency check
  NO_DEPENDENCIES: 'No dependencies found',
  HAS_DEPENDENCIES: 'Gemstone pricing has dependencies',

  // Errors
  NOT_FOUND: 'Gemstone price not found',
  DUPLICATE_ENTRY: 'A price entry with this combination already exists',
  INVALID_GEMSTONE_TYPE: 'Invalid gemstone type',
  INVALID_SHAPE: 'Invalid stone shape',
  INVALID_QUALITY: 'Invalid gemstone quality',
  INVALID_COLOR: 'Invalid gemstone color',
  INVALID_CARAT_RANGE: 'Carat from must be less than carat to',

  // ============ Bulk Operations ============

  // Bulk success messages
  BULK_CREATE_SUCCESS: 'Successfully created {count} gemstone price entries',
  BULK_UPDATE_SUCCESS: 'Bulk update completed successfully',
  BULK_UPDATE_PARTIAL: 'Bulk update completed with some errors',
  EXPORT_SUCCESS: 'Gemstone prices exported successfully',
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
  INVALID_GEMSTONE_TYPE_SLUG: "Invalid gemstone type slug: '{slug}'. Check reference data for valid options.",
  INVALID_SHAPE_SLUG: "Invalid shape slug: '{slug}'. Check reference data for valid options.",
  INVALID_QUALITY_SLUG: "Invalid quality slug: '{slug}'. Check reference data for valid options.",
  INVALID_COLOR_SLUG: "Invalid color slug: '{slug}'. Check reference data for valid options.",
  DUPLICATE_EXISTS: 'Duplicate entry already exists for {type} + {shape} + {quality} + {color} + {from}-{to}',
  PRICE_NOT_FOUND: 'Price entry not found with ID: {id}',
  INVALID_ID_FORMAT: 'Invalid ID format',

  // Warning message templates
  TYPE_MISMATCH: "Type mismatch: CSV has '{csv}' but record has '{db}'. Price updated anyway.",
  SHAPE_MISMATCH: "Shape mismatch: CSV has '{csv}' but record has '{db}'. Price updated anyway.",
  QUALITY_MISMATCH: "Quality mismatch: CSV has '{csv}' but record has '{db}'. Price updated anyway.",
  COLOR_MISMATCH: "Color mismatch: CSV has '{csv}' but record has '{db}'. Price updated anyway.",
  CARAT_MISMATCH: "Carat range mismatch: CSV has '{csvFrom}-{csvTo}' but record has '{dbFrom}-{dbTo}'. Price updated anyway.",
}
