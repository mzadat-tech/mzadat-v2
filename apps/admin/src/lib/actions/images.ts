'use server'

import sharp from 'sharp'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/auth'
import { queryOne } from '@mzadat/db/pool'

// ── Supabase client (service role for storage) ──────────────────

let _storageClient: ReturnType<typeof createClient> | null = null

function getStorageClient() {
  if (!_storageClient) {
    _storageClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
  }
  return _storageClient
}

const BUCKET = 'media'
const LOT_IMAGES_PREFIX = 'lots'

// Signed URL expiry: 7 days (in seconds)
const SIGNED_URL_EXPIRY = 7 * 24 * 60 * 60

// ── In-memory signed URL cache (avoids repeated Supabase Storage round-trips) ──
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>()
const CACHE_TTL_MS = 6 * 24 * 60 * 60 * 1000 // 6 days (refresh 1 day before expiry)

// ── Get active watermark ────────────────────────────────────────

async function getActiveWatermark(): Promise<Buffer | null> {
  try {
    const row = await queryOne<{ image: string }>(
      `SELECT image FROM watermarks WHERE is_active = true LIMIT 1`,
    )

    if (!row?.image) return null

    // Download from Supabase storage — image column stores the storage path directly
    const supabase = getStorageClient()
    const { data, error } = await supabase.storage.from(BUCKET).download(row.image)

    if (error || !data) {
      console.warn('[getActiveWatermark] Failed to download watermark:', error?.message)
      return null
    }

    return Buffer.from(await data.arrayBuffer())
  } catch (err) {
    console.warn('[getActiveWatermark] Error fetching watermark:', err)
    return null
  }
}

// ── Process image: compress + watermark + convert to WebP ───────

async function processImage(
  buffer: Buffer,
  watermarkBuffer: Buffer | null,
): Promise<Buffer> {
  let pipeline = sharp(buffer)

  // Get metadata to determine dimensions for watermark placement
  const metadata = await pipeline.metadata()
  const imgWidth = metadata.width ?? 800
  const imgHeight = metadata.height ?? 600

  // Cap max dimension at 1920px — no web layout exceeds this
  const MAX_DIM = 1920
  if (imgWidth > MAX_DIM || imgHeight > MAX_DIM) {
    pipeline = pipeline.resize({
      width: MAX_DIM,
      height: MAX_DIM,
      fit: 'inside',
      withoutEnlargement: true,
    })
    // Re-read metadata after resize
    const resizedBuf = await pipeline.toBuffer()
    const resizedMeta = await sharp(resizedBuf).metadata()
    const finalWidth = resizedMeta.width ?? imgWidth
    const finalHeight = resizedMeta.height ?? imgHeight

    // If we have a watermark, composite it edge-to-edge across the full image
    if (watermarkBuffer) {
      const resizedWatermark = await sharp(watermarkBuffer)
        .resize({ width: finalWidth, height: finalHeight, fit: 'fill' })
        .ensureAlpha(0.4)
        .toBuffer()

      pipeline = sharp(resizedBuf).composite([
        { input: resizedWatermark, left: 0, top: 0, blend: 'over' },
      ])
    } else {
      pipeline = sharp(resizedBuf)
    }
  } else if (watermarkBuffer) {
    // No resize needed, just apply watermark
    const resizedWatermark = await sharp(watermarkBuffer)
      .resize({ width: imgWidth, height: imgHeight, fit: 'fill' })
      .ensureAlpha(0.4)
      .toBuffer()

    pipeline = sharp(await pipeline.toBuffer()).composite([
      { input: resizedWatermark, left: 0, top: 0, blend: 'over' },
    ])
  }

  // Convert to WebP — q82 is visually identical to q95 but ~60% smaller
  const result = await pipeline
    .webp({ quality: 82, effort: 4 })
    .toBuffer()

  return result
}

// ── Upload a single image ───────────────────────────────────────

/** Uploads buffer to Supabase storage. Returns the storage path (e.g. "lots/file.webp"). */
async function uploadToStorage(
  buffer: Buffer,
  fileName: string,
): Promise<string> {
  const supabase = getStorageClient()
  const filePath = `${LOT_IMAGES_PREFIX}/${fileName}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, buffer, {
      contentType: 'image/webp',
      upsert: true,
    })

  if (error) throw new Error(`Storage upload failed: ${error.message}`)

  // Return the storage path — NOT a URL.
  // Signed URLs will be generated on-the-fly when displaying.
  return filePath
}

/** Creates a signed display URL from a storage path. */
async function createDisplayUrl(storagePath: string): Promise<string> {
  const supabase = getStorageClient()
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_EXPIRY)
  if (error || !data?.signedUrl) throw new Error(`Signed URL failed: ${error?.message}`)
  return data.signedUrl
}

// ── Public actions ──────────────────────────────────────────────

export interface UploadResult {
  /** Storage path to store in DB (e.g. "lots/file.webp") */
  path: string
  /** Signed display URL for immediate preview */
  displayUrl: string
  error?: string
}

/**
 * Upload and process a lot image (feature or gallery).
 * Applies watermark + compresses to WebP.
 * Returns storage path (for DB) + signed display URL (for preview).
 */
export async function uploadLotImage(
  formData: FormData,
): Promise<UploadResult> {
  await requireAdmin()

  const file = formData.get('file') as File | null
  if (!file || file.size === 0) {
    return { path: '', displayUrl: '', error: 'No file provided.' }
  }

  if (!file.type.startsWith('image/')) {
    return { path: '', displayUrl: '', error: 'Only image files are allowed.' }
  }

  if (file.size > 10 * 1024 * 1024) {
    return { path: '', displayUrl: '', error: 'Image must be under 10MB.' }
  }

  try {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const watermark = await getActiveWatermark()
    const processed = await processImage(buffer, watermark)

    const timestamp = Date.now()
    const randomSuffix = Math.random().toString(36).substring(2, 8)
    const safeOriginalName = file.name
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 50)
    const fileName = `${safeOriginalName}_${timestamp}_${randomSuffix}.webp`

    const path = await uploadToStorage(processed, fileName)
    const displayUrl = await createDisplayUrl(path)

    return { path, displayUrl }
  } catch (err: any) {
    console.error('[uploadLotImage]', err)
    return { path: '', displayUrl: '', error: err.message || 'Upload failed.' }
  }
}

/**
 * Upload multiple gallery images.
 * Returns storage paths (for DB) + signed display URLs (for preview).
 */
export async function uploadLotGalleryImages(
  formData: FormData,
): Promise<{ paths: string[]; displayUrls: string[]; errors: string[] }> {
  await requireAdmin()

  const files = formData.getAll('files') as File[]
  if (!files.length) {
    return { paths: [], displayUrls: [], errors: ['No files provided.'] }
  }

  const watermark = await getActiveWatermark()

  const paths: string[] = []
  const displayUrls: string[] = []
  const errors: string[] = []

  for (const file of files) {
    if (!file.type.startsWith('image/')) {
      errors.push(`${file.name}: Not an image file.`)
      continue
    }
    if (file.size > 10 * 1024 * 1024) {
      errors.push(`${file.name}: Exceeds 10MB limit.`)
      continue
    }

    try {
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const processed = await processImage(buffer, watermark)

      const timestamp = Date.now()
      const randomSuffix = Math.random().toString(36).substring(2, 8)
      const safeOriginalName = file.name
        .replace(/\.[^.]+$/, '')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .substring(0, 50)
      const fileName = `${safeOriginalName}_${timestamp}_${randomSuffix}.webp`

      const path = await uploadToStorage(processed, fileName)
      const displayUrl = await createDisplayUrl(path)
      paths.push(path)
      displayUrls.push(displayUrl)
    } catch (err: any) {
      errors.push(`${file.name}: ${err.message || 'Upload failed.'}`)
    }
  }

  return { paths, displayUrls, errors }
}

/**
 * Delete a lot image from storage by its storage path.
 */
export async function deleteLotImage(storagePath: string): Promise<{ error?: string }> {
  await requireAdmin()

  try {
    const supabase = getStorageClient()
    const { error } = await supabase.storage.from(BUCKET).remove([storagePath])
    if (error) return { error: error.message }
    return {}
  } catch (err: any) {
    console.error('[deleteLotImage]', err)
    return { error: 'Failed to delete image.' }
  }
}

/**
 * Generate a signed display URL from a storage path.
 * Call this when displaying images stored in the private bucket.
 */
export async function getSignedImageUrl(storagePath: string): Promise<string | null> {
  try {
    const supabase = getStorageClient()
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_EXPIRY)
    if (error || !data?.signedUrl) return null
    return data.signedUrl
  } catch {
    return null
  }
}

/**
 * Generate signed display URLs for multiple storage paths in one call.
 * Uses an in-memory cache to avoid repeated Supabase Storage HTTP round-trips.
 */
export async function getSignedImageUrls(storagePaths: string[]): Promise<string[]> {
  if (!storagePaths.length) return []

  const now = Date.now()
  const results: (string | null)[] = new Array(storagePaths.length).fill(null)
  const uncachedPaths: string[] = []
  const uncachedIndices: number[] = []

  // Check cache first
  for (let i = 0; i < storagePaths.length; i++) {
    const cached = signedUrlCache.get(storagePaths[i])
    if (cached && cached.expiresAt > now) {
      results[i] = cached.url
    } else {
      uncachedPaths.push(storagePaths[i])
      uncachedIndices.push(i)
    }
  }

  // Fetch only uncached paths
  if (uncachedPaths.length > 0) {
    try {
      const supabase = getStorageClient()
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrls(uncachedPaths, SIGNED_URL_EXPIRY)
      if (!error && data) {
        for (let i = 0; i < uncachedPaths.length; i++) {
          const url = data[i]?.signedUrl ?? ''
          results[uncachedIndices[i]] = url
          if (url) {
            signedUrlCache.set(uncachedPaths[i], { url, expiresAt: now + CACHE_TTL_MS })
          }
        }
      }
    } catch {
      // Return cached results + empty for failures
    }
  }

  return results.map(r => r ?? '')
}
