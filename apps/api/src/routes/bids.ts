/**
 * Bid Routes
 *
 * POST /api/bids          — Place a bid (authenticated)
 * GET  /api/bids/my       — Current user's bid history
 */
import { Router } from 'express'
import { authMiddleware, type AuthenticatedRequest } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { placeBidSchema } from '@mzadat/validators'
import { bidService, BidError } from '../services/bid.service.js'
import { query } from '@mzadat/db'

const router:Router = Router()

/** Place a bid — requires authentication */
router.post('/', authMiddleware, validate(placeBidSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { productId, amount } = req.body
    const userId = req.userId!
    const profile = req.profile!

    const result = await bidService.placeBid(userId, productId, amount, {
      firstName: profile.firstName,
      lastName: profile.lastName,
      customId: profile.customId,
    })

    res.status(201).json({
      success: true,
      data: result,
      message: result.isExtended
        ? 'Bid placed! Auction extended due to last-minute bidding.'
        : 'Bid placed successfully.',
    })
  } catch (err) {
    if (err instanceof BidError) {
      res.status(err.statusCode).json({ success: false, error: err.message })
      return
    }
    next(err)
  }
})

/** Get current user's bids */
router.get('/my', authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.userId!
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100)
    const offset = parseInt(req.query.offset as string) || 0

    const rows = await query<{
      id: string; amount: string; is_winning: boolean; created_at: string
      p_id: string; p_slug: string; p_name: unknown; p_feature_image: string | null
      p_current_bid: string; p_end_date: string | null; p_status: string
      total: string
    }>(`
      SELECT bh.id, bh.amount, bh.is_winning, bh.created_at,
             p.id AS p_id, p.slug AS p_slug, p.name AS p_name,
             p.feature_image AS p_feature_image, p.current_bid AS p_current_bid,
             p.end_date AS p_end_date, p.status AS p_status,
             COUNT(*) OVER() AS total
      FROM bid_history bh
      INNER JOIN products p ON p.id = bh.product_id
      WHERE bh.user_id = $1 AND bh.deleted_at IS NULL
      ORDER BY bh.created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset])

    const total = rows.length > 0 ? parseInt(rows[0].total) : 0

    res.json({
      success: true,
      data: rows.map((b) => ({
        id: b.id,
        amount: b.amount,
        isWinning: b.is_winning,
        createdAt: b.created_at,
        product: {
          id: b.p_id,
          slug: b.p_slug,
          name: b.p_name,
          featureImage: b.p_feature_image,
          currentBid: b.p_current_bid,
          endDate: b.p_end_date,
          status: b.p_status,
        },
      })),
      total,
    })
  } catch (err) {
    next(err)
  }
})

export { router as bidRoutes }
