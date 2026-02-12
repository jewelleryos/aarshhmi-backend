/**
 * Setup Media Folders Script
 *
 * Creates the folder structure in Bunny storage.
 * Run this script once when setting up the project.
 *
 * Usage: bun run src/scripts/setup-media-folders.ts
 */

import { bunnyService } from '../shared/bunny-service'

// Folder structure to create
// Format: 'path/to/folder' - will create all parent folders if needed
const FOLDERS = [
  'masters/metals',
  'masters/metal-colors',
  'masters/metal-purities',
  'masters/shapes',
  'masters/gemstone-type',
  'masters/gemstone-qualities',
  'masters/gemstone-colors',
  'masters/diamond-clarity-color',
  'masters/pearl-types',
  'masters/pearl-qualities',
  'tags',
  'categories',
  'products',
  
]

async function createFolder(path: string, name: string): Promise<boolean> {
  const fullPath = path ? `${path}/${name}` : name
  process.stdout.write(`Creating /${fullPath}/ ... `)

  const result = await bunnyService.createFolder(path, name)

  if (result.success) {
    console.log('OK')
    return true
  } else {
    if (result.error?.includes('already exists') || result.error?.includes('409')) {
      console.log('Already exists')
      return true
    } else {
      console.log(`FAILED: ${result.error}`)
      return false
    }
  }
}

async function setupMediaFolders() {
  console.log('Setting up media folders in Bunny storage...\n')

  let created = 0
  let failed = 0

  for (const folderPath of FOLDERS) {
    const parts = folderPath.split('/')
    let currentPath = ''

    // Create each folder in the path
    for (const part of parts) {
      if (await createFolder(currentPath, part)) {
        created++
      } else {
        failed++
      }
      currentPath = currentPath ? `${currentPath}/${part}` : part
    }
  }

  console.log('\n--- Summary ---')
  console.log(`Created/Exists: ${created}`)
  console.log(`Failed: ${failed}`)
  console.log('\nDone!')
}

// Run the script
setupMediaFolders().catch((error) => {
  console.error('Script failed:', error)
  process.exit(1)
})
