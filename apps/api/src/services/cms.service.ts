/**
 * CMS Service — raw SQL (pg) reads for CMS tables
 *
 * Covers: blogs, blog_categories, widgets, menus, email_templates,
 *         contacts, translations, languages, site_settings
 */

import { query, queryOne } from '@mzadat/db'
import { signImageFields } from '../utils/storage.js'

// ── Locale helpers (same pattern as category.service) ────────

function pickLocale(json: unknown, locale = 'en'): string {
  if (!json || typeof json !== 'object') return ''
  const map = json as Record<string, string>
  return map[locale] ?? map['en'] ?? Object.values(map)[0] ?? ''
}

function pickLocaleOptional(json: unknown, locale = 'en'): string | null {
  if (!json || typeof json !== 'object') return null
  const map = json as Record<string, string | null>
  return map[locale] ?? map['en'] ?? null
}

// ══════════════════════════════════════════════════════════════
// BLOGS
// ══════════════════════════════════════════════════════════════

export interface BlogItem {
  id: string
  title: string
  slug: string
  excerpt: string | null
  featureImage: string | null
  categoryId: string | null
  categoryName: string | null
  categorySlug: string | null
  tags: string[]
  status: string
  publishedAt: string | null
  createdAt: string
}

export interface BlogDetail extends BlogItem {
  body: unknown
  seoTitle: string | null
  seoDescription: string | null
  seoImage: string | null
}

export const blogService = {
  async list(
    locale = 'en',
    limit = 10,
    page = 1,
    status: 'published' | 'all' = 'published',
  ) {
    const offset = (page - 1) * limit
    const conditions: string[] = []
    const values: unknown[] = []
    let idx = 1

    if (status !== 'all') {
      conditions.push(`b.status = $${idx++}`)
      values.push(status)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    values.push(limit, offset)

    const rows = await query<any>(`
      SELECT b.id, b.title, b.slug, b.excerpt, b.feature_image,
             b.tags, b.status, b.published_at, b.created_at,
             b.category_id,
             bc.name AS cat_name, bc.slug AS cat_slug,
             COUNT(*) OVER() AS total
      FROM blogs b
      LEFT JOIN blog_categories bc ON bc.id = b.category_id
      ${where}
      ORDER BY b.published_at DESC NULLS LAST, b.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `, values)

    const total = rows.length > 0 ? Number(rows[0].total) : 0

    const docs: BlogItem[] = rows.map((r: any) => ({
      id: r.id,
      title: pickLocale(r.title, locale),
      slug: r.slug,
      excerpt: pickLocaleOptional(r.excerpt, locale),
      featureImage: r.feature_image,
      categoryId: r.category_id,
      categoryName: r.cat_name ? pickLocale(r.cat_name, locale) : null,
      categorySlug: r.cat_slug,
      tags: r.tags || [],
      status: r.status,
      publishedAt: r.published_at,
      createdAt: r.created_at,
    }))

    await signImageFields(docs, ['featureImage'])

    return {
      docs,
      totalDocs: total,
      totalPages: Math.ceil(total / limit),
      page,
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    }
  },

  async getBySlug(slug: string, locale = 'en'): Promise<BlogDetail | null> {
    const row = await queryOne<any>(`
      SELECT b.*, bc.name AS cat_name, bc.slug AS cat_slug
      FROM blogs b
      LEFT JOIN blog_categories bc ON bc.id = b.category_id
      WHERE b.slug = $1
    `, [slug])

    if (!row) return null

    const result: BlogDetail = {
      id: row.id,
      title: pickLocale(row.title, locale),
      slug: row.slug,
      excerpt: pickLocaleOptional(row.excerpt, locale),
      body: row.body,
      featureImage: row.feature_image,
      categoryId: row.category_id,
      categoryName: row.cat_name ? pickLocale(row.cat_name, locale) : null,
      categorySlug: row.cat_slug,
      tags: row.tags || [],
      seoTitle: pickLocaleOptional(row.seo_title, locale),
      seoDescription: pickLocaleOptional(row.seo_desc, locale),
      seoImage: row.seo_image,
      status: row.status,
      publishedAt: row.published_at,
      createdAt: row.created_at,
    }
    await signImageFields(result, ['featureImage', 'seoImage'])
    return result
  },
}

// ══════════════════════════════════════════════════════════════
// BLOG CATEGORIES
// ══════════════════════════════════════════════════════════════

export interface BlogCategoryItem {
  id: string
  name: string
  slug: string
  description: string | null
  image: string | null
  status: string
}

export const blogCategoryService = {
  async list(locale = 'en', status: 'active' | 'all' = 'active') {
    const conditions: string[] = []
    const values: unknown[] = []
    let idx = 1

    if (status !== 'all') {
      conditions.push(`status = $${idx++}`)
      values.push(status)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const rows = await query<any>(`
      SELECT id, name, slug, description, image, status
      FROM blog_categories
      ${where}
      ORDER BY name->>'en' ASC
    `, values)

    const data = rows.map((r: any): BlogCategoryItem => ({
      id: r.id,
      name: pickLocale(r.name, locale),
      slug: r.slug,
      description: pickLocaleOptional(r.description, locale),
      image: r.image,
      status: r.status,
    }))
    await signImageFields(data, ['image'])
    return data
  },
}

// ══════════════════════════════════════════════════════════════
// WIDGETS
// ══════════════════════════════════════════════════════════════

export interface WidgetItem {
  id: string
  title: string
  pageSlug: string
  widgetType: string
  content: unknown
  image: string | null
  link: { url: string | null; label: string | null; newTab: boolean } | null
  extraData: Record<string, unknown>
  sortOrder: number
  status: string
}

export const widgetService = {
  async getByPage(pageSlug: string, locale = 'en'): Promise<WidgetItem[]> {
    const rows = await query<any>(`
      SELECT id, title, page_slug, widget_type, content, image,
             link_url, link_label, link_new_tab, extra_data, sort_order, status
      FROM widgets
      WHERE page_slug = $1 AND status = 'active'
      ORDER BY sort_order ASC
    `, [pageSlug])

    const data = rows.map((r: any): WidgetItem => ({
      id: r.id,
      title: r.title,
      pageSlug: r.page_slug,
      widgetType: r.widget_type,
      content: r.content,
      image: r.image,
      link: r.link_url ? {
        url: r.link_url,
        label: pickLocaleOptional(r.link_label, locale),
        newTab: r.link_new_tab ?? false,
      } : null,
      extraData: r.extra_data || {},
      sortOrder: r.sort_order,
      status: r.status,
    }))
    await signImageFields(data, ['image'])
    return data
  },
}

// ══════════════════════════════════════════════════════════════
// MENUS
// ══════════════════════════════════════════════════════════════

export interface MenuItem {
  label: string
  url: string
  target: string
  icon?: string
  children?: MenuItem[]
}

export interface MenuData {
  id: string
  name: string
  location: string
  items: MenuItem[]
}

export const menuService = {
  async getByLocation(location: string, locale = 'en'): Promise<MenuData | null> {
    const row = await queryOne<any>(`
      SELECT id, name, location, items
      FROM menus
      WHERE location = $1 AND status = 'active'
      LIMIT 1
    `, [location])

    if (!row) return null

    function localiseItems(items: any[]): MenuItem[] {
      return (items || []).map((item: any) => ({
        label: typeof item.label === 'object' ? pickLocale(item.label, locale) : item.label,
        url: item.url,
        target: item.target || '_self',
        icon: item.icon,
        children: item.children ? localiseItems(item.children) : undefined,
      }))
    }

    return {
      id: row.id,
      name: pickLocale(row.name, locale),
      location: row.location,
      items: localiseItems(row.items || []),
    }
  },
}

// ══════════════════════════════════════════════════════════════
// EMAIL TEMPLATES
// ══════════════════════════════════════════════════════════════

export interface EmailTemplateData {
  id: string
  name: string
  slug: string
  subject: string
  body: unknown
  variables: Array<{ key: string; description: string }>
}

export const emailTemplateService = {
  async getBySlug(slug: string, locale = 'en'): Promise<EmailTemplateData | null> {
    const row = await queryOne<any>(`
      SELECT id, name, slug, subject, body, variables
      FROM email_templates
      WHERE slug = $1 AND status = 'active'
    `, [slug])

    if (!row) return null

    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      subject: pickLocale(row.subject, locale),
      body: row.body,
      variables: row.variables || [],
    }
  },

  async list() {
    return query<any>(`
      SELECT id, name, slug, status, created_at
      FROM email_templates
      ORDER BY name ASC
    `)
  },
}

// ══════════════════════════════════════════════════════════════
// CONTACTS
// ══════════════════════════════════════════════════════════════

export const contactService = {
  async create(data: {
    name: string
    email: string
    phone?: string
    subject?: string
    message: string
  }) {
    const row = await queryOne<{ id: string }>(`
      INSERT INTO contacts (name, email, phone, subject, message)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [data.name, data.email, data.phone ?? null, data.subject ?? null, data.message])
    return row
  },

  async list(limit = 50, offset = 0) {
    return query<any>(`
      SELECT id, name, email, phone, subject, message, is_read, created_at,
             COUNT(*) OVER() AS total
      FROM contacts
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset])
  },

  async markRead(id: string) {
    await query('UPDATE contacts SET is_read = true WHERE id = $1', [id])
  },
}

// ══════════════════════════════════════════════════════════════
// TRANSLATIONS
// ══════════════════════════════════════════════════════════════

export const translationService = {
  /** Get all translations for a language as a flat key-value map */
  async getAll(lang = 'en'): Promise<Record<string, string>> {
    const rows = await query<{ key: string; value: string }>(`
      SELECT key, value FROM translations WHERE lang = $1
    `, [lang])

    const map: Record<string, string> = {}
    for (const r of rows) map[r.key] = r.value
    return map
  },
}

// ══════════════════════════════════════════════════════════════
// SITE SETTINGS (dynamic key-value)
// ══════════════════════════════════════════════════════════════

export const settingsService = {
  async get(key: string): Promise<Record<string, unknown> | null> {
    const row = await queryOne<{ value: Record<string, unknown> }>(`
      SELECT value FROM site_settings WHERE key = $1
    `, [key])
    return row?.value ?? null
  },

  async getAll(): Promise<Record<string, Record<string, unknown>>> {
    const rows = await query<{ key: string; value: Record<string, unknown> }>(`
      SELECT key, value FROM site_settings
    `)
    const result: Record<string, Record<string, unknown>> = {}
    for (const r of rows) result[r.key] = r.value
    return result
  },

  async set(key: string, value: Record<string, unknown>) {
    await query(`
      INSERT INTO site_settings (key, value, updated_at)
      VALUES ($1, $2, now())
      ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = now()
    `, [key, JSON.stringify(value)])
  },
}
