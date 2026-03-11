/**
 * Supabase Storage — signed URL helpers
 *
 * Images are stored in a **private** bucket (`media`). The database only
 * keeps the storage *path* (e.g. `lots/foo.webp`).  Before returning
 * data to the web/admin clients we must exchange those paths for
 * time-limited signed URLs that `next/image` can load.
 *
 * This module provides:
 *   • `signUrl(path)`        – sign a single path
 *   • `signUrls(paths)`      – batch-sign many paths (one Supabase call)
 *   • `signImageFields(obj)` – deep-sign all image-ish fields on an object
 */

import { supabaseAdmin } from '../config/database.js'

const BUCKET = 'media'

/** Signed URLs live for 7 days (in seconds). */
const SIGNED_URL_EXPIRY = 7 * 24 * 60 * 60

// ── In-memory cache (avoids repeated Supabase round-trips) ──────
const cache = new Map<string, { url: string; expiresAt: number }>()
const CACHE_TTL_MS = 6 * 24 * 60 * 60 * 1000 // refresh 1 day before expiry

function isStoragePath(v: unknown): v is string {
  if (typeof v !== 'string' || !v) return false
  // Already a full URL → skip
  if (v.startsWith('http://') || v.startsWith('https://') || v.startsWith('/')) return false
  return true
}

// ── Single path ─────────────────────────────────────────────────

export async function signUrl(path: string | null | undefined): Promise<string | null> {
  if (!path || !isStoragePath(path)) return path ?? null

  const now = Date.now()
  const cached = cache.get(path)
  if (cached && cached.expiresAt > now) return cached.url

  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_EXPIRY)

  if (error || !data?.signedUrl) {
    console.warn(`[signUrl] failed for "${path}":`, error?.message)
    return null
  }

  cache.set(path, { url: data.signedUrl, expiresAt: now + CACHE_TTL_MS })
  return data.signedUrl
}

// ── Batch sign ──────────────────────────────────────────────────

/**
 * Sign an array of storage paths in a single Supabase call.
 * Returns a Map<originalPath, signedUrl>.
 */
export async function signUrls(paths: (string | null | undefined)[]): Promise<Map<string, string>> {
  const result = new Map<string, string>()
  const now = Date.now()

  // Deduplicate and filter out non-storage paths
  const toSign: string[] = []
  for (const p of paths) {
    if (!p || !isStoragePath(p)) continue
    const cached = cache.get(p)
    if (cached && cached.expiresAt > now) {
      result.set(p, cached.url)
    } else if (!toSign.includes(p)) {
      toSign.push(p)
    }
  }

  if (toSign.length === 0) return result

  try {
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrls(toSign, SIGNED_URL_EXPIRY)

    if (!error && data) {
      for (let i = 0; i < toSign.length; i++) {
        const url = data[i]?.signedUrl
        if (url) {
          result.set(toSign[i], url)
          cache.set(toSign[i], { url, expiresAt: now + CACHE_TTL_MS })
        }
      }
    }
  } catch (err) {
    console.warn('[signUrls] batch sign failed:', err)
  }

  return result
}

// ── Convenience: sign all image fields on an object/array ────────

/**
 * Collect all storage paths from objects, batch-sign them, and replace
 * in-place.  Handles nested objects and arrays.
 *
 * The `fields` parameter lists key names that hold image storage paths
 * (e.g. `['featureImage', 'image', 'seoImage', 'icon']`).
 */
export async function signImageFields<T extends Record<string, any>>(
  data: T | T[],
  fields: string[],
): Promise<void> {
  const items = Array.isArray(data) ? data : [data]
  const allPaths: (string | null)[] = []

  // 1. Collect all paths
  for (const item of items) {
    for (const f of fields) {
      const val = item[f]
      if (typeof val === 'string') {
        allPaths.push(val)
      } else if (Array.isArray(val)) {
        for (const v of val) {
          if (typeof v === 'string') allPaths.push(v)
          if (v && typeof v === 'object' && 'image' in v) allPaths.push((v as any).image)
        }
      }
    }
    // Handle nested gallery arrays
    if ('gallery' in item && Array.isArray(item.gallery)) {
      for (const g of item.gallery as any[]) {
        if (g?.image) allPaths.push(g.image)
      }
    }
    // Handle merchant.image
    if ('merchant' in item && item.merchant && typeof item.merchant === 'object') {
      const m = item.merchant as Record<string, unknown>
      if (typeof m.image === 'string') allPaths.push(m.image)
    }
    // Handle lots array (group with lots)
    if ('lots' in item && Array.isArray(item.lots)) {
      for (const lot of item.lots as any[]) {
        if (lot?.featureImage) allPaths.push(lot.featureImage)
      }
    }
  }

  // 2. Batch sign
  const signed = await signUrls(allPaths)
  if (signed.size === 0) return

  // 3. Replace in-place
  for (const item of items) {
    for (const f of fields) {
      const val = item[f]
      if (typeof val === 'string' && signed.has(val)) {
        (item as any)[f] = signed.get(val)
      }
    }
    if ('gallery' in item && Array.isArray(item.gallery)) {
      for (const g of item.gallery as any[]) {
        if (g?.image && signed.has(g.image)) g.image = signed.get(g.image)
      }
    }
    if ('merchant' in item && item.merchant && typeof item.merchant === 'object') {
      const m = item.merchant as Record<string, unknown>
      if (typeof m.image === 'string' && signed.has(m.image)) {
        m.image = signed.get(m.image)
      }
    }
    if ('lots' in item && Array.isArray(item.lots)) {
      for (const lot of item.lots as any[]) {
        if (lot?.featureImage && signed.has(lot.featureImage)) {
          lot.featureImage = signed.get(lot.featureImage)
        }
      }
    }
  }
}
