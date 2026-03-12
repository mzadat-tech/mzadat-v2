/**
 * Migrate private files from `media` (public) → `media-private` (private)
 *
 * Moves:
 *   - deposits/*    (bank transfer proof docs)
 *   - watermarks/*  (watermark overlays)
 *
 * Run: npx tsx scripts/migrate-storage-to-private.ts
 *
 * Safe to re-run — skips files that already exist in media-private.
 */

import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

const PUBLIC_BUCKET = 'media'
const PRIVATE_BUCKET = 'media-private'
const FOLDERS_TO_MOVE = ['deposits', 'watermarks']

async function listAllFiles(bucket: string, folder: string): Promise<string[]> {
  const paths: string[] = []
  let offset = 0
  const limit = 100

  while (true) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(folder, { limit, offset })

    if (error) {
      console.error(`  Error listing ${bucket}/${folder}:`, error.message)
      break
    }
    if (!data || data.length === 0) break

    for (const file of data) {
      if (file.name && !file.id?.startsWith('.')) {
        paths.push(`${folder}/${file.name}`)
      }
    }

    if (data.length < limit) break
    offset += limit
  }

  return paths
}

async function moveFile(path: string): Promise<boolean> {
  // 1. Download from public bucket
  const { data: fileData, error: downloadError } = await supabase.storage
    .from(PUBLIC_BUCKET)
    .download(path)

  if (downloadError || !fileData) {
    console.error(`  ✗ Download failed: ${path} — ${downloadError?.message}`)
    return false
  }

  // 2. Upload to private bucket
  const buffer = Buffer.from(await fileData.arrayBuffer())
  const { error: uploadError } = await supabase.storage
    .from(PRIVATE_BUCKET)
    .upload(path, buffer, {
      contentType: fileData.type || 'application/octet-stream',
      upsert: false, // Don't overwrite if already exists
    })

  if (uploadError) {
    if (uploadError.message?.includes('already exists') || uploadError.message?.includes('Duplicate')) {
      console.log(`  ⊘ Already exists in private: ${path}`)
      return true // Consider it moved
    }
    console.error(`  ✗ Upload failed: ${path} — ${uploadError.message}`)
    return false
  }

  // 3. Delete from public bucket (only after successful upload)
  const { error: deleteError } = await supabase.storage
    .from(PUBLIC_BUCKET)
    .remove([path])

  if (deleteError) {
    console.warn(`  ⚠ Uploaded but couldn't delete from public: ${path} — ${deleteError.message}`)
  }

  return true
}

async function main() {
  console.log('═══════════════════════════════════════════════════')
  console.log('  Storage Migration: media → media-private')
  console.log('═══════════════════════════════════════════════════')
  console.log()

  let totalMoved = 0
  let totalFailed = 0
  let totalSkipped = 0

  for (const folder of FOLDERS_TO_MOVE) {
    console.log(`📁 Processing ${folder}/...`)
    const files = await listAllFiles(PUBLIC_BUCKET, folder)

    if (files.length === 0) {
      console.log(`  No files found in ${PUBLIC_BUCKET}/${folder}/`)
      continue
    }

    console.log(`  Found ${files.length} file(s)`)

    for (const filePath of files) {
      const ok = await moveFile(filePath)
      if (ok) {
        console.log(`  ✓ Moved: ${filePath}`)
        totalMoved++
      } else {
        totalFailed++
      }
    }
    console.log()
  }

  console.log('═══════════════════════════════════════════════════')
  console.log(`  Done! Moved: ${totalMoved} | Failed: ${totalFailed}`)
  console.log('═══════════════════════════════════════════════════')

  if (totalFailed > 0) {
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
