/**
 * Seed System Tag Groups Script
 *
 * Creates system-defined tag groups for product filtering.
 *
 * Usage: bun run src/scripts/seed-system-tags.ts
 */

import { db } from '../lib/db'

const SYSTEM_TAG_GROUPS = [
  { id: 'tagg_06E09C24P47W8MEZ3N68PMVEB0', name: 'Metal Type', slug: 'metal-type', filter_display_name: 'Metal Type', rank: 0 },
  { id: 'tagg_06E09C7X5XF12YRVJ7FNXQ17FW', name: 'Metal Color', slug: 'metal-color', filter_display_name: 'Metal Color', rank: 0 },
  { id: 'tagg_06E09CA9KZQYR8F1QNJKVHR6S0', name: 'Metal Purity', slug: 'metal-purity', filter_display_name: 'Metal Purity', rank: 0 },
  { id: 'tagg_06E09G5K1YD1WG3WV65PGFAMJC', name: 'Gemstone Type', slug: 'gemstone-type', filter_display_name: 'Gemstone Type', rank: 0 },
  { id: 'tagg_06E09G8HGZ8WQPY7J0G8FEHNW0', name: 'Gemstone Color', slug: 'gemstone-color', filter_display_name: 'Gemstone Color', rank: 0 },
  { id: 'tagg_06E09GEXP4BZQNCF808XZZKDAG', name: 'Gemstone Quality', slug: 'gemstone-quality', filter_display_name: 'Gemstone Quality', rank: 0 },
  { id: 'tagg_06E09GHN7Z33YRGABEH493TGG8', name: 'Diamond Clarity Color', slug: 'diamond-clarity-color', filter_display_name: 'Diamond Quality', rank: 0 },
  { id: 'tagg_06E09GR2DWTJ3RZS4HKT2R1SB0', name: 'Pearl Type', slug: 'pearl-type', filter_display_name: 'Pearl Type', rank: 0 },
  { id: 'tagg_06E09GVTAZ4HZYAS5ZRCSCHCN8', name: 'Pearl Quality', slug: 'pearl-quality', filter_display_name: 'Pearl Quality', rank: 0 },
  { id: 'tagg_06E09GXYGW0GZCEV9XNF68K1KR', name: 'Stone Shape', slug: 'stone-shape', filter_display_name: 'Stone Shape', rank: 0 },
  { id: 'tagg_06E09HASW22HQKQVQAPQ9NX4X4', name: 'Stone Type', slug: 'stone-type', filter_display_name: 'Stone Type', rank: 0 },
]

async function seedSystemTagGroups() {
  console.log('Seeding system tag groups...\n')

  let inserted = 0
  let failed = 0

  for (const group of SYSTEM_TAG_GROUPS) {
    try {
      await db.query(
        `INSERT INTO tag_groups (id, name, slug, is_system_generated, is_filterable, filter_display_name, rank, status)
         VALUES ($1, $2, $3, TRUE, TRUE, $4, $5, TRUE)`,
        [group.id, group.name, group.slug, group.filter_display_name, group.rank]
      )
      console.log(`✓ ${group.name} (${group.id})`)
      inserted++
    } catch (error: unknown) {
      const err = error as { code?: string }
      if (err.code === '23505') {
        console.log(`✗ ${group.name} - slug "${group.slug}" already exists`)
      } else {
        console.log(`✗ ${group.name} - ${error}`)
      }
      failed++
    }
  }

  console.log(`\nInserted: ${inserted}, Failed: ${failed}`)
  console.log('Done!')
  process.exit(0)
}

seedSystemTagGroups().catch((error) => {
  console.error('Failed:', error)
  process.exit(1)
})
