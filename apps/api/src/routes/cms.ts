/**
 * CMS Routes
 *
 * Public-read endpoints for CMS content (blogs, widgets, menus, etc.)
 * Data lives in native PostgreSQL tables, queried via raw pg.
 *
 * GET  /api/cms/blogs                — Blog listing (paginated)
 * GET  /api/cms/blogs/:slug          — Single blog by slug
 * GET  /api/cms/blog-categories      — Blog category listing
 * GET  /api/cms/widgets/:pageSlug    — Widgets for a page
 * GET  /api/cms/menus/:location      — Menu by location
 * GET  /api/cms/translations/:lang   — All translations for a language
 * GET  /api/cms/settings             — All site settings
 * GET  /api/cms/settings/:key        — Single setting by key
 * POST /api/cms/contacts             — Submit contact form
 */

import { Router } from 'express'
import {
  blogService,
  blogCategoryService,
  widgetService,
  menuService,
  translationService,
  settingsService,
  contactService,
} from '../services/cms.service.js'

const router: Router = Router()

// ── Blogs ────────────────────────────────────────────────────

router.get('/blogs', async (req, res, next) => {
  try {
    const locale = (req.query.locale as string) || 'en'
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50)
    const page = Math.max(parseInt(req.query.page as string) || 1, 1)
    const status = req.query.status === 'all' ? 'all' : 'published'
    const result = await blogService.list(locale, limit, page, status as 'published' | 'all')
    res.json({ success: true, ...result })
  } catch (err) {
    next(err)
  }
})

router.get('/blogs/:slug', async (req, res, next) => {
  try {
    const locale = (req.query.locale as string) || 'en'
    const blog = await blogService.getBySlug(req.params.slug, locale)
    if (!blog) {
      res.status(404).json({ success: false, error: 'Blog not found' })
      return
    }
    res.json({ success: true, data: blog })
  } catch (err) {
    next(err)
  }
})

// ── Blog Categories ──────────────────────────────────────────

router.get('/blog-categories', async (req, res, next) => {
  try {
    const locale = (req.query.locale as string) || 'en'
    const data = await blogCategoryService.list(locale)
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
})

// ── Widgets ──────────────────────────────────────────────────

router.get('/widgets/:pageSlug', async (req, res, next) => {
  try {
    const locale = (req.query.locale as string) || 'en'
    const data = await widgetService.getByPage(req.params.pageSlug, locale)
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
})

// ── Menus ────────────────────────────────────────────────────

router.get('/menus/:location', async (req, res, next) => {
  try {
    const locale = (req.query.locale as string) || 'en'
    const menu = await menuService.getByLocation(req.params.location, locale)
    if (!menu) {
      res.status(404).json({ success: false, error: 'Menu not found' })
      return
    }
    res.json({ success: true, data: menu })
  } catch (err) {
    next(err)
  }
})

// ── Translations ─────────────────────────────────────────────

router.get('/translations/:lang', async (req, res, next) => {
  try {
    const data = await translationService.getAll(req.params.lang)
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
})

// ── Site Settings ────────────────────────────────────────────

router.get('/settings', async (_req, res, next) => {
  try {
    const data = await settingsService.getAll()
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
})

router.get('/settings/:key', async (req, res, next) => {
  try {
    const data = await settingsService.get(req.params.key)
    if (!data) {
      res.status(404).json({ success: false, error: 'Setting not found' })
      return
    }
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
})

// ── Contact form ─────────────────────────────────────────────

router.post('/contacts', async (req, res, next) => {
  try {
    const { name, email, phone, subject, message } = req.body
    if (!name || !email || !message) {
      res.status(400).json({ success: false, error: 'name, email, and message are required' })
      return
    }
    const result = await contactService.create({ name, email, phone, subject, message })
    res.status(201).json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
})

export { router as cmsRoutes }
