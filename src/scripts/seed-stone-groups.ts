/**
 * Seed Stone Groups Script
 *
 * Populates the stone_groups table with initial data.
 * Run this script after running the migration.
 *
 * Usage: bun run src/scripts/seed-stone-groups.ts
 */

import { db } from '../lib/db'
import { STONE_GROUPS as STONE_GROUP_IDS } from '../config/stone.config'

// Stone groups to seed
// IDs match the config file for consistency across database setups
const STONE_GROUPS = [
  {
    id: STONE_GROUP_IDS.DIAMOND,
    name: 'Diamond',
    slug: 'diamond',
    description: '',
  },
  {
    id: STONE_GROUP_IDS.GEMSTONE,
    name: 'Gemstone',
    slug: 'gemstone',
    description: '',
  },
  {
    name: 'Pearls',
    slug: 'pearls',
    description: '',
    id: STONE_GROUP_IDS.PEARLS,
  },
]

async function seedStoneGroups() {
  console.log('Seeding stone groups...\n')

  let inserted = 0
  let skipped = 0

  for (const group of STONE_GROUPS) {
    process.stdout.write(`Inserting "${group.name}"... `)

    try {
      const result = await db.query(
        `INSERT INTO stone_groups (id, name, slug, description)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (slug) DO NOTHING
         RETURNING id`,
        [group.id, group.name, group.slug, group.description]
      )

      if (result.rowCount && result.rowCount > 0) {
        console.log(`OK (${result.rows[0].id})`)
        inserted++
      } else {
        console.log('Skipped (already exists)')
        skipped++
      }
    } catch (error) {
      console.log(`FAILED: ${error}`)
    }
  }

  console.log('\n--- Summary ---')
  console.log(`Inserted: ${inserted}`)
  console.log(`Skipped: ${skipped}`)
  console.log(`Total: ${STONE_GROUPS.length}`)

  // Show all stone groups in database
  const allGroups = await db.query('SELECT id, name, slug, status FROM stone_groups ORDER BY name')
  console.log('\n--- Stone Groups in Database ---')
  console.table(allGroups.rows)

  console.log('\nDone!')
  process.exit(0)
}

// Run the script
seedStoneGroups().catch((error) => {
  console.error('Script failed:', error)
  process.exit(1)
})
