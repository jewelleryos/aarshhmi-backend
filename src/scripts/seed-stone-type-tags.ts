/**
 * Seed Stone Type Tags Script
 *
 * Creates system tags for stone groups (Diamond, Gemstone, Pearls) in the Stone Type tag group.
 * These are static values that don't change through API.
 *
 * Usage: bun run src/scripts/seed-stone-type-tags.ts
 */

import { db } from '../lib/db'
import { SYSTEM_TAG_GROUPS } from '../config/tag.config'

interface StoneGroup {
  id: string
  name: string
  slug: string
}

async function seedStoneTypeTags() {
  console.log('Seeding stone type tags...\n')

  // Fetch stone groups from database
  const result = await db.query<StoneGroup>(
    `SELECT id, name, slug FROM stone_groups WHERE status = TRUE ORDER BY name`
  )

  const stoneGroups = result.rows
  console.log(`Found ${stoneGroups.length} stone groups\n`)

  let inserted = 0
  let failed = 0

  for (const group of stoneGroups) {
    try {
      const tagResult = await db.query(
        `INSERT INTO tags (tag_group_id, name, slug, source_id, is_system_generated, is_filterable, status)
         VALUES ($1, $2, $3, $4, TRUE, TRUE, TRUE)
         RETURNING id`,
        [SYSTEM_TAG_GROUPS.STONE_TYPE, group.name, group.slug, group.id]
      )
      console.log(`✓ ${group.name} (${tagResult.rows[0].id})`)
      inserted++
    } catch (error: unknown) {
      const err = error as { code?: string }
      if (err.code === '23505') {
        console.log(`- ${group.name} (already exists)`)
      } else {
        console.log(`✗ ${group.name} - ${error}`)
      }
      failed++
    }
  }

  console.log(`\nInserted: ${inserted}, Skipped/Failed: ${failed}`)
  console.log('Done!')
  process.exit(0)
}

seedStoneTypeTags().catch((error) => {
  console.error('Failed:', error)
  process.exit(1)
})
