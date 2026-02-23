/**
 * Product Type Configuration
 *
 * Static product types for price calculation logic.
 * These are internal types - for user-defined categorization, use Tag Groups.
 */

/**
 * Variant SKU Component Configuration
 * - key: The component identifier
 * - separator: Starting separator for this component (empty string = no separator)
 */
interface VariantSkuComponent {
  key: 'productSku' | 'metalType' | 'metalColor' | 'metalPurity' | 'diamondClarityColor' | 'gemstoneColor'
  separator: string
}

export const PRODUCT_TYPES = {
  JEWELLERY_DEFAULT: {
    code: 'JEWELLERY_DEFAULT',
    name: 'Jewellery (Default)',
    description: 'Standard jewellery with metal and optional stones',

    /**
     * Variant SKU Configuration
     * Components are in order, separator is the starting separator for each component
     * Optional components (diamondClarityColor, gemstoneColor) are skipped if not present
     */
    variantSkuConfig: {
      components: [
        { key: 'productSku', separator: '' },
        { key: 'metalPurity', separator: '_' },
        { key: 'metalColor', separator: '' },
        { key: 'metalType', separator: '' },
        { key: 'diamondClarityColor', separator: '-' },
        { key: 'gemstoneColor', separator: '-' },
      ] as VariantSkuComponent[]
    }
  },
} as const

export type ProductTypeCode = keyof typeof PRODUCT_TYPES
export type ProductTypeConfig = (typeof PRODUCT_TYPES)[ProductTypeCode]

/**
 * Get product type configuration by code
 */
export function getProductTypeConfig(code: ProductTypeCode): ProductTypeConfig {
  return PRODUCT_TYPES[code]
}

/**
 * Get all product types for dropdown lists
 */
export function getProductTypesList() {
  return Object.values(PRODUCT_TYPES).map((pt) => ({
    code: pt.code,
    name: pt.name,
    description: pt.description,
  }))
}

/**
 * Check if a product type code is valid
 */
export function isValidProductType(code: string): code is ProductTypeCode {
  return code in PRODUCT_TYPES
}
