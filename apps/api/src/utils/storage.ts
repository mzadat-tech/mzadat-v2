/**
 * Supabase Storage — URL helpers
 *
 * Two buckets:
 *   • `media`         (public)  – auction/lot images, watermarks, blog/CMS images, logos
 *   • `media-private` (private) – deposit proofs, profile images, documents
 *
 * Public images use direct CDN URLs (zero latency, SEO-friendly, cacheable).
 * Private files use time-limited signed URLs.
 *
 * This module provides:
 *   • `publicUrl(path)`            – instant public CDN URL (no API call)
 *   • `resolveImageFields(obj)`    – replace storage paths with public URLs (sync)
 *   • `signUrl(path)`              – signed URL for private bucket
 *   • `signUrls(paths)`            – batch-sign private paths
 */

import { supabaseAdmin } from '../config/database.js'
import { env } from '../config/env.js'

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const PUBLIC_BUCKET = 'media'
const PRIVATE_BUCKET = 'media-private'

/** Signed URLs live for 7 days (in seconds). */
const SIGNED_URL_EXPIRY = 7 * 24 * 60 * 60

// ── In-memory cache for signed URLs ─────────────────────────────
const cache = new Map<string, { url: string; expiresAt: number }>()
const CACHE_TTL_MS = 6 * 24 * 60 * 60 * 1000 // refresh 1 day before expiry

function isStoragePath(v: unknown): v is string {
  if (typeof v !== 'string' || !v) return false
  if (v.startsWith('http://') || v.startsWith('https://') || v.startsWith('/')) return false
  return true
}

// ══════════════════════════════════════════════════════════════════
// PUBLIC BUCKET — instant CDN URLs (no API call, no latency)
// ══════════════════════════════════════════════════════════════════

/** Construct a direct public URL for the `media` bucket. No API call. */
export function publicUrl(path: string | null | undefined): string | null {
  if (!path || !isStoragePath(path)) return path ?? null
  return `${SUPABASE_URL}/storage/v1/object/public/${PUBLIC_BUCKET}/${path}`
}

/**
 * Replace storage paths with public CDN URLs in-place. Synchronous — no
 * Supabase round-trips. Use for all public-facing images (lots, blogs, etc.).
 */
export function resolveImageFields<T extends Record<string, any>>(
  data: T | T[],
  fields: string[],
): void {
  const items = Array.isArray(data) ? data : [data]

  for (const item of items) {
    for (const f of fields) {
      const val = item[f]
      if (typeof val === 'string' && isStoragePath(val)) {
        ;(item as any)[f] = publicUrl(val)
      } else if (Array.isArray(val)) {
        for (const v of val) {
          if (v && typeof v === 'object' && 'image' in v && isStoragePath(v.image)) {
            v.image = publicUrl(v.image)
          }
        }
      }
    }
    if ('gallery' in item && Array.isArray(item.gallery)) {
      for (const g of item.gallery as any[]) {
        if (g?.image && isStoragePath(g.image)) g.image = publicUrl(g.image)
      }
    }
    if ('merchant' in item && item.merchant && typeof item.merchant === 'object') {
      const m = item.merchant as Record<string, unknown>
      if (typeof m.image === 'string' && isStoragePath(m.image)) {
        m.image = publicUrl(m.image)
      }
    }
    if ('lots' in item && Array.isArray(item.lots)) {
      for (const lot of item.lots as any[]) {
        if (lot?.featureImage && isStoragePath(lot.featureImage)) {
          lot.featureImage = publicUrl(lot.featureImage)
        }
      }
    }
  }
}

// ══════════════════════════════════════════════════════════════════
// PRIVATE BUCKET — signed URLs (deposits, profiles, documents)
// ══════════════════════════════════════════════════════════════════

/** Create a signed URL for a file in `media-private`. */
export async function signUrl(path: string | null | undefined): Promise<string | null> {
  if (!path || !isStoragePath(path)) return path ?? null

  const now = Date.now()
  const cached = cache.get(path)
  if (cached && cached.expiresAt > now) return cached.url

  const { data, error } = await supabaseAdmin.storage
    .from(PRIVATE_BUCKET)
    .createSignedUrl(path, SIGNED_URL_EXPIRY)

  if (error || !data?.signedUrl) {
    console.warn(`[signUrl] failed for "${path}":`, error?.message)
    return null
  }

  cache.set(path, { url: data.signedUrl, expiresAt: now + CACHE_TTL_MS })
  return data.signedUrl
}

/** Batch-sign paths from `media-private`. Returns Map<path, signedUrl>. */
export async function signUrls(paths: (string | null | undefined)[]): Promise<Map<string, string>> {
  const result = new Map<string, string>()
  const now = Date.now()

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
      .from(PRIVATE_BUCKET)
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
