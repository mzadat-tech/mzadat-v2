/**
 * Auction Service (raw SQL reads)
 *
 * All read queries use node-postgres (pg) directly with JOINs in a
 * single SQL statement. This eliminates the N+1 "include" waterfall
 * that Prisma generates (separate SELECT per relation).
 *
 * Mutations (status transitions, bid placement, etc.) still use Prisma
 * or raw $queryRaw via Prisma where transactions are needed.
 */
import { query, queryOne } from '@mzadat/db'
import { prisma, type Product, type Group } from '@mzadat/db'
import { APP_TIMEZONE } from '@mzadat/config'
import { resolveImageFields } from '../utils/storage.js'
import {
  auctionLifecycleQueue,
  winnerProcessingQueue,
  type StartAuctionJob,
  type EndAuctionJob,
  type StartGroupJob,
  type EndGroupJob,
} from '../queues/index.js'
import { broadcastAuctionEvent } from '../websocket/broadcaster.js'
import { notify } from './notification.service.js'

// ── Helpers ──────────────────────────────────────────────────

function pickLocale(json: unknown, locale = 'en'): string {
  if (!json || typeof json !== 'object') return ''
  const map = json as Record<string, string>
  return map[locale] ?? map['en'] ?? Object.values(map)[0] ?? ''
}

function getAuctionStatus(row: { start_date?: string | Date | null; end_date?: string | Date | null; status: string }): 'upcoming' | 'live' | 'ended' {
  const now = new Date()
  if (row.status === 'closed') return 'ended'
  const start = row.start_date ? new Date(row.start_date) : null
  const end = row.end_date ? new Date(row.end_date) : null
  if (start && now < start) return 'upcoming'
  if (end && now > end) return 'ended'
  return 'live'
}

// ── Scheduling helpers ───────────────────────────────────────

export async function scheduleAuctionJobs(product: Pick<Product, 'id' | 'startDate' | 'endDate'>) {
  const now = Date.now()
  if (product.startDate) {
    const delay = product.startDate.getTime() - now
    if (delay > 0) {
      await auctionLifecycleQueue.add(
        'start-auction',
        { productId: product.id } satisfies StartAuctionJob,
        { jobId: `start-${product.id}`, delay },
      )
    }
  }
  if (product.endDate) {
    const delay = product.endDate.getTime() - now
    if (delay > 0) {
      await auctionLifecycleQueue.add(
        'end-auction',
        { productId: product.id } satisfies EndAuctionJob,
        { jobId: `end-${product.id}`, delay },
      )
    }
  }
}

export async function scheduleGroupJobs(group: Pick<Group, 'id' | 'startDate' | 'endDate'>) {
  const now = Date.now()
  const delay = group.startDate.getTime() - now
  if (delay > 0) {
    await auctionLifecycleQueue.add(
      'start-group',
      { groupId: group.id } satisfies StartGroupJob,
      { jobId: `group-start-${group.id}`, delay },
    )
  }
  const endDelay = group.endDate.getTime() - now
  if (endDelay > 0) {
    await auctionLifecycleQueue.add(
      'end-group',
      { groupId: group.id } satisfies EndGroupJob,
      { jobId: `group-end-${group.id}`, delay: endDelay },
    )
  }
}

export async function rescheduleEndAuction(productId: string, newEndDate: Date) {
  const jobId = `end-${productId}`
  try {
    const oldJob = await auctionLifecycleQueue.getJob(jobId)
    if (oldJob) {
      const state = await oldJob.getState()
      if (state === 'delayed' || state === 'waiting') {
        await oldJob.remove()
      } else {
        // Job is active/completed — changeDelay won't help, just let it run;
        // closeAuction's endDate guard will reschedule if needed.
        console.log(`⏭️  Cannot remove end-job for ${productId} (state=${state}), relying on closeAuction guard`)
      }
    }
  } catch (err) {
    console.warn(`⚠️  Failed to remove old end-job for ${productId}:`, err)
  }

  const delay = newEndDate.getTime() - Date.now()
  if (delay > 0) {
    try {
      await auctionLifecycleQueue.add(
        'end-auction',
        { productId } satisfies EndAuctionJob,
        { jobId, delay },
      )
    } catch {
      // Job ID already exists (e.g. completed/failed state) — use a unique suffix
      const fallbackId = `${jobId}-ext-${Date.now()}`
      await auctionLifecycleQueue.add(
        'end-auction',
        { productId } satisfies EndAuctionJob,
        { jobId: fallbackId, delay },
      )
    }
    console.log(`🔄 Rescheduled end-auction for ${productId} in ${Math.round(delay / 1000)}s`)
  }
}

// ── Lifecycle transitions (mutations — keep Prisma) ──────────

export async function activateAuction(productId: string) {
  const product = await prisma.product.findUnique({ where: { id: productId } })
  if (!product) return
  if (product.status !== 'pending' && product.status !== 'published') return
  const now = new Date()
  if (product.startDate && now < product.startDate) return
  await prisma.product.update({ where: { id: productId }, data: { status: 'published' } })
  broadcastAuctionEvent('auction:started', {
    productId,
    startDate: product.startDate?.toISOString(),
    endDate: product.endDate?.toISOString(),
  })

  // Notify registered users that auction is live
  if (product.groupId) {
    const pName = product.name as Record<string, string> | null
    const registrations = await query<{ user_id: string }>([
      `SELECT user_id FROM auction_registrations`,
      `WHERE group_id = $1 AND status = 'active'`,
    ].join(' '), [product.groupId])
    for (const reg of registrations) {
      notify.auctionStart(
        reg.user_id,
        { en: pName?.en ?? '', ar: pName?.ar ?? '' },
        productId,
        product.groupId ?? undefined,
      ).catch((e) => console.error('Notification error (auction start):', e))
    }
  }
}

export async function closeAuction(productId: string) {
  const product = await prisma.product.findUnique({ where: { id: productId } })
  if (!product) return
  if (product.status === 'closed') return
  const now = new Date()
  if (product.endDate && now < product.endDate) {
    console.log(`⏳ closeAuction: ${productId} still live until ${product.endDate.toISOString()}, rescheduling`)
    await rescheduleEndAuction(productId, product.endDate)
    return
  }
  await prisma.product.update({ where: { id: productId }, data: { status: 'closed' } })
  broadcastAuctionEvent('auction:ended', {
    productId,
    finalBid: product.currentBid.toString(),
    bidCount: product.bidCount,
  })

  // Notify admin that auction ended
  const pName = product.name as Record<string, string> | null
  notify.adminAuctionEnded(pName?.en ?? '', productId, product.bidCount).catch((e) =>
    console.error('Notification error (auction ended admin):', e),
  )
  try {
    await winnerProcessingQueue.add('process-winner', { productId }, { jobId: `winner-${productId}` })
  } catch {
    // Job ID already exists (duplicate close) — add with unique suffix
    await winnerProcessingQueue.add('process-winner', { productId }, { jobId: `winner-${productId}-${Date.now()}` })
  }
}

export async function activateGroup(groupId: string) {
  const group = await prisma.group.findUnique({ where: { id: groupId } })
  if (!group) return
  if (group.status !== 'upcoming') return
  const now = new Date()
  if (now < group.startDate) return
  await prisma.group.update({ where: { id: groupId }, data: { status: 'active' } })
  broadcastAuctionEvent('group:started', { groupId })

  // Notify registered users that the group is live
  const gName = group.name as Record<string, string> | null
  const registrations = await query<{ user_id: string }>([
    `SELECT user_id FROM auction_registrations`,
    `WHERE group_id = $1 AND status = 'active'`,
  ].join(' '), [groupId])
  for (const reg of registrations) {
    notify.auctionStart(
      reg.user_id,
      { en: gName?.en ?? '', ar: gName?.ar ?? '' },
      '',
      groupId,
    ).catch((e) => console.error('Notification error (group start):', e))
  }
}

export async function closeGroup(groupId: string) {
  const now = new Date()
  const activeLotCount = await prisma.product.count({
    where: { groupId, endDate: { gte: now }, status: 'published', deletedAt: null },
  })
  if (activeLotCount > 0) {
    const lastLot = await prisma.product.findFirst({
      where: { groupId, endDate: { gte: now }, status: 'published', deletedAt: null },
      orderBy: { endDate: 'desc' },
      select: { endDate: true },
    })
    if (lastLot?.endDate) {
      const delay = lastLot.endDate.getTime() - now.getTime() + 5000
      await auctionLifecycleQueue.add('end-group', { groupId }, { jobId: `group-end-${groupId}`, delay })
    }
    return
  }
  await prisma.group.update({ where: { id: groupId }, data: { status: 'closed' } })
  broadcastAuctionEvent('group:ended', { groupId })
}

/**
 * Admin force-close: immediately close ALL lots in a group,
 * process winners, and close the group — regardless of end dates.
 *
 * Steps per lot:
 *  1. Set endDate to NOW, status → closed
 *  2. Broadcast auction:ended
 *  3. Enqueue process-winner job
 * Then close the group itself.
 */
export async function forceCloseGroup(groupId: string): Promise<{
  success: boolean
  closedLots: number
  alreadyClosed: number
  error?: string
}> {
  const group = await prisma.group.findUnique({ where: { id: groupId } })
  if (!group) return { success: false, closedLots: 0, alreadyClosed: 0, error: 'Group not found' }
  if (group.status === 'closed') return { success: false, closedLots: 0, alreadyClosed: 0, error: 'Group is already closed' }

  // Fetch all lots belonging to this group (non-deleted)
  const lots = await prisma.product.findMany({
    where: { groupId, deletedAt: null },
    select: { id: true, status: true, name: true, currentBid: true, bidCount: true },
  })

  const now = new Date()
  let closedLots = 0
  let alreadyClosed = 0

  for (const lot of lots) {
    if (lot.status === 'closed') {
      alreadyClosed++
      continue
    }

    // Force-close the lot: set endDate to now, status to closed
    await prisma.product.update({
      where: { id: lot.id },
      data: { endDate: now, status: 'closed' },
    })

    broadcastAuctionEvent('auction:ended', {
      productId: lot.id,
      finalBid: lot.currentBid?.toString() ?? '0',
      bidCount: lot.bidCount,
    })

    // Notify admin that auction ended
    const pName = lot.name as Record<string, string> | null
    notify.adminAuctionEnded(pName?.en ?? '', lot.id, lot.bidCount).catch((e) =>
      console.error('Notification error (force-close auction ended admin):', e),
    )

    // Enqueue winner processing
    try {
      await winnerProcessingQueue.add('process-winner', { productId: lot.id }, { jobId: `winner-${lot.id}` })
    } catch {
      await winnerProcessingQueue.add('process-winner', { productId: lot.id }, { jobId: `winner-${lot.id}-${Date.now()}` })
    }

    closedLots++
  }

  // Remove any pending lifecycle jobs for this group
  try {
    const groupEndJob = await auctionLifecycleQueue.getJob(`group-end-${groupId}`)
    if (groupEndJob) {
      const state = await groupEndJob.getState()
      if (state === 'delayed' || state === 'waiting') await groupEndJob.remove()
    }
    const groupStartJob = await auctionLifecycleQueue.getJob(`group-start-${groupId}`)
    if (groupStartJob) {
      const state = await groupStartJob.getState()
      if (state === 'delayed' || state === 'waiting') await groupStartJob.remove()
    }
  } catch (err) {
    console.warn('⚠️  Failed to clean up lifecycle jobs for group:', err)
  }

  // Close the group
  await prisma.group.update({
    where: { id: groupId },
    data: { status: 'closed', endDate: now },
  })
  broadcastAuctionEvent('group:ended', { groupId })

  console.log(`🔒 Force-closed group ${groupId}: ${closedLots} lots closed, ${alreadyClosed} already closed`)

  return { success: true, closedLots, alreadyClosed }
}

// ══════════════════════════════════════════════════════════════
// READ QUERIES — raw SQL with JOINs (single round-trip each)
// ══════════════════════════════════════════════════════════════

export const auctionService = {

  /** Get live auctions — single SQL with JOINs + window COUNT. */
  async getLive(locale = 'en', limit = 50, offset = 0) {
    const t0 = performance.now()

    const rows = await query<{
      id: string; slug: string; name: unknown; feature_image: string | null
      current_bid: string; min_bid_price: string; price: string; bid_count: number
      start_date: string; end_date: string; original_end_date: string | null
      total_extensions: number; status: string
      group_id: string | null; group_name: unknown | null
      merchant_id: string; first_name: string; last_name: string; custom_id: string
      total: string
    }>(`
      SELECT
        p.id, p.slug, p.name, p.feature_image, p.current_bid, p.min_bid_price,
        p.price, p.bid_count, p.start_date, p.end_date, p.original_end_date,
        p.total_extensions, p.status,
        g.id AS group_id, g.name AS group_name,
        m.id AS merchant_id, m.first_name, m.last_name, m.custom_id,
        COUNT(*) OVER() AS total
      FROM products p
      LEFT JOIN groups g ON g.id = p.group_id
      INNER JOIN profiles m ON m.id = p.merchant_id
      WHERE p.sale_type = 'auction'
        AND p.status = 'published'
        AND p.start_date <= NOW()
        AND p.end_date >= NOW()
        AND p.deleted_at IS NULL
      ORDER BY p.end_date ASC
      LIMIT $1 OFFSET $2
    `, [limit, offset])

    const t1 = performance.now()
    const total = rows.length > 0 ? parseInt(rows[0].total) : 0
    console.log(`⏱️  getLive SQL: ${(t1 - t0).toFixed(0)}ms (${rows.length} rows, total=${total})`)

    const data = rows.map((p) => ({
        id: p.id,
        slug: p.slug,
        name: pickLocale(p.name, locale),
        featureImage: p.feature_image,
        currentBid: p.current_bid,
        minBidPrice: p.min_bid_price,
        price: p.price,
        bidCount: p.bid_count,
        startDate: p.start_date,
        endDate: p.end_date,
        originalEndDate: p.original_end_date,
        totalExtensions: p.total_extensions,
        status: getAuctionStatus(p),
        group: p.group_id ? { id: p.group_id, name: pickLocale(p.group_name, locale) } : null,
        merchant: {
          id: p.merchant_id,
          name: `${p.first_name} ${p.last_name}`,
          customId: p.custom_id,
        },
      }))
    resolveImageFields(data, ['featureImage'])
    return { data, total }
  },

  /** Get upcoming auctions. */
  async getUpcoming(locale = 'en', limit = 50, offset = 0) {
    const rows = await query<{
      id: string; slug: string; name: unknown; feature_image: string | null
      price: string; min_bid_price: string; start_date: string; end_date: string | null
      status: string
      group_id: string | null; group_name: unknown | null
      merchant_id: string; first_name: string; last_name: string; custom_id: string
      total: string
    }>(`
      SELECT
        p.id, p.slug, p.name, p.feature_image, p.price, p.min_bid_price,
        p.start_date, p.end_date, p.status,
        g.id AS group_id, g.name AS group_name,
        m.id AS merchant_id, m.first_name, m.last_name, m.custom_id,
        COUNT(*) OVER() AS total
      FROM products p
      LEFT JOIN groups g ON g.id = p.group_id
      INNER JOIN profiles m ON m.id = p.merchant_id
      WHERE p.sale_type = 'auction'
        AND p.status IN ('published', 'pending')
        AND p.start_date > NOW()
        AND p.deleted_at IS NULL
      ORDER BY p.start_date ASC
      LIMIT $1 OFFSET $2
    `, [limit, offset])

    const total = rows.length > 0 ? parseInt(rows[0].total) : 0
    const data = rows.map((p) => ({
        id: p.id,
        slug: p.slug,
        name: pickLocale(p.name, locale),
        featureImage: p.feature_image,
        price: p.price,
        minBidPrice: p.min_bid_price,
        startDate: p.start_date,
        endDate: p.end_date,
        status: 'upcoming' as const,
        group: p.group_id ? { id: p.group_id, name: pickLocale(p.group_name, locale) } : null,
        merchant: {
          id: p.merchant_id,
          name: `${p.first_name} ${p.last_name}`,
          customId: p.custom_id,
        },
      }))
    resolveImageFields(data, ['featureImage'])
    return { data, total }
  },

  /** Get recently ended auctions with optional winner info. */
  async getEnded(locale = 'en', limit = 50, offset = 0) {
    const rows = await query<{
      id: string; slug: string; name: unknown; feature_image: string | null
      current_bid: string; bid_count: number; start_date: string; end_date: string
      total_extensions: number; status: string
      group_id: string | null; group_name: unknown | null
      merchant_id: string; first_name: string; last_name: string; custom_id: string
      winner_id: string | null; winner_first: string | null; winner_last: string | null
      winner_custom_id: string | null; winning_amount: string | null
      total: string
    }>(`
      SELECT
        p.id, p.slug, p.name, p.feature_image, p.current_bid, p.bid_count,
        p.start_date, p.end_date, p.total_extensions, p.status,
        g.id AS group_id, g.name AS group_name,
        m.id AS merchant_id, m.first_name, m.last_name, m.custom_id,
        w.id AS winner_id, wu.first_name AS winner_first, wu.last_name AS winner_last,
        wu.custom_id AS winner_custom_id, w.amount AS winning_amount,
        COUNT(*) OVER() AS total
      FROM products p
      LEFT JOIN groups g ON g.id = p.group_id
      INNER JOIN profiles m ON m.id = p.merchant_id
      LEFT JOIN LATERAL (
        SELECT bh.id, bh.amount, bh.user_id
        FROM bid_history bh
        WHERE bh.product_id = p.id AND bh.is_winning = true AND bh.deleted_at IS NULL
        LIMIT 1
      ) w ON true
      LEFT JOIN profiles wu ON wu.id = w.user_id
      WHERE p.sale_type = 'auction'
        AND (p.status = 'closed' OR (p.end_date < NOW() AND p.status = 'published'))
        AND p.deleted_at IS NULL
      ORDER BY p.end_date DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset])

    const total = rows.length > 0 ? parseInt(rows[0].total) : 0
    const data = rows.map((p) => ({
        id: p.id,
        slug: p.slug,
        name: pickLocale(p.name, locale),
        featureImage: p.feature_image,
        currentBid: p.current_bid,
        bidCount: p.bid_count,
        startDate: p.start_date,
        endDate: p.end_date,
        totalExtensions: p.total_extensions,
        status: 'ended' as const,
        group: p.group_id ? { id: p.group_id, name: pickLocale(p.group_name, locale) } : null,
        merchant: {
          id: p.merchant_id,
          name: `${p.first_name} ${p.last_name}`,
          customId: p.custom_id,
        },
        winner: p.winner_id
          ? {
              id: p.winner_id,
              name: `${p.winner_first} ${p.winner_last}`,
              customId: p.winner_custom_id!,
              amount: p.winning_amount!,
            }
          : null,
      }))
    resolveImageFields(data, ['featureImage'])
    return { data, total }
  },

  /** Get direct sale products. */
  async getDirectSales(locale = 'en', limit = 50, offset = 0) {
    const rows = await query<{
      id: string; slug: string; name: unknown; feature_image: string | null
      price: string; current_bid: string; bid_count: number
      start_date: string | null; end_date: string | null; status: string
      location: unknown | null
      group_id: string | null; group_name: unknown | null
      merchant_id: string; first_name: string; last_name: string; custom_id: string
      store_name: unknown | null; store_slug: string | null
      total: string
    }>(`
      SELECT
        p.id, p.slug, p.name, p.feature_image, p.price, p.current_bid,
        p.bid_count, p.start_date, p.end_date, p.status, p.location,
        g.id AS group_id, g.name AS group_name,
        m.id AS merchant_id, m.first_name, m.last_name, m.custom_id,
        s.name AS store_name, s.slug AS store_slug,
        COUNT(*) OVER() AS total
      FROM products p
      LEFT JOIN groups g ON g.id = p.group_id
      INNER JOIN profiles m ON m.id = p.merchant_id
      LEFT JOIN stores s ON s.id = p.store_id
      WHERE p.sale_type = 'direct'
        AND p.status = 'published'
        AND p.deleted_at IS NULL
      ORDER BY p.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset])

    const total = rows.length > 0 ? parseInt(rows[0].total) : 0
    const data = rows.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: pickLocale(p.name, locale),
      featureImage: p.feature_image,
      price: p.price,
      currentBid: p.current_bid,
      minBidPrice: p.price,
      bidCount: p.bid_count,
      startDate: p.start_date,
      endDate: p.end_date,
      status: p.status,
      location: pickLocale(p.location, locale),
      saleType: 'direct' as const,
      storeName: pickLocale(p.store_name, locale),
      storeSlug: p.store_slug,
      group: p.group_id ? { id: p.group_id, name: pickLocale(p.group_name, locale) } : null,
      merchant: {
        id: p.merchant_id,
        name: `${p.first_name} ${p.last_name}`,
        customId: p.custom_id,
      },
    }))
    resolveImageFields(data, ['featureImage'])
    return { data, total }
  },

  /** Dashboard stats — single query with subquery aggregation. */
  async getDashboardStats() {
    const [stats] = await query<{
      live_count: string
      upcoming_count: string
      ended_today_count: string
      bids_today: string
      active_groups: string
    }>(`
      SELECT
        (SELECT COUNT(*) FROM products
         WHERE sale_type = 'auction' AND status = 'published'
           AND start_date <= NOW() AND end_date >= NOW() AND deleted_at IS NULL
        ) AS live_count,
        (SELECT COUNT(*) FROM products
         WHERE sale_type = 'auction' AND status IN ('published','pending')
           AND start_date > NOW() AND deleted_at IS NULL
        ) AS upcoming_count,
        (SELECT COUNT(*) FROM products
         WHERE sale_type = 'auction' AND status = 'closed'
           AND end_date >= CURRENT_DATE AND end_date < CURRENT_DATE + INTERVAL '1 day'
           AND deleted_at IS NULL
        ) AS ended_today_count,
        (SELECT COUNT(*) FROM bid_history
         WHERE created_at >= CURRENT_DATE AND deleted_at IS NULL
        ) AS bids_today,
        (SELECT COUNT(*) FROM groups WHERE status = 'active') AS active_groups
    `)

    return {
      liveCount: parseInt(stats.live_count),
      upcomingCount: parseInt(stats.upcoming_count),
      endedTodayCount: parseInt(stats.ended_today_count),
      totalBidsToday: parseInt(stats.bids_today),
      activeGroupCount: parseInt(stats.active_groups),
    }
  },

  /** Single auction detail. */
  async getById(productId: string, locale = 'en') {
    const row = await queryOne<{
      id: string; slug: string; name: unknown; description: unknown; short_description: unknown
      feature_image: string | null; sale_type: string
      price: string; min_bid_price: string; reserve_price: string | null
      current_bid: string; bid_increment_1: string
      bid_increment_2: string | null; bid_increment_3: string | null; bid_increment_4: string | null
      min_deposit: string; min_deposit_type: string
      start_date: string | null; end_date: string | null; original_end_date: string | null
      snipe_extension_seconds: number; max_snipe_extension_minutes: number
      total_extensions: number; bid_count: number; view_count: number
      location: string | null; inspection_notes: string | null; status: string
      group_id: string | null; group_name: unknown | null; group_status: string | null
      merchant_id: string; m_first_name: string; m_last_name: string; m_custom_id: string; m_image: string | null
      watchlist_count: string
    }>(`
      SELECT
        p.id, p.slug, p.name, p.description, p.short_description, p.feature_image, p.sale_type,
        p.price, p.min_bid_price, p.reserve_price, p.current_bid,
        p.bid_increment_1, p.bid_increment_2, p.bid_increment_3, p.bid_increment_4,
        p.min_deposit, p.min_deposit_type,
        p.start_date, p.end_date, p.original_end_date,
        p.snipe_extension_seconds, p.max_snipe_extension_minutes,
        p.total_extensions, p.bid_count, p.view_count,
        p.location, p.inspection_notes, p.status,
        g.id AS group_id, g.name AS group_name, g.status AS group_status,
        m.id AS merchant_id, m.first_name AS m_first_name, m.last_name AS m_last_name,
        m.custom_id AS m_custom_id, m.image AS m_image,
        0 AS watchlist_count
      FROM products p
      LEFT JOIN groups g ON g.id = p.group_id
      INNER JOIN profiles m ON m.id = p.merchant_id
      WHERE p.id = $1
    `, [productId])

    if (!row) return null

    // gallery, specs, and recent bids — 3 parallel simple indexed queries
    const [gallery, specifications, bids] = await Promise.all([
      query<{ id: string; image: string; sort_order: number }>(`
        SELECT id, image, sort_order FROM product_galleries
        WHERE product_id = $1 ORDER BY sort_order ASC
      `, [productId]),
      query<{ id: string; label: unknown; value: unknown; sort_order: number }>(`
        SELECT id, label, value, sort_order FROM product_specifications
        WHERE product_id = $1 ORDER BY sort_order ASC
      `, [productId]),
      query<{
        id: string; amount: string; is_winning: boolean; created_at: string
        user_id: string; u_first_name: string; u_last_name: string; u_custom_id: string
      }>(`
        SELECT bh.id, bh.amount, bh.is_winning, bh.created_at,
               u.id AS user_id, u.first_name AS u_first_name,
               u.last_name AS u_last_name, u.custom_id AS u_custom_id
        FROM bid_history bh
        INNER JOIN profiles u ON u.id = bh.user_id
        WHERE bh.product_id = $1 AND bh.deleted_at IS NULL
        ORDER BY bh.amount DESC LIMIT 20
      `, [productId]),
    ])

    const result = {
      id: row.id,
      slug: row.slug,
      name: pickLocale(row.name, locale),
      description: pickLocale(row.description, locale),
      shortDescription: pickLocale(row.short_description, locale),
      featureImage: row.feature_image,
      gallery: gallery.map((g) => ({ id: g.id, image: g.image, sortOrder: g.sort_order })),
      specifications: specifications.map((s) => ({
        id: s.id,
        label: pickLocale(s.label, locale),
        value: pickLocale(s.value, locale),
      })),
      saleType: row.sale_type,
      price: row.price,
      minBidPrice: row.min_bid_price,
      reservePrice: row.reserve_price,
      currentBid: row.current_bid,
      bidIncrement1: row.bid_increment_1,
      bidIncrement2: row.bid_increment_2,
      bidIncrement3: row.bid_increment_3,
      bidIncrement4: row.bid_increment_4,
      minDeposit: row.min_deposit,
      minDepositType: row.min_deposit_type,
      startDate: row.start_date,
      endDate: row.end_date,
      originalEndDate: row.original_end_date,
      snipeExtensionSeconds: row.snipe_extension_seconds,
      maxSnipeExtensionMinutes: row.max_snipe_extension_minutes,
      totalExtensions: row.total_extensions,
      bidCount: row.bid_count,
      viewCount: row.view_count,
      watchlistCount: parseInt(row.watchlist_count),
      location: row.location,
      inspectionNotes: row.inspection_notes,
      status: getAuctionStatus(row),
      productStatus: row.status,
      group: row.group_id
        ? { id: row.group_id, name: pickLocale(row.group_name, locale), status: row.group_status! }
        : null,
      merchant: {
        id: row.merchant_id,
        name: `${row.m_first_name} ${row.m_last_name}`,
        customId: row.m_custom_id,
        image: row.m_image,
      },
      recentBids: bids.map((b) => ({
        id: b.id,
        amount: b.amount,
        isWinning: b.is_winning,
        createdAt: b.created_at,
        user: {
          id: b.user_id,
          name: `${b.u_first_name} ${b.u_last_name}`,
          customId: b.u_custom_id,
        },
      })),
    }
    resolveImageFields(result, ['featureImage'])
    return result
  },

  /** Get auction by slug (same detail as getById). */
  async getBySlug(slug: string, locale = 'en') {
    const row = await queryOne<{ id: string }>(`
      SELECT id FROM products WHERE slug = $1 AND deleted_at IS NULL LIMIT 1
    `, [slug])
    if (!row) return null
    return auctionService.getById(row.id, locale)
  },

  /** Search auctions by name/slug text. */
  async search(q: string, locale = 'en', limit = 20, offset = 0) {
    const pattern = `%${q}%`
    const rows = await query<{
      id: string; slug: string; name: unknown; feature_image: string | null
      current_bid: string; price: string; min_bid_price: string; bid_count: number
      start_date: string | null; end_date: string | null; status: string
      group_id: string | null; group_name: unknown | null
      category_slug: string | null; category_name: unknown | null
      store_name: unknown | null; store_slug: string | null
      location: unknown | null
      total: string
    }>(`
      SELECT
        p.id, p.slug, p.name, p.feature_image,
        p.current_bid, p.price, p.min_bid_price, p.bid_count,
        p.start_date, p.end_date, p.status,
        g.id AS group_id, g.name AS group_name,
        c.slug AS category_slug, c.name AS category_name,
        s.name AS store_name, s.slug AS store_slug,
        p.location,
        COUNT(*) OVER() AS total
      FROM products p
      LEFT JOIN groups g ON g.id = p.group_id
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN stores s ON s.id = p.store_id
      WHERE p.deleted_at IS NULL
        AND (p.slug ILIKE $3 OR p.name::text ILIKE $3)
      ORDER BY p.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset, pattern])

    const total = rows.length > 0 ? parseInt(rows[0].total) : 0

    const data = rows.map((p) => ({
        id: p.id,
        slug: p.slug,
        name: pickLocale(p.name, locale),
        featureImage: p.feature_image,
        currentBid: p.current_bid,
        price: p.price,
        minBidPrice: p.min_bid_price,
        bidCount: p.bid_count,
        startDate: p.start_date,
        endDate: p.end_date,
        status: p.status,
        categoryName: pickLocale(p.category_name, locale),
        categorySlug: p.category_slug,
        storeName: pickLocale(p.store_name, locale),
        storeSlug: p.store_slug,
        location: pickLocale(p.location, locale),
        group: p.group_id ? { id: p.group_id, name: pickLocale(p.group_name, locale) } : null,
      }))
    resolveImageFields(data, ['featureImage'])
    return { data, total }
  },

  /** Public stats for homepage (total auctions, bids, users). */
  async getPublicStats() {
    const [stats] = await query<{
      total_auctions: string
      total_bids: string
      total_users: string
    }>(`
      SELECT
        (SELECT COUNT(*) FROM products WHERE deleted_at IS NULL) AS total_auctions,
        (SELECT COUNT(*) FROM bid_history WHERE deleted_at IS NULL) AS total_bids,
        (SELECT COUNT(*) FROM profiles WHERE status = 'active') AS total_users
    `)

    return {
      totalAuctions: parseInt(stats.total_auctions),
      totalBids: parseInt(stats.total_bids),
      totalUsers: parseInt(stats.total_users),
    }
  },

  /** Group with all its lots. */
  async getGroupWithLots(groupId: string, locale = 'en') {
    const groupRow = await queryOne<{
      id: string; name: unknown; description: unknown; image: string | null
      start_date: string; end_date: string
      inspection_start_date: string | null; inspection_end_date: string | null
      min_deposit: string; status: string
      merchant_id: string; m_first_name: string; m_last_name: string; m_custom_id: string
    }>(`
      SELECT g.id, g.name, g.description, g.image,
             g.start_date, g.end_date, g.inspection_start_date, g.inspection_end_date,
             g.min_deposit, g.status,
             m.id AS merchant_id, m.first_name AS m_first_name,
             m.last_name AS m_last_name, m.custom_id AS m_custom_id
      FROM groups g
      INNER JOIN profiles m ON m.id = g.merchant_id
      WHERE g.id = $1
    `, [groupId])

    if (!groupRow) return null

    const lots = await query<{
      id: string; slug: string; name: unknown; feature_image: string | null
      price: string; current_bid: string; min_bid_price: string
      bid_count: number; start_date: string | null; end_date: string | null
      total_extensions: number; status: string
      winner_id: string | null; winner_first: string | null; winner_last: string | null
      winner_custom_id: string | null; winning_amount: string | null
    }>(`
      SELECT p.id, p.slug, p.name, p.feature_image, p.price, p.current_bid,
             p.min_bid_price, p.bid_count, p.start_date, p.end_date,
             p.total_extensions, p.status,
             w.user_id AS winner_id, wu.first_name AS winner_first,
             wu.last_name AS winner_last, wu.custom_id AS winner_custom_id,
             w.amount AS winning_amount
      FROM products p
      LEFT JOIN LATERAL (
        SELECT bh.user_id, bh.amount
        FROM bid_history bh
        WHERE bh.product_id = p.id AND bh.is_winning = true AND bh.deleted_at IS NULL
        LIMIT 1
      ) w ON true
      LEFT JOIN profiles wu ON wu.id = w.user_id
      WHERE p.group_id = $1 AND p.deleted_at IS NULL
      ORDER BY p.created_at ASC
    `, [groupId])

    const now = new Date()
    const activeLotCount = lots.filter((p) => {
      if (p.status !== 'published') return false
      const s = p.start_date ? new Date(p.start_date) : null
      const e = p.end_date ? new Date(p.end_date) : null
      return s && s <= now && e && e >= now
    }).length

    const derivedStatus: 'upcoming' | 'active' | 'closed' =
      activeLotCount > 0 ? 'active' : now < new Date(groupRow.start_date) ? 'upcoming' : 'closed'

    const result = {
      id: groupRow.id,
      name: pickLocale(groupRow.name, locale),
      description: pickLocale(groupRow.description, locale),
      image: groupRow.image,
      startDate: groupRow.start_date,
      endDate: groupRow.end_date,
      inspectionStartDate: groupRow.inspection_start_date,
      inspectionEndDate: groupRow.inspection_end_date,
      minDeposit: groupRow.min_deposit,
      status: groupRow.status,
      derivedStatus,
      activeLotCount,
      totalLots: lots.length,
      merchant: {
        id: groupRow.merchant_id,
        name: `${groupRow.m_first_name} ${groupRow.m_last_name}`,
        customId: groupRow.m_custom_id,
      },
      lots: lots.map((p) => ({
        id: p.id,
        slug: p.slug,
        name: pickLocale(p.name, locale),
        featureImage: p.feature_image,
        price: p.price,
        currentBid: p.current_bid,
        minBidPrice: p.min_bid_price,
        bidCount: p.bid_count,
        startDate: p.start_date,
        endDate: p.end_date,
        totalExtensions: p.total_extensions,
        status: getAuctionStatus(p),
        productStatus: p.status,
        winner: p.winner_id
          ? {
              id: p.winner_id,
              name: `${p.winner_first} ${p.winner_last}`,
              customId: p.winner_custom_id!,
              amount: p.winning_amount!,
            }
          : null,
      })),
    }
    resolveImageFields(result, ['image', 'featureImage'])
    return result
  },
}
