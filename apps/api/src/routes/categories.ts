/**
 * Category Routes
 *
 * Public-read endpoints consumed by the website (apps/web).
 * All data originates from the Payload admin panel and is synced
 * to public.categories via Prisma hooks.
 *
 * GET  /categories           — list categories (filterable)
 * GET  /categories/tree      — full nested tree
 * GET  /categories/:slug     — single category with children
 */

import { Router, type IRouter } from 'express'
import type { Request, Response } from 'express'
import { categoryService, type CategoryListParams } from '../services/category.service.js'

const router: IRouter = Router()

// ── GET /categories ──────────────────────────────────────────────
// Query params:
//   status   — 'active' | 'inactive' | 'all'   (default: 'active')
//   parentId — UUID to filter children of a parent
//   rootOnly — '1' | 'true' to return only root categories
//   locale   — 'en' | 'ar'                     (default: 'en')
//   limit    — max results                      (default: 100)
//   offset   — pagination offset               (default: 0)
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      status,
      parentId,
      rootOnly,
      locale = 'en',
      limit,
      offset,
    } = req.query as Record<string, string | undefined>

    const params: CategoryListParams = {
      status: (status === 'inactive' || status === 'all' ? status : 'active') as
        | 'active'
        | 'inactive'
        | 'all',
      parentId: parentId ?? undefined,
      rootOnly: rootOnly === '1' || rootOnly === 'true',
      locale,
      limit: limit ? Math.min(parseInt(limit, 10), 500) : 100,
      offset: offset ? parseInt(offset, 10) : 0,
    }

    const result = await categoryService.list(params)
    res.json({ success: true, ...result })
  } catch (err) {
    console.error('[GET /categories] Error:', err)
    res.status(500).json({ success: false, error: 'Failed to fetch categories' })
  }
})

// ── GET /categories/tree ─────────────────────────────────────────
// Returns the full nested tree of active categories.
// Query params:
//   locale  — 'en' | 'ar'  (default: 'en')
router.get('/tree', async (req: Request, res: Response): Promise<void> => {
  try {
    const locale = (req.query.locale as string) ?? 'en'
    const tree = await categoryService.getTree(locale)
    res.json({ success: true, data: tree })
  } catch (err) {
    console.error('[GET /categories/tree] Error:', err)
    res.status(500).json({ success: false, error: 'Failed to fetch category tree' })
  }
})

// ── GET /categories/:slug ────────────────────────────────────────
// Returns a single category (with immediate children).
// Query params:
//   locale  — 'en' | 'ar'  (default: 'en')
router.get('/:slug', async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params as { slug: string }
    const locale = (req.query.locale as string) ?? 'en'

    const category = await categoryService.getBySlug(slug, locale)

    if (!category) {
      res.status(404).json({ success: false, error: 'Category not found' })
      return
    }

    res.json({ success: true, data: category })
  } catch (err) {
    console.error(`[GET /categories/:slug] Error:`, err)
    res.status(500).json({ success: false, error: 'Failed to fetch category' })
  }
})

export { router as categoryRoutes }
