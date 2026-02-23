import { db } from '../lib/db'
import type { DependencyItem } from '../types/dependency-check.types'

/**
 * Get products that use a specific entity via product_option_values.
 * Works for: metal_type, metal_color, metal_purity, diamond_clarity_color, gemstone_color
 *
 * @param optionName - The product option name (e.g., 'metal_type', 'metal_color')
 * @param entityId - The ID of the entity being checked
 */
export async function getProductDependenciesByOptionValue(
  optionName: string,
  entityId: string
): Promise<DependencyItem[]> {
  const result = await db.query(
    `SELECT DISTINCT p.id, p.name, p.base_sku AS sku
     FROM products p
     JOIN product_options po ON po.product_id = p.id AND po.name = $1
     JOIN product_option_values pov ON pov.option_id = po.id AND pov.value = $2
     WHERE p.status != 'archived'
     ORDER BY p.name`,
    [optionName, entityId]
  )
  return result.rows
}
