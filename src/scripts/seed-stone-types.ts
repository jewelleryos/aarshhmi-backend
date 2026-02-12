/**
 * Seed Stone Types Script
 *
 * Populates the stone_types table with initial data.
 * Run this script after running the migration.
 *
 * Usage: bun run src/scripts/seed-stone-types.ts
 */

import { db } from '../lib/db'
import { STONE_GROUPS, STONE_TYPES as STONE_TYPE_IDS } from '../config/stone.config'

// Stone types to seed
// IDs match the config file for consistency across database setups
const STONE_TYPES = [
  {
    id: STONE_TYPE_IDS.LAB_GROWN_DIAMOND,
    name: 'Lab Grown Diamond',
    slug: 'lg',
    description: '',
    stone_group_id: STONE_GROUPS.DIAMOND,
  },
]

async function seedStoneTypes() {
  console.log('Seeding stone types...\n')

  let inserted = 0
  let skipped = 0

  for (const type of STONE_TYPES) {
    process.stdout.write(`Inserting "${type.name}"... `)

    try {
      const result = await db.query(
        `INSERT INTO stone_types (id, name, slug, description, stone_group_id)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (slug) DO NOTHING
         RETURNING id`,
        [type.id, type.name, type.slug, type.description, type.stone_group_id]
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
  console.log(`Total: ${STONE_TYPES.length}`)

  // Show all stone types in database
  const allTypes = await db.query(
    `SELECT st.id, st.name, st.slug, sg.name as group_name, st.status
     FROM stone_types st
     JOIN stone_groups sg ON st.stone_group_id = sg.id
     ORDER BY st.name`
  )
  console.log('\n--- Stone Types in Database ---')
  console.table(allTypes.rows)

  console.log('\nDone!')
  process.exit(0)
}

// Run the script
seedStoneTypes().catch((error) => {
  console.error('Script failed:', error)
  process.exit(1)
})
