/**
 * Category Service
 *
 * Reads from public.categories via raw SQL (pg).
 * Data is managed via the admin dashboard.
 */

import { query, queryOne } from '@mzadat/db'
import { signImageFields } from '../utils/storage.js'

// ── Types ────────────────────────────────────────────────────────

export interface CategoryListParams {
  /** Filter by status (default: 'active') */
  status?: 'active' | 'inactive' | 'all'
  /** Return only children of this parent ID */
  parentId?: string | null
  /** Return only root-level categories (no parent) */
  rootOnly?: boolean
  /** BCP-47 locale (en | ar) used to flatten JSON name/description */
  locale?: string
  /** Max results (default 100) */
  limit?: number
  /** Offset for pagination */
  offset?: number
}

export interface LocalisedCategory {
  id: string
  parentId: string | null
  slug: string
  name: string
  description: string | null
  image: string | null
  icon: string | null
  sortOrder: number
  status: string
  createdAt: Date
  updatedAt: Date
  children?: LocalisedCategory[]
}

// ── Helpers ──────────────────────────────────────────────────────

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

function toLocalised(raw: any, locale = 'en'): LocalisedCategory {
  return {
    id: raw.id,
    parentId: raw.parent_id ?? raw.parentId ?? null,
    slug: raw.slug,
    name: pickLocale(raw.name, locale),
    description: pickLocaleOptional(raw.description, locale),
    image: raw.image,
    icon: raw.icon,
    sortOrder: raw.sort_order ?? raw.sortOrder,
    status: raw.status,
    createdAt: raw.created_at ?? raw.createdAt,
    updatedAt: raw.updated_at ?? raw.updatedAt,
  }
}

// ── Service ──────────────────────────────────────────────────────

export const categoryService = {
  /**
   * List categories with optional filters.
   */
  async list(params: CategoryListParams = {}): Promise<{
    data: LocalisedCategory[]
    total: number
  }> {
    const { status = 'active', parentId, rootOnly, locale = 'en', limit = 100, offset = 0 } = params

    // Build dynamic WHERE clauses
    const conditions: string[] = []
    const values: unknown[] = []
    let idx = 1

    if (status !== 'all') {
      conditions.push(`status = $${idx++}`)
      values.push(status)
    }
    if (rootOnly) {
      conditions.push('parent_id IS NULL')
    } else if (parentId !== undefined) {
      if (parentId === null) {
        conditions.push('parent_id IS NULL')
      } else {
        conditions.push(`parent_id = $${idx++}`)
        values.push(parentId)
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    values.push(limit, offset)
    const limitIdx = idx++
    const offsetIdx = idx++

    const rows = await query<{
      id: string; parent_id: string | null; slug: string; name: unknown; description: unknown
      image: string | null; icon: string | null; sort_order: number; status: string
      created_at: string; updated_at: string; total: string
    }>(`
      SELECT id, parent_id, slug, name, description, image, icon, sort_order, status,
             created_at, updated_at, COUNT(*) OVER() AS total
      FROM categories
      ${whereClause}
      ORDER BY sort_order ASC, created_at ASC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `, values)

    const total = rows.length > 0 ? parseInt(rows[0].total) : 0
    const data = rows.map((r) => toLocalised(r, locale))
    await signImageFields(data, ['image', 'icon'])
    return { data, total }
  },

  /**
   * Get a single category by slug.
   */
  async getBySlug(slug: string, locale = 'en'): Promise<LocalisedCategory | null> {
    const row = await queryOne<any>(`
      SELECT id, parent_id, slug, name, description, image, icon, sort_order, status, created_at, updated_at
      FROM categories WHERE slug = $1
    `, [slug])
    if (!row) return null

    const children = await query<any>(`
      SELECT id, parent_id, slug, name, description, image, icon, sort_order, status, created_at, updated_at
      FROM categories WHERE parent_id = $1 AND status = 'active' ORDER BY sort_order ASC
    `, [row.id])

    const result = toLocalised(row, locale) as LocalisedCategory
    result.children = children.map((c: any) => toLocalised(c, locale))
    await signImageFields([result, ...result.children], ['image', 'icon'])
    return result
  },

  /**
   * Get a single category by ID.
   */
  async getById(id: string, locale = 'en'): Promise<LocalisedCategory | null> {
    const row = await queryOne<any>(`
      SELECT id, parent_id, slug, name, description, image, icon, sort_order, status, created_at, updated_at
      FROM categories WHERE id = $1
    `, [id])
    if (!row) return null

    const children = await query<any>(`
      SELECT id, parent_id, slug, name, description, image, icon, sort_order, status, created_at, updated_at
      FROM categories WHERE parent_id = $1 AND status = 'active' ORDER BY sort_order ASC
    `, [row.id])

    const result = toLocalised(row, locale) as LocalisedCategory
    result.children = children.map((c: any) => toLocalised(c, locale))
    await signImageFields([result, ...result.children], ['image', 'icon'])
    return result
  },

  /**
   * Return the full nested tree of active categories.
   */
  async getTree(locale = 'en'): Promise<LocalisedCategory[]> {
    const all = await query<any>(`
      SELECT id, parent_id, slug, name, description, image, icon, sort_order, status, created_at, updated_at
      FROM categories WHERE status = 'active' ORDER BY sort_order ASC, created_at ASC
    `)

    const byId = new Map<string, LocalisedCategory>()
    const roots: LocalisedCategory[] = []

    for (const row of all) {
      const item: LocalisedCategory = { ...toLocalised(row, locale), children: [] }
      byId.set(item.id, item)
    }

    for (const item of byId.values()) {
      if (item.parentId) {
        const parent = byId.get(item.parentId)
        if (parent) {
          parent.children = parent.children ?? []
          parent.children.push(item)
        }
      } else {
        roots.push(item)
      }
    }

    // Sign image fields for all categories in the tree
    const allItems = [...byId.values()]
    await signImageFields(allItems, ['image', 'icon'])

    return roots
  },
}
