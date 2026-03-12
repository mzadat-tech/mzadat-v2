/**
 * Group Routes
 *
 * GET  /api/groups              — List groups
 * GET  /api/groups/:id          — Group with lots and live status
 * GET  /api/groups/active       — Active groups with lot counts
 */
import { Router } from 'express'
import { auctionService } from '../services/auction.service.js'
import { query } from '@mzadat/db'
import { validateUUID } from '../middleware/validate-uuid.js'
import { resolveImageFields } from '../utils/storage.js'

const router:Router = Router()

function pickLocale(json: unknown, locale = 'en'): string {
  if (!json || typeof json !== 'object') return ''
  const map = json as Record<string, string>
  return map[locale] ?? map['en'] ?? Object.values(map)[0] ?? ''
}

/** List groups with optional status filter */
router.get('/', async (req, res, next) => {
  try {
    const locale = (req.query.locale as string) || 'en'
    const status = req.query.status as string | undefined
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100)
    const offset = parseInt(req.query.offset as string) || 0

    const validStatuses = ['upcoming', 'active', 'closed', 'cancelled']
    const statusFilter = status && validStatuses.includes(status) ? status : null

    const rows = await query<{
      id: string; name: unknown; description: unknown; image: string | null
      start_date: string; end_date: string
      inspection_start_date: string | null; inspection_end_date: string | null
      min_deposit: string; status: string
      merchant_id: string; first_name: string; last_name: string; custom_id: string
      store_slug: string | null
      lot_count: string; total: string
    }>(`
      SELECT g.id, g.name, g.description, g.image,
             g.start_date, g.end_date, g.inspection_start_date, g.inspection_end_date,
             g.min_deposit, g.status,
             m.id AS merchant_id, m.first_name, m.last_name, m.custom_id,
             st.slug AS store_slug,
             (SELECT COUNT(*) FROM products p WHERE p.group_id = g.id AND p.deleted_at IS NULL) AS lot_count,
             COUNT(*) OVER() AS total
      FROM groups g
      INNER JOIN profiles m ON m.id = g.merchant_id
      LEFT JOIN stores st ON st.id = g.store_id
      WHERE ($3::text IS NULL OR g.status::text = $3)
      ORDER BY g.start_date DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset, statusFilter])

    const now = new Date()
    const total = rows.length > 0 ? parseInt(rows[0].total) : 0

    const data = rows.map((g) => {
        const start = new Date(g.start_date)
        const end = new Date(g.end_date)
        const isLive = g.status === 'active' || (now >= start && now <= end)
        return {
          id: g.id,
          name: pickLocale(g.name, locale),
          description: pickLocale(g.description, locale),
          image: g.image,
          startDate: g.start_date,
          endDate: g.end_date,
          inspectionStartDate: g.inspection_start_date,
          inspectionEndDate: g.inspection_end_date,
          minDeposit: g.min_deposit,
          status: g.status,
          isLive,
          lotCount: parseInt(g.lot_count),
          storeSlug: g.store_slug,
          merchant: {
            id: g.merchant_id,
            name: `${g.first_name} ${g.last_name}`,
            customId: g.custom_id,
          },
        }
      })
    resolveImageFields(data, ['image'])
    res.json({ success: true, data, total })
  } catch (err) {
    next(err)
  }
})

/** Active groups with lot status */
router.get('/active', async (req, res, next) => {
  try {
    const locale = (req.query.locale as string) || 'en'

    const rows = await query<{
      id: string; name: unknown; start_date: string; end_date: string; status: string
      merchant_id: string; first_name: string; last_name: string; custom_id: string
      total_lots: string; live_lots: string; ended_lots: string; total_bids: string
    }>(`
      SELECT g.id, g.name, g.start_date, g.end_date, g.status,
             m.id AS merchant_id, m.first_name, m.last_name, m.custom_id,
             COUNT(p.id) FILTER (WHERE p.deleted_at IS NULL) AS total_lots,
             COUNT(p.id) FILTER (WHERE p.deleted_at IS NULL
               AND p.status = 'published' AND p.start_date <= NOW() AND p.end_date >= NOW()) AS live_lots,
             COUNT(p.id) FILTER (WHERE p.deleted_at IS NULL
               AND (p.status = 'closed' OR p.end_date < NOW())) AS ended_lots,
             COALESCE(SUM(p.bid_count) FILTER (WHERE p.deleted_at IS NULL), 0) AS total_bids
      FROM groups g
      INNER JOIN profiles m ON m.id = g.merchant_id
      LEFT JOIN products p ON p.group_id = g.id
      WHERE g.status = 'active'
         OR (g.status = 'upcoming' AND g.start_date <= NOW() AND g.end_date >= NOW())
      GROUP BY g.id, g.name, g.start_date, g.end_date, g.status,
               m.id, m.first_name, m.last_name, m.custom_id
      ORDER BY g.start_date ASC
    `)

    res.json({
      success: true,
      data: rows.map((g) => ({
        id: g.id,
        name: pickLocale(g.name, locale),
        startDate: g.start_date,
        endDate: g.end_date,
        status: g.status,
        totalLots: parseInt(g.total_lots),
        liveLots: parseInt(g.live_lots),
        endedLots: parseInt(g.ended_lots),
        upcomingLots: parseInt(g.total_lots) - parseInt(g.live_lots) - parseInt(g.ended_lots),
        totalBids: parseInt(g.total_bids),
        merchant: {
          id: g.merchant_id,
          name: `${g.first_name} ${g.last_name}`,
          customId: g.custom_id,
        },
      })),
    })
  } catch (err) {
    next(err)
  }
})

/** Single group with all lots */
router.get('/:id', validateUUID(), async (req, res, next) => {
  try {
    const locale = (req.query.locale as string) || 'en'
    const group = await auctionService.getGroupWithLots(req.params.id, locale)
    if (!group) {
      res.status(404).json({ success: false, error: 'Group not found' })
      return
    }
    res.json({ success: true, data: group })
  } catch (err) {
    next(err)
  }
})

export { router as groupRoutes }
