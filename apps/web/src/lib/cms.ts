/**
 * CMS data layer for the web app.
 *
 * Replaces the old Payload CMS REST calls with:
 *   1. Static config (site settings, header, footer) — instant, no API call
 *   2. Express API calls to /api/cms/* for dynamic CMS content
 *
 * ALL Payload CMS dependencies are eliminated.
 */

import { siteConfig, headerConfig, footerConfig } from '@mzadat/config'
import type { SiteConfig, HeaderConfig, FooterConfig } from '@mzadat/config'

// ─── API base URL (same as data.ts) ───
const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : process.env.API_URL
  ? `${process.env.API_URL}/api`
  : 'http://localhost:8080/api'

async function cmsFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}/cms${path}`, {
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw new Error(`CMS API ${path} → ${res.status}`)
  const json = await res.json()
  return json as T
}

// ══════════════════════════════════════════════════════════════
// STATIC CONFIG — instant, zero network calls
// ══════════════════════════════════════════════════════════════

/** Site settings from static config (replaces Payload global) */
export function getSiteSettings(): SiteConfig {
  return siteConfig
}

/** Header config from static config (replaces Payload global) */
export function getHeader(): HeaderConfig {
  return headerConfig
}

/** Footer config from static config (replaces Payload global) */
export function getFooter(): FooterConfig {
  return footerConfig
}

// ══════════════════════════════════════════════════════════════
// CATEGORY TYPES (replaces PayloadCategory)
// ══════════════════════════════════════════════════════════════

export interface CMSCategory {
  id: string
  name: string
  slug: string
  description: string | null
  image: string | null
  icon: string | null
  parentId: string | null
  sortOrder: number
  status: string
}

/** Fetch categories from the Express API (already existed, now unified here) */
export async function getCategories(locale = 'en'): Promise<CMSCategory[]> {
  try {
    const res = await fetch(`${API_BASE}/categories?locale=${locale}&rootOnly=1&limit=100`, {
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) return []
    const json = await res.json()
    return (json.data || []) as CMSCategory[]
  } catch {
    return []
  }
}

// ══════════════════════════════════════════════════════════════
// BLOGS (API-backed)
// ══════════════════════════════════════════════════════════════

export interface CMSBlog {
  id: string
  title: string
  slug: string
  excerpt: string | null
  body?: unknown
  featureImage: string | null
  categoryId: string | null
  categoryName: string | null
  categorySlug: string | null
  tags: string[]
  seoTitle?: string | null
  seoDescription?: string | null
  seoImage?: string | null
  status: string
  publishedAt: string | null
  createdAt: string
}

interface BlogListResponse {
  success: boolean
  docs: CMSBlog[]
  totalDocs: number
  totalPages: number
  page: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export async function getBlogs(locale = 'en', limit = 10, page = 1) {
  try {
    const res = await cmsFetch<BlogListResponse>(
      `/blogs?locale=${locale}&limit=${limit}&page=${page}`,
    )
    return res
  } catch {
    return {
      docs: [] as CMSBlog[],
      totalDocs: 0,
      totalPages: 0,
      page: 1,
      hasNextPage: false,
      hasPrevPage: false,
    }
  }
}

export async function getBlog(slug: string, locale = 'en'): Promise<CMSBlog | null> {
  try {
    const res = await cmsFetch<{ success: boolean; data: CMSBlog }>(`/blogs/${slug}?locale=${locale}`)
    return res.data
  } catch {
    return null
  }
}

// ══════════════════════════════════════════════════════════════
// BLOG CATEGORIES
// ══════════════════════════════════════════════════════════════

export interface CMSBlogCategory {
  id: string
  name: string
  slug: string
  description: string | null
  image: string | null
}

export async function getBlogCategories(locale = 'en'): Promise<CMSBlogCategory[]> {
  try {
    const res = await cmsFetch<{ success: boolean; data: CMSBlogCategory[] }>(
      `/blog-categories?locale=${locale}`,
    )
    return res.data
  } catch {
    return []
  }
}

// ══════════════════════════════════════════════════════════════
// WIDGETS
// ══════════════════════════════════════════════════════════════

export interface CMSWidget {
  id: string
  title: string
  pageSlug: string
  widgetType: string
  content: unknown
  image: string | null
  link: { url: string | null; label: string | null; newTab: boolean } | null
  extraData: Record<string, unknown>
  sortOrder: number
}

export async function getWidgets(pageSlug: string, locale = 'en'): Promise<CMSWidget[]> {
  try {
    const res = await cmsFetch<{ success: boolean; data: CMSWidget[] }>(
      `/widgets/${pageSlug}?locale=${locale}`,
    )
    return res.data
  } catch {
    return []
  }
}

// ══════════════════════════════════════════════════════════════
// MENUS
// ══════════════════════════════════════════════════════════════

export interface CMSMenuItem {
  label: string
  url: string
  target: string
  icon?: string
  children?: CMSMenuItem[]
}

export interface CMSMenu {
  id: string
  name: string
  location: string
  items: CMSMenuItem[]
}

export async function getMenuByLocation(
  location: string,
  locale = 'en',
): Promise<CMSMenu | null> {
  try {
    const res = await cmsFetch<{ success: boolean; data: CMSMenu }>(
      `/menus/${location}?locale=${locale}`,
    )
    return res.data
  } catch {
    return null
  }
}

// ══════════════════════════════════════════════════════════════
// TRANSLATIONS
// ══════════════════════════════════════════════════════════════

export async function getTranslations(lang = 'en'): Promise<Record<string, string>> {
  try {
    const res = await cmsFetch<{ success: boolean; data: Record<string, string> }>(
      `/translations/${lang}`,
    )
    return res.data
  } catch {
    return {}
  }
}

// ══════════════════════════════════════════════════════════════
// CONTACT FORM
// ══════════════════════════════════════════════════════════════

export async function submitContactForm(data: {
  name: string
  email: string
  phone?: string
  subject?: string
  message: string
}) {
  const res = await fetch(`${API_BASE}/cms/contacts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to submit contact form')
  return res.json()
}
