/**
 * Admin Winners Routes
 *
 * Manages auction winners (bid orders).
 * All queries use raw pg pool — no Prisma.
 *
 * Endpoints:
 *   GET  /api/admin/winners            — paginated list with filters
 *   GET  /api/admin/winners/stats      — summary counts + amounts
 *   GET  /api/admin/winners/groups     — groups that have winners (for filter dropdown)
 *   PATCH /api/admin/winners/:id/payment-status  — update payment status
 *   PATCH /api/admin/winners/:id/order-status    — update order status
 */

import { Router, type IRouter, type Response } from 'express'
import { authMiddleware, type AuthenticatedRequest } from '../middleware/auth.js'
import { requireRole } from '../middleware/role-guard.js'
import { query, queryOne, pool } from '@mzadat/db'

const router: IRouter = Router()

// All routes require auth + admin/super_admin
router.use(authMiddleware)
router.use(requireRole('admin', 'super_admin'))

// ╔═══════════════════════════════════════════════════════╗
// ║  GET /api/admin/winners/stats                         ║
// ╚═══════════════════════════════════════════════════════╝
// NOTE: Must come before /:id routes to avoid param collision
router.get('/stats', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const rows = await query<{
      total: string
      unpaid: string
      partial: string
      paid: string
      unpaid_amount: string
      total_amount: string
    }>(`
      SELECT
        COUNT(*)                                              AS total,
        COUNT(*) FILTER (WHERE o.payment_status = 'unpaid')  AS unpaid,
        COUNT(*) FILTER (WHERE o.payment_status = 'partial') AS partial,
        COUNT(*) FILTER (WHERE o.payment_status = 'paid')    AS paid,
        COALESCE(SUM(o.total_amount) FILTER (WHERE o.payment_status = 'unpaid'), 0)  AS unpaid_amount,
        COALESCE(SUM(o.total_amount), 0) AS total_amount
      FROM orders o
      WHERE o.type = 'bid'
    `)

    const s = rows[0]
    res.json({
      success: true,
      data: {
        total: parseInt(s.total ?? '0'),
        unpaid: parseInt(s.unpaid ?? '0'),
        partial: parseInt(s.partial ?? '0'),
        paid: parseInt(s.paid ?? '0'),
        unpaidAmount: parseFloat(s.unpaid_amount ?? '0'),
        totalAmount: parseFloat(s.total_amount ?? '0'),
      },
    })
  } catch (error: unknown) {
    console.error('Failed to get winner stats:', error)
    res.status(500).json({ success: false, error: 'Failed to get winner stats' })
  }
})

// ╔═══════════════════════════════════════════════════════╗
// ║  GET /api/admin/winners/groups                        ║
// ╚═══════════════════════════════════════════════════════╝
router.get('/groups', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const rows = await query<{
      id: string
      name: Record<string, string>
      start_date: Date
      end_date: Date
      status: string
      winner_count: string
    }>(`
      SELECT
        g.id,
        g.name,
        g.start_date,
        g.end_date,
        g.status,
        COUNT(DISTINCT o.id) AS winner_count
      FROM groups g
      JOIN products p ON p.group_id = g.id
      JOIN orders   o ON o.product_id = p.id AND o.type = 'bid'
      GROUP BY g.id, g.name, g.start_date, g.end_date, g.status
      ORDER BY g.end_date DESC
    `)

    res.json({
      success: true,
      data: rows.map((g) => ({
        id: g.id,
        name: g.name,
        startDate: g.start_date,
        endDate: g.end_date,
        status: g.status,
        winnerCount: parseInt(g.winner_count ?? '0'),
      })),
    })
  } catch (error: unknown) {
    console.error('Failed to get winner groups:', error)
    res.status(500).json({ success: false, error: 'Failed to get groups' })
  }
})

// ╔═══════════════════════════════════════════════════════╗
// ║  GET /api/admin/winners                               ║
// ╚═══════════════════════════════════════════════════════╝
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 20))
    const offset = (page - 1) * pageSize

    const paymentStatus = (req.query.paymentStatus as string) || 'all'
    const status = (req.query.status as string) || 'all'
    const groupId = (req.query.groupId as string) || 'all'
    const search = ((req.query.search as string) || '').trim()
    const dateFrom = (req.query.dateFrom as string) || ''
    const dateTo = (req.query.dateTo as string) || ''

    const params: unknown[] = []
    const conditions: string[] = ["o.type = 'bid'"]

    if (paymentStatus !== 'all') {
      params.push(paymentStatus)
      conditions.push(`o.payment_status = $${params.length}`)
    }

    if (status !== 'all') {
      params.push(status)
      conditions.push(`o.status = $${params.length}`)
    }

    if (groupId !== 'all') {
      params.push(groupId)
      conditions.push(`p.group_id = $${params.length}`)
    }

    if (search) {
      const like = `%${search.toLowerCase()}%`
      params.push(like)
      const i = params.length
      conditions.push(`(
        LOWER(o.order_number) LIKE $${i}
        OR LOWER(u.first_name) LIKE $${i}
        OR LOWER(u.last_name) LIKE $${i}
        OR LOWER(u.email) LIKE $${i}
        OR LOWER(u.custom_id) LIKE $${i}
        OR LOWER(CONCAT(u.first_name, ' ', u.last_name)) LIKE $${i}
      )`)
    }

    if (dateFrom) {
      params.push(dateFrom)
      conditions.push(`o.created_at >= $${params.length}`)
    }

    if (dateTo) {
      params.push(dateTo)
      conditions.push(`o.created_at <= $${params.length}::date + interval '1 day'`)
    }

    const where = `WHERE ${conditions.join(' AND ')}`

    // limit and offset come after all filter params
    const limitIdx = params.length + 1
    const offsetIdx = params.length + 2
    params.push(pageSize, offset)

    const sql = `
      SELECT
        o.id,
        o.order_number,
        o.status,
        o.payment_status,
        o.bid_amount::float       AS bid_amount,
        o.amount::float           AS amount,
        o.tax_amount::float       AS tax_amount,
        o.commission_amount::float AS commission_amount,
        o.total_amount::float     AS total_amount,
        o.deposit_amount::float   AS deposit_amount,
        o.deposit_paid,
        o.notes,
        o.payment_method,
        o.created_at,
        o.updated_at,
        -- Winner (user)
        u.id          AS user_id,
        u.first_name,
        u.last_name,
        u.email,
        u.custom_id,
        u.phone,
        u.is_vip,
        -- Product (lot)
        p.id          AS product_id,
        p.name        AS product_name,
        p.slug        AS product_slug,
        p.feature_image,
        p.group_id,
        -- Group
        g.id          AS gid,
        g.name        AS group_name,
        g.start_date  AS group_start,
        g.end_date    AS group_end,
        -- Merchant
        mp.first_name AS merchant_first,
        mp.last_name  AS merchant_last,
        -- Total count window function (no extra query needed)
        COUNT(*) OVER() AS total_count
      FROM orders o
      JOIN profiles u  ON u.id  = o.user_id
      JOIN products p  ON p.id  = o.product_id
      LEFT JOIN profiles mp ON mp.id = o.merchant_id
      LEFT JOIN groups  g  ON g.id  = p.group_id
      ${where}
      ORDER BY o.created_at DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `

    type WinnerRow = {
      id: string
      order_number: string
      status: string
      payment_status: string
      bid_amount: number
      amount: number
      tax_amount: number
      commission_amount: number
      total_amount: number
      deposit_amount: number
      deposit_paid: boolean
      notes: string | null
      payment_method: string | null
      created_at: Date
      updated_at: Date
      user_id: string
      first_name: string
      last_name: string
      email: string
      custom_id: string
      phone: string | null
      is_vip: boolean
      product_id: string
      product_name: Record<string, string>
      product_slug: string
      feature_image: string | null
      group_id: string | null
      gid: string | null
      group_name: Record<string, string> | null
      group_start: Date | null
      group_end: Date | null
      merchant_first: string | null
      merchant_last: string | null
      total_count: string
    }

    const rows = await query<WinnerRow>(sql, params)
    const total = rows.length > 0 ? parseInt(rows[0].total_count) : 0

    const data = rows.map((r) => ({
      id: r.id,
      orderNumber: r.order_number,
      status: r.status,
      paymentStatus: r.payment_status,
      bidAmount: r.bid_amount,
      amount: r.amount,
      taxAmount: r.tax_amount,
      commissionAmount: r.commission_amount,
      totalAmount: r.total_amount,
      depositAmount: r.deposit_amount,
      depositPaid: r.deposit_paid,
      notes: r.notes,
      paymentMethod: r.payment_method,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      user: {
        id: r.user_id,
        firstName: r.first_name,
        lastName: r.last_name,
        email: r.email,
        customId: r.custom_id,
        phone: r.phone,
        isVip: r.is_vip,
      },
      product: {
        id: r.product_id,
        name: r.product_name,
        slug: r.product_slug,
        featureImage: r.feature_image,
        groupId: r.group_id,
      },
      group: r.gid
        ? {
            id: r.gid,
            name: r.group_name,
            startDate: r.group_start,
            endDate: r.group_end,
          }
        : null,
      merchant: {
        firstName: r.merchant_first,
        lastName: r.merchant_last,
      },
    }))

    res.json({ success: true, data, total, page, pageSize })
  } catch (error: unknown) {
    console.error('Failed to list winners:', error)
    res.status(500).json({ success: false, error: 'Failed to list winners' })
  }
})

// ╔═══════════════════════════════════════════════════════╗
// ║  PATCH /api/admin/winners/:id/payment-status          ║
// ╚═══════════════════════════════════════════════════════╝
router.patch('/:id/payment-status', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string }
    const { paymentStatus, notes } = req.body as { paymentStatus: string; notes?: string }

    const validStatuses = ['unpaid', 'partial', 'paid']
    if (!validStatuses.includes(paymentStatus)) {
      res.status(400).json({ success: false, error: 'Invalid payment status. Must be: unpaid, partial, or paid' })
      return
    }

    // Validate notes is a plain string when provided (prevent injection via logging)
    if (notes !== undefined && typeof notes !== 'string') {
      res.status(400).json({ success: false, error: 'Notes must be a string' })
      return
    }

    const existing = await queryOne<{
      id: string
      status: string
      payment_status: string
      order_number: string
      user_id: string
    }>(
      `SELECT id, status, payment_status, order_number, user_id
       FROM orders WHERE id = $1 AND type = 'bid'`,
      [id],
    )

    if (!existing) {
      res.status(404).json({ success: false, error: 'Winner order not found' })
      return
    }

    const result = await pool.query(
      `UPDATE orders
       SET payment_status = $1,
           notes          = COALESCE($2, notes),
           updated_at     = NOW()
       WHERE id = $3
       RETURNING id, order_number, status, payment_status, total_amount, updated_at`,
      [paymentStatus, notes ?? null, id],
    )

    // Audit log
    await pool.query(
      `INSERT INTO audit_log (user_id, action, entity_type, entity_id, old_values, new_values)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        req.userId,
        'update_payment_status',
        'order',
        id,
        JSON.stringify({ paymentStatus: existing.payment_status }),
        JSON.stringify({ paymentStatus, notes: notes ?? null }),
      ],
    )

    res.json({ success: true, data: result.rows[0] })
  } catch (error: unknown) {
    console.error('Failed to update payment status:', error)
    res.status(500).json({ success: false, error: 'Failed to update payment status' })
  }
})

// ╔═══════════════════════════════════════════════════════╗
// ║  PATCH /api/admin/winners/:id/order-status            ║
// ╚═══════════════════════════════════════════════════════╝
router.patch('/:id/order-status', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string }
    const { status, notes } = req.body as { status: string; notes?: string }

    const validStatuses = [
      'processing',
      'win',
      'shipped',
      'delivered',
      'completed',
      'on_hold',
      'rejected',
      'refunded',
    ]
    if (!validStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        error: `Invalid order status. Must be one of: ${validStatuses.join(', ')}`,
      })
      return
    }

    if (notes !== undefined && typeof notes !== 'string') {
      res.status(400).json({ success: false, error: 'Notes must be a string' })
      return
    }

    const existing = await queryOne<{
      id: string
      status: string
      payment_status: string
      order_number: string
      user_id: string
    }>(
      `SELECT id, status, payment_status, order_number, user_id
       FROM orders WHERE id = $1 AND type = 'bid'`,
      [id],
    )

    if (!existing) {
      res.status(404).json({ success: false, error: 'Winner order not found' })
      return
    }

    const result = await pool.query(
      `UPDATE orders
       SET status     = $1,
           notes      = COALESCE($2, notes),
           updated_at = NOW()
       WHERE id = $3
       RETURNING id, order_number, status, payment_status, total_amount, updated_at`,
      [status, notes ?? null, id],
    )

    // Audit log
    await pool.query(
      `INSERT INTO audit_log (user_id, action, entity_type, entity_id, old_values, new_values)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        req.userId,
        'update_order_status',
        'order',
        id,
        JSON.stringify({ status: existing.status }),
        JSON.stringify({ status, notes: notes ?? null }),
      ],
    )

    res.json({ success: true, data: result.rows[0] })
  } catch (error: unknown) {
    console.error('Failed to update order status:', error)
    res.status(500).json({ success: false, error: 'Failed to update order status' })
  }
})

export { router as winnerAdminRoutes }
