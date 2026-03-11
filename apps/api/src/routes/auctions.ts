/**
 * Auction Routes
 *
 * GET  /api/auctions/live          — Live auctions
 * GET  /api/auctions/upcoming      — Upcoming auctions
 * GET  /api/auctions/ended         — Recently ended auctions
 * GET  /api/auctions/dashboard     — Dashboard stats (admin)
 * GET  /api/auctions/ws-stats      — WebSocket connection stats (admin)
 * GET  /api/auctions/:id           — Single auction details
 * GET  /api/auctions/:id/bids      — Bid history for an auction
 */
import { Router } from 'express'
import { auctionService } from '../services/auction.service.js'
import { bidService } from '../services/bid.service.js'
import { authMiddleware } from '../middleware/auth.js'
import { requireRole } from '../middleware/role-guard.js'
import { validateUUID } from '../middleware/validate-uuid.js'
import { getWebSocketStats } from '../websocket/server.js'

const router: Router = Router()

// ── Public routes ────────────────────────────────────────────

/** Live auctions */
router.get('/live', async (req, res, next) => {
  try {
    const locale = (req.query.locale as string) || 'en'
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100)
    const offset = parseInt(req.query.offset as string) || 0
    const result = await auctionService.getLive(locale, limit, offset)
    res.json({ success: true, ...result })
  } catch (err) {
    next(err)
  }
})

/** Upcoming auctions */
router.get('/upcoming', async (req, res, next) => {
  try {
    const locale = (req.query.locale as string) || 'en'
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100)
    const offset = parseInt(req.query.offset as string) || 0
    const result = await auctionService.getUpcoming(locale, limit, offset)
    res.json({ success: true, ...result })
  } catch (err) {
    next(err)
  }
})

/** Ended auctions */
router.get('/ended', async (req, res, next) => {
  try {
    const locale = (req.query.locale as string) || 'en'
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100)
    const offset = parseInt(req.query.offset as string) || 0
    const result = await auctionService.getEnded(locale, limit, offset)
    res.json({ success: true, ...result })
  } catch (err) {
    next(err)
  }
})

/** Direct sale products */
router.get('/direct', async (req, res, next) => {
  try {
    const locale = (req.query.locale as string) || 'en'
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100)
    const offset = parseInt(req.query.offset as string) || 0
    const result = await auctionService.getDirectSales(locale, limit, offset)
    res.json({ success: true, ...result })
  } catch (err) {
    next(err)
  }
})

/** Search auctions */
router.get('/search', async (req, res, next) => {
  try {
    const locale = (req.query.locale as string) || 'en'
    const q = (req.query.q as string) || ''
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)
    const offset = parseInt(req.query.offset as string) || 0
    const result = await auctionService.search(q, locale, limit, offset)
    res.json({ success: true, ...result })
  } catch (err) {
    next(err)
  }
})

/** Public stats (total auctions, bids, users) */
router.get('/stats', async (_req, res, next) => {
  try {
    const result = await auctionService.getPublicStats()
    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
})

/** Auction by slug */
router.get('/by-slug/:slug', async (req, res, next) => {
  try {
    const locale = (req.query.locale as string) || 'en'
    const auction = await auctionService.getBySlug(req.params.slug, locale)
    if (!auction) {
      res.status(404).json({ success: false, error: 'Auction not found' })
      return
    }
    res.json({ success: true, data: auction })
  } catch (err) {
    next(err)
  }
})

// ── Admin routes ─────────────────────────────────────────────

/** Dashboard stats */
router.get('/dashboard', authMiddleware, requireRole('admin', 'super_admin'), async (_req, res, next) => {
  try {
    const stats = await auctionService.getDashboardStats()
    res.json({ success: true, data: stats })
  } catch (err) {
    next(err)
  }
})

/** WebSocket stats */
router.get('/ws-stats', authMiddleware, requireRole('admin', 'super_admin'), async (_req, res, next) => {
  try {
    const stats = getWebSocketStats()
    res.json({ success: true, data: stats })
  } catch (err) {
    next(err)
  }
})

// ── Per-auction routes ───────────────────────────────────────

/** Single auction */
router.get('/:id', validateUUID(), async (req, res, next) => {
  try {
    const locale = (req.query.locale as string) || 'en'
    const auction = await auctionService.getById(req.params.id, locale)
    if (!auction) {
      res.status(404).json({ success: false, error: 'Auction not found' })
      return
    }
    res.json({ success: true, data: auction })
  } catch (err) {
    next(err)
  }
})

/** Bid history for an auction */
router.get('/:id/bids', validateUUID(), async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100)
    const offset = parseInt(req.query.offset as string) || 0
    const result = await bidService.getProductBids(req.params.id, limit, offset)
    res.json({ success: true, ...result })
  } catch (err) {
    next(err)
  }
})

export { router as auctionRoutes }
