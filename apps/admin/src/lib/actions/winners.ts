'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth'
import { query, queryOne, pool } from '@mzadat/db'

// ── Types ────────────────────────────────────────────────────────

export interface WinnerStats {
  total: number
  unpaid: number
  partial: number
  paid: number
  unpaidAmount: number
  totalAmount: number
}

export interface WinnerGroup {
  id: string
  name: Record<string, string>
  startDate: string
  endDate: string
  status: string
  winnerCount: number
}

export interface WinnerRow {
  id: string
  orderNumber: string
  status: string
  paymentStatus: string
  bidAmount: number
  amount: number
  taxAmount: number
  commissionAmount: number
  totalAmount: number
  depositAmount: number
  depositPaid: boolean
  notes: string | null
  paymentMethod: string | null
  createdAt: string
  updatedAt: string
  user: {
    id: string
    firstName: string
    lastName: string
    email: string
    customId: string
    phone: string | null
    isVip: boolean
  }
  product: {
    id: string
    name: Record<string, string>
    slug: string
    featureImage: string | null
    groupId: string | null
  }
  group: {
    id: string
    name: Record<string, string>
    startDate: string
    endDate: string
  } | null
  merchant: {
    firstName: string | null
    lastName: string | null
  }
}

export interface GetWinnersParams {
  page?: number
  pageSize?: number
  paymentStatus?: string
  status?: string
  groupId?: string
  search?: string
  dateFrom?: string
  dateTo?: string
}

// ── Raw row shape returned by pg ─────────────────────────────────

type WinnerPgRow = {
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

// ── Helpers ──────────────────────────────────────────────────────

function mapWinnerRow(r: WinnerPgRow): WinnerRow {
  return {
    id: r.id,
    orderNumber: r.order_number,
    status: r.status,
    paymentStatus: r.payment_status,
    bidAmount: Number(r.bid_amount),
    amount: Number(r.amount),
    taxAmount: Number(r.tax_amount),
    commissionAmount: Number(r.commission_amount),
    totalAmount: Number(r.total_amount),
    depositAmount: Number(r.deposit_amount),
    depositPaid: r.deposit_paid,
    notes: r.notes,
    paymentMethod: r.payment_method,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
    updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : r.updated_at,
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
      name: r.product_name ?? {},
      slug: r.product_slug,
      featureImage: r.feature_image,
      groupId: r.group_id,
    },
    group: r.gid
      ? {
          id: r.gid,
          name: r.group_name ?? {},
          startDate: r.group_start instanceof Date ? r.group_start.toISOString() : (r.group_start ?? ''),
          endDate: r.group_end instanceof Date ? r.group_end.toISOString() : (r.group_end ?? ''),
        }
      : null,
    merchant: {
      firstName: r.merchant_first,
      lastName: r.merchant_last,
    },
  }
}

// ── Actions ──────────────────────────────────────────────────────

/** Fetch winners stats (counts + amounts by payment status) */
export async function getWinnerStats(): Promise<WinnerStats> {
  await requireAdmin()

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
      COALESCE(SUM(o.total_amount) FILTER (WHERE o.payment_status = 'unpaid'), 0) AS unpaid_amount,
      COALESCE(SUM(o.total_amount), 0) AS total_amount
    FROM orders o
    WHERE o.type = 'bid'
  `)

  const s = rows[0]
  return {
    total: parseInt(s?.total ?? '0'),
    unpaid: parseInt(s?.unpaid ?? '0'),
    partial: parseInt(s?.partial ?? '0'),
    paid: parseInt(s?.paid ?? '0'),
    unpaidAmount: parseFloat(s?.unpaid_amount ?? '0'),
    totalAmount: parseFloat(s?.total_amount ?? '0'),
  }
}

/** Fetch groups that have bid winners (for filter dropdown) */
export async function getWinnerGroups(): Promise<WinnerGroup[]> {
  await requireAdmin()

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

  return rows.map((g) => ({
    id: g.id,
    name: g.name ?? {},
    startDate: g.start_date instanceof Date ? g.start_date.toISOString() : (g.start_date as unknown as string),
    endDate: g.end_date instanceof Date ? g.end_date.toISOString() : (g.end_date as unknown as string),
    status: g.status,
    winnerCount: parseInt(g.winner_count ?? '0'),
  }))
}

/** Paginated + filtered list of auction winners */
export async function getWinners(params: GetWinnersParams): Promise<{
  data: WinnerRow[]
  total: number
}> {
  await requireAdmin()

  const page = Math.max(1, params.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20))
  const offset = (page - 1) * pageSize

  const conditions: string[] = ["o.type = 'bid'"]
  const binds: unknown[] = []

  if (params.paymentStatus && params.paymentStatus !== 'all') {
    binds.push(params.paymentStatus)
    conditions.push(`o.payment_status = $${binds.length}`)
  }

  if (params.status && params.status !== 'all') {
    binds.push(params.status)
    conditions.push(`o.status = $${binds.length}`)
  }

  if (params.groupId && params.groupId !== 'all') {
    binds.push(params.groupId)
    conditions.push(`p.group_id = $${binds.length}`)
  }

  if (params.search?.trim()) {
    const like = `%${params.search.trim().toLowerCase()}%`
    binds.push(like)
    const i = binds.length
    conditions.push(`(
      LOWER(o.order_number) LIKE $${i}
      OR LOWER(u.first_name) LIKE $${i}
      OR LOWER(u.last_name) LIKE $${i}
      OR LOWER(u.email) LIKE $${i}
      OR LOWER(u.custom_id) LIKE $${i}
      OR LOWER(CONCAT(u.first_name, ' ', u.last_name)) LIKE $${i}
    )`)
  }

  if (params.dateFrom) {
    binds.push(params.dateFrom)
    conditions.push(`o.created_at >= $${binds.length}`)
  }

  if (params.dateTo) {
    binds.push(params.dateTo)
    conditions.push(`o.created_at <= $${binds.length}::date + interval '1 day'`)
  }

  const where = `WHERE ${conditions.join(' AND ')}`
  const limitIdx = binds.length + 1
  const offsetIdx = binds.length + 2
  binds.push(pageSize, offset)

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
      u.id          AS user_id,
      u.first_name,
      u.last_name,
      u.email,
      u.custom_id,
      u.phone,
      u.is_vip,
      p.id          AS product_id,
      p.name        AS product_name,
      p.slug        AS product_slug,
      p.feature_image,
      p.group_id,
      g.id          AS gid,
      g.name        AS group_name,
      g.start_date  AS group_start,
      g.end_date    AS group_end,
      mp.first_name AS merchant_first,
      mp.last_name  AS merchant_last,
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

  const rows = await query<WinnerPgRow>(sql, binds)
  const total = rows.length > 0 ? parseInt(rows[0].total_count) : 0

  return { data: rows.map(mapWinnerRow), total }
}

/** Update payment status for a winner order */
export async function updateWinnerPaymentStatus(
  orderId: string,
  paymentStatus: 'unpaid' | 'partial' | 'paid',
  notes?: string,
): Promise<{ error?: string }> {
  const admin = await requireAdmin()

  const validStatuses = ['unpaid', 'partial', 'paid']
  if (!validStatuses.includes(paymentStatus)) {
    return { error: 'Invalid payment status' }
  }

  const existing = await queryOne<{
    id: string
    payment_status: string
    status: string
  }>(
    `SELECT id, payment_status, status FROM orders WHERE id = $1 AND type = 'bid'`,
    [orderId],
  )

  if (!existing) return { error: 'Winner order not found' }

  await pool.query(
    `UPDATE orders
     SET payment_status = $1,
         notes          = COALESCE($2, notes),
         updated_at     = NOW()
     WHERE id = $3`,
    [paymentStatus, notes ?? null, orderId],
  )

  await pool.query(
    `INSERT INTO audit_log (user_id, action, entity_type, entity_id, old_values, new_values)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      admin.id,
      'update_payment_status',
      'order',
      orderId,
      JSON.stringify({ paymentStatus: existing.payment_status }),
      JSON.stringify({ paymentStatus, notes: notes ?? null }),
    ],
  )

  revalidatePath('/winners')
  return {}
}

/** Update order (lot) status for a winner */
export async function updateWinnerOrderStatus(
  orderId: string,
  status: string,
  notes?: string,
): Promise<{ error?: string }> {
  const admin = await requireAdmin()

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
    return { error: `Invalid order status. Must be one of: ${validStatuses.join(', ')}` }
  }

  const existing = await queryOne<{
    id: string
    status: string
    payment_status: string
  }>(
    `SELECT id, status, payment_status FROM orders WHERE id = $1 AND type = 'bid'`,
    [orderId],
  )

  if (!existing) return { error: 'Winner order not found' }

  await pool.query(
    `UPDATE orders
     SET status     = $1,
         notes      = COALESCE($2, notes),
         updated_at = NOW()
     WHERE id = $3`,
    [status, notes ?? null, orderId],
  )

  await pool.query(
    `INSERT INTO audit_log (user_id, action, entity_type, entity_id, old_values, new_values)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      admin.id,
      'update_order_status',
      'order',
      orderId,
      JSON.stringify({ status: existing.status }),
      JSON.stringify({ status, notes: notes ?? null }),
    ],
  )

  revalidatePath('/winners')
  return {}
}
