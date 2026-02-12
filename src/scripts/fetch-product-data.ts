/**
 * Script to fetch complete product data by ID (Single Query)
 *
 * Usage: bun run src/scripts/fetch-product-data.ts <product_id>
 * Example: bun run src/scripts/fetch-product-data.ts prod_06E0M4Q5MTM99DJY8TAAQ1SBP0
 */

import { Pool } from 'pg'
import { writeFileSync } from 'fs'
import { join } from 'path'

const productId = process.argv[2]

if (!productId) {
  console.error('Usage: bun run src/scripts/fetch-product-data.ts <product_id>')
  process.exit(1)
}

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
})

async function fetchProductData(id: string) {
  console.log(`Fetching product data for ID: ${id}`)

  // Single query with all data using JSON aggregation
  const result = await db.query(
    `
    SELECT
      -- Main product data
      p.*,

      -- Options with their values (nested JSON)
      (
        SELECT COALESCE(json_agg(
          json_build_object(
            'id', po.id,
            'name', po.name,
            'rank', po.rank,
            'values', (
              SELECT COALESCE(json_agg(
                json_build_object(
                  'id', pov.id,
                  'value', pov.value,
                  'rank', pov.rank
                ) ORDER BY pov.rank
              ), '[]'::json)
              FROM product_option_values pov
              WHERE pov.option_id = po.id
            )
          ) ORDER BY po.rank
        ), '[]'::json)
        FROM product_options po
        WHERE po.product_id = p.id
      ) as options,

      -- Variants with their option values (nested JSON)
      (
        SELECT COALESCE(json_agg(
          json_build_object(
            'id', pv.id,
            'sku', pv.sku,
            'variant_name', pv.variant_name,
            'price', pv.price,
            'compare_at_price', pv.compare_at_price,
            'cost_price', pv.cost_price,
            'price_components', pv.price_components,
            'is_default', pv.is_default,
            'is_available', pv.is_available,
            'stock_quantity', pv.stock_quantity,
            'metadata', pv.metadata,
            'option_values', (
              SELECT COALESCE(json_agg(
                json_build_object(
                  'option_name', po.name,
                  'option_value_id', pov.id,
                  'value', pov.value
                ) ORDER BY po.rank
              ), '[]'::json)
              FROM variant_option_values vov
              JOIN product_option_values pov ON vov.option_value_id = pov.id
              JOIN product_options po ON pov.option_id = po.id
              WHERE vov.variant_id = pv.id
            )
          ) ORDER BY pv.is_default DESC, pv.created_at
        ), '[]'::json)
        FROM product_variants pv
        WHERE pv.product_id = p.id
      ) as variants,

      -- Categories
      (
        SELECT COALESCE(json_agg(
          json_build_object(
            'id', c.id,
            'name', c.name,
            'slug', c.slug,
            'is_primary', pc.is_primary
          ) ORDER BY pc.is_primary DESC
        ), '[]'::json)
        FROM product_categories pc
        JOIN categories c ON pc.category_id = c.id
        WHERE pc.product_id = p.id
      ) as categories,

      -- Tags (with group info)
      (
        SELECT COALESCE(json_agg(
          json_build_object(
            'id', t.id,
            'name', t.name,
            'slug', t.slug,
            'tag_group_id', t.tag_group_id,
            'tag_group_name', tg.name,
            'is_system_generated', t.is_system_generated
          ) ORDER BY tg.rank, t.rank
        ), '[]'::json)
        FROM product_tags pt
        JOIN tags t ON pt.tag_id = t.id
        JOIN tag_groups tg ON t.tag_group_id = tg.id
        WHERE pt.product_id = p.id
      ) as tags,

      -- Badges
      (
        SELECT COALESCE(json_agg(
          json_build_object(
            'id', b.id,
            'name', b.name,
            'slug', b.slug,
            'bg_color', b.bg_color,
            'font_color', b.font_color
          ) ORDER BY b.position
        ), '[]'::json)
        FROM product_badges pb
        JOIN badges b ON pb.badge_id = b.id
        WHERE pb.product_id = p.id
      ) as badges

    FROM products p
    WHERE p.id = $1
    `,
    [id]
  )

  if (result.rows.length === 0) {
    throw new Error(`Product not found: ${id}`)
  }

  const data = result.rows[0]

  // Add summary
  const completeData = {
    ...data,
    _summary: {
      productId: id,
      productName: data.name,
      optionsCount: data.options?.length || 0,
      variantsCount: data.variants?.length || 0,
      categoriesCount: data.categories?.length || 0,
      tagsCount: data.tags?.length || 0,
      badgesCount: data.badges?.length || 0,
    }
  }

  return completeData
}

async function main() {
  try {
    const data = await fetchProductData(productId)

    // Create output file name
    const outputFileName = `product-data-${productId}.json`
    const outputPath = join(__dirname, outputFileName)

    // Write to JSON file
    writeFileSync(outputPath, JSON.stringify(data, null, 2))

    console.log('\n=== Summary ===')
    console.log(`Product: ${data.name}`)
    console.log(`Status: ${data.status}`)
    console.log(`Options: ${data._summary.optionsCount}`)
    console.log(`Variants: ${data._summary.variantsCount}`)
    console.log(`Categories: ${data._summary.categoriesCount}`)
    console.log(`Tags: ${data._summary.tagsCount}`)
    console.log(`Badges: ${data._summary.badgesCount}`)
    console.log(`\nOutput saved to: ${outputPath}`)

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await db.end()
  }
}

main()
