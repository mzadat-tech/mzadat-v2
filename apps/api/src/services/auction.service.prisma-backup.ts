/**
 * Auction Service
 *
 * Core business logic for auction lifecycle:
 *  - Querying live / upcoming / ended auctions
 *  - Starting & ending auctions (status transitions)
 *  - Anti-sniping extension
 *  - Dashboard aggregations
 *
 * All auction lifecycle decisions use product-level dates
 * (already synced from group by GROUP_DATE_ENFORCEMENT).
 */
import { prisma, type Product, type Group } from '@mzadat/db'
import { APP_TIMEZONE } from '@mzadat/config'
import {
  auctionLifecycleQueue,
  winnerProcessingQueue,
  type StartAuctionJob,
  type EndAuctionJob,
  type StartGroupJob,
  type EndGroupJob,
} from '../queues/index.js'
import { broadcastAuctionEvent } from '../websocket/broadcaster.js'

// ── Helpers ──────────────────────────────────────────────────

function pickLocale(json: unknown, locale = 'en'): string {
  if (!json || typeof json !== 'object') return ''
  const map = json as Record<string, string>
  return map[locale] ?? map['en'] ?? Object.values(map)[0] ?? ''
}

function getAuctionStatus(product: Pick<Product, 'startDate' | 'endDate' | 'status'>): 'upcoming' | 'live' | 'ended' {
  const now = new Date()
  if (product.status === 'closed') return 'ended'
  if (product.startDate && now < product.startDate) return 'upcoming'
  if (product.endDate && now > product.endDate) return 'ended'
  return 'live'
}

// ── Scheduling helpers ───────────────────────────────────────

/**
 * Schedule delayed BullMQ jobs for a product's start and end dates.
 * Idempotent — uses the productId as the job ID so duplicates are skipped.
 */
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

/**
 * Schedule delayed BullMQ jobs for a group's start and end dates.
 */
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

/**
 * Reschedule end-auction job (e.g., after anti-sniping extension).
 * Removes the old job and creates a new one with updated delay.
 */
export async function rescheduleEndAuction(productId: string, newEndDate: Date) {
  // Remove old end job
  const oldJob = await auctionLifecycleQueue.getJob(`end-${productId}`)
  if (oldJob) await oldJob.remove()

  const delay = newEndDate.getTime() - Date.now()
  if (delay > 0) {
    await auctionLifecycleQueue.add(
      'end-auction',
      { productId } satisfies EndAuctionJob,
      { jobId: `end-${productId}`, delay },
    )
  }
}

// ── Lifecycle transitions ────────────────────────────────────

/** Transition product to live/published. Called by the lifecycle worker. */
export async function activateAuction(productId: string) {
  const product = await prisma.product.findUnique({ where: { id: productId } })
  if (!product) return
  if (product.status !== 'pending' && product.status !== 'published') return
  // Only transition if it's actually time
  const now = new Date()
  if (product.startDate && now < product.startDate) return

  await prisma.product.update({
    where: { id: productId },
    data: { status: 'published' },
  })

  broadcastAuctionEvent('auction:started', {
    productId,
    startDate: product.startDate?.toISOString(),
    endDate: product.endDate?.toISOString(),
  })
}

/** Transition product to closed. Called by the lifecycle worker. */
export async function closeAuction(productId: string) {
  const product = await prisma.product.findUnique({ where: { id: productId } })
  if (!product) return
  if (product.status === 'closed') return

  // Check if anti-sniping extended the endDate past now
  const now = new Date()
  if (product.endDate && now < product.endDate) {
    // Auction was extended — reschedule
    await rescheduleEndAuction(productId, product.endDate)
    return
  }

  await prisma.product.update({
    where: { id: productId },
    data: { status: 'closed' },
  })

  broadcastAuctionEvent('auction:ended', {
    productId,
    finalBid: product.currentBid.toString(),
    bidCount: product.bidCount,
  })

  // Enqueue winner processing
  await winnerProcessingQueue.add(
    'process-winner',
    { productId },
    { jobId: `winner-${productId}` },
  )
}

/** Transition group to active. */
export async function activateGroup(groupId: string) {
  const group = await prisma.group.findUnique({ where: { id: groupId } })
  if (!group) return
  if (group.status !== 'upcoming') return

  const now = new Date()
  if (now < group.startDate) return

  await prisma.group.update({
    where: { id: groupId },
    data: { status: 'active' },
  })

  broadcastAuctionEvent('group:started', { groupId })
}

/** Transition group to closed (only if ALL lots are done). */
export async function closeGroup(groupId: string) {
  const now = new Date()

  // Check if any lot is still live (handles anti-snipe extensions)
  const activeLotCount = await prisma.product.count({
    where: {
      groupId,
      endDate: { gte: now },
      status: 'published',
      deletedAt: null,
    },
  })

  if (activeLotCount > 0) {
    // Some lots still running — schedule a re-check after the last one ends
    const lastLot = await prisma.product.findFirst({
      where: { groupId, endDate: { gte: now }, status: 'published', deletedAt: null },
      orderBy: { endDate: 'desc' },
      select: { endDate: true },
    })
    if (lastLot?.endDate) {
      const delay = lastLot.endDate.getTime() - now.getTime() + 5000 // +5s buffer
      await auctionLifecycleQueue.add(
        'end-group',
        { groupId },
        { jobId: `group-end-${groupId}`, delay },
      )
    }
    return
  }

  await prisma.group.update({
    where: { id: groupId },
    data: { status: 'closed' },
  })

  broadcastAuctionEvent('group:ended', { groupId })
}

// ── Query helpers ────────────────────────────────────────────

export const auctionService = {
  /** Get live auctions (currently active). */
  async getLive(locale = 'en', limit = 50, offset = 0) {
    const t0 = performance.now()
    const now = new Date()
    const where = {
      saleType: 'auction' as const,
      status: 'published' as const,
      startDate: { lte: now },
      endDate: { gte: now },
      deletedAt: null,
    }

    const [rows, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          group: { select: { id: true, name: true } },
          merchant: { select: { id: true, firstName: true, lastName: true, customId: true } },
          _count: { select: { bids: true } },
        },
        orderBy: { endDate: 'asc' },
        take: limit,
        skip: offset,
      }),
      prisma.product.count({ where }),
    ])
    const t1 = performance.now()
    console.log(`⏱️  getLive DB queries: ${(t1 - t0).toFixed(1)}ms (${rows.length} rows, total=${total})`)

    return {
      data: rows.map((p) => ({
        id: p.id,
        slug: p.slug,
        name: pickLocale(p.name, locale),
        featureImage: p.featureImage,
        currentBid: p.currentBid.toString(),
        minBidPrice: p.minBidPrice.toString(),
        price: p.price.toString(),
        bidCount: p.bidCount,
        startDate: p.startDate?.toISOString(),
        endDate: p.endDate?.toISOString(),
        originalEndDate: p.originalEndDate?.toISOString(),
        totalExtensions: p.totalExtensions,
        status: getAuctionStatus(p),
        group: p.group ? { id: p.group.id, name: pickLocale(p.group.name, locale) } : null,
        merchant: {
          id: p.merchant.id,
          name: `${p.merchant.firstName} ${p.merchant.lastName}`,
          customId: p.merchant.customId,
        },
      })),
      total,
    }
  },

  /** Get upcoming auctions. */
  async getUpcoming(locale = 'en', limit = 50, offset = 0) {
    const now = new Date()
    const where = {
      saleType: 'auction' as const,
      status: { in: ['published', 'pending'] as ('published' | 'pending')[] },
      startDate: { gt: now },
      deletedAt: null,
    }

    const [rows, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          group: { select: { id: true, name: true } },
          merchant: { select: { id: true, firstName: true, lastName: true, customId: true } },
        },
        orderBy: { startDate: 'asc' },
        take: limit,
        skip: offset,
      }),
      prisma.product.count({ where }),
    ])

    return {
      data: rows.map((p) => ({
        id: p.id,
        slug: p.slug,
        name: pickLocale(p.name, locale),
        featureImage: p.featureImage,
        price: p.price.toString(),
        minBidPrice: p.minBidPrice.toString(),
        startDate: p.startDate?.toISOString(),
        endDate: p.endDate?.toISOString(),
        status: 'upcoming' as const,
        group: p.group ? { id: p.group.id, name: pickLocale(p.group.name, locale) } : null,
        merchant: {
          id: p.merchant.id,
          name: `${p.merchant.firstName} ${p.merchant.lastName}`,
          customId: p.merchant.customId,
        },
      })),
      total,
    }
  },

  /** Get recently ended auctions. */
  async getEnded(locale = 'en', limit = 50, offset = 0) {
    const now = new Date()
    const where = {
      saleType: 'auction' as const,
      OR: [
        { status: 'closed' as const },
        { endDate: { lt: now }, status: 'published' as const },
      ],
      deletedAt: null,
    }

    const [rows, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          group: { select: { id: true, name: true } },
          merchant: { select: { id: true, firstName: true, lastName: true, customId: true } },
          bids: {
            where: { isWinning: true, deletedAt: null },
            include: { user: { select: { id: true, firstName: true, lastName: true, customId: true } } },
            take: 1,
          },
        },
        orderBy: { endDate: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.product.count({ where }),
    ])

    return {
      data: rows.map((p) => {
        const winner = p.bids[0]
        return {
          id: p.id,
          slug: p.slug,
          name: pickLocale(p.name, locale),
          featureImage: p.featureImage,
          currentBid: p.currentBid.toString(),
          bidCount: p.bidCount,
          startDate: p.startDate?.toISOString(),
          endDate: p.endDate?.toISOString(),
          totalExtensions: p.totalExtensions,
          status: 'ended' as const,
          group: p.group ? { id: p.group.id, name: pickLocale(p.group.name, locale) } : null,
          merchant: {
            id: p.merchant.id,
            name: `${p.merchant.firstName} ${p.merchant.lastName}`,
            customId: p.merchant.customId,
          },
          winner: winner
            ? {
                id: winner.user.id,
                name: `${winner.user.firstName} ${winner.user.lastName}`,
                customId: winner.user.customId,
                amount: winner.amount.toString(),
              }
            : null,
        }
      }),
      total,
    }
  },

  /** Dashboard stats for admin. */
  async getDashboardStats() {
    const now = new Date()

    const [liveCount, upcomingCount, endedTodayCount, totalBidsToday, activeGroupCount] =
      await Promise.all([
        // Live auctions
        prisma.product.count({
          where: {
            saleType: 'auction',
            status: 'published',
            startDate: { lte: now },
            endDate: { gte: now },
            deletedAt: null,
          },
        }),
        // Upcoming
        prisma.product.count({
          where: {
            saleType: 'auction',
            status: { in: ['published', 'pending'] as ('published' | 'pending')[] },
            startDate: { gt: now },
            deletedAt: null,
          },
        }),
        // Ended today
        prisma.product.count({
          where: {
            saleType: 'auction',
            status: 'closed',
            endDate: {
              gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
              lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
            },
            deletedAt: null,
          },
        }),
        // Bids placed today
        prisma.bidHistory.count({
          where: {
            createdAt: {
              gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
            },
            deletedAt: null,
          },
        }),
        // Active groups
        prisma.group.count({
          where: { status: 'active' },
        }),
      ])

    return {
      liveCount,
      upcomingCount,
      endedTodayCount,
      totalBidsToday,
      activeGroupCount,
    }
  },

  /** Get a single auction with full details. */
  async getById(productId: string, locale = 'en') {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        group: true,
        merchant: { select: { id: true, firstName: true, lastName: true, customId: true, image: true } },
        gallery: { orderBy: { sortOrder: 'asc' } },
        specifications: { orderBy: { sortOrder: 'asc' } },
        bids: {
          where: { deletedAt: null },
          orderBy: { amount: 'desc' },
          take: 20,
          include: {
            user: { select: { id: true, firstName: true, lastName: true, customId: true } },
          },
        },
        _count: { select: { bids: true, watchlist: true } },
      },
    })

    if (!product) return null

    return {
      id: product.id,
      slug: product.slug,
      name: pickLocale(product.name, locale),
      description: pickLocale(product.description, locale),
      featureImage: product.featureImage,
      gallery: product.gallery.map((g) => ({ id: g.id, image: g.image, sortOrder: g.sortOrder })),
      specifications: product.specifications.map((s) => ({
        id: s.id,
        label: pickLocale(s.label, locale),
        value: pickLocale(s.value, locale),
      })),
      saleType: product.saleType,
      price: product.price.toString(),
      minBidPrice: product.minBidPrice.toString(),
      reservePrice: product.reservePrice?.toString() ?? null,
      currentBid: product.currentBid.toString(),
      bidIncrement1: product.bidIncrement1.toString(),
      bidIncrement2: product.bidIncrement2?.toString() ?? null,
      bidIncrement3: product.bidIncrement3?.toString() ?? null,
      bidIncrement4: product.bidIncrement4?.toString() ?? null,
      minDeposit: product.minDeposit.toString(),
      minDepositType: product.minDepositType,
      startDate: product.startDate?.toISOString(),
      endDate: product.endDate?.toISOString(),
      originalEndDate: product.originalEndDate?.toISOString(),
      snipeExtensionSeconds: product.snipeExtensionSeconds,
      maxSnipeExtensionMinutes: product.maxSnipeExtensionMinutes,
      totalExtensions: product.totalExtensions,
      bidCount: product.bidCount,
      viewCount: product.viewCount,
      watchlistCount: product._count.watchlist,
      location: product.location,
      inspectionNotes: product.inspectionNotes,
      status: getAuctionStatus(product),
      productStatus: product.status,
      group: product.group
        ? {
            id: product.group.id,
            name: pickLocale(product.group.name, locale),
            status: product.group.status,
          }
        : null,
      merchant: {
        id: product.merchant.id,
        name: `${product.merchant.firstName} ${product.merchant.lastName}`,
        customId: product.merchant.customId,
        image: product.merchant.image,
      },
      recentBids: product.bids.map((b) => ({
        id: b.id,
        amount: b.amount.toString(),
        isWinning: b.isWinning,
        createdAt: b.createdAt.toISOString(),
        user: {
          id: b.user.id,
          name: `${b.user.firstName} ${b.user.lastName}`,
          customId: b.user.customId,
        },
      })),
    }
  },

  /** Get group with its lots and live status. */
  async getGroupWithLots(groupId: string, locale = 'en') {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        merchant: { select: { id: true, firstName: true, lastName: true, customId: true } },
        products: {
          where: { deletedAt: null },
          include: {
            _count: { select: { bids: true } },
            bids: {
              where: { isWinning: true, deletedAt: null },
              include: { user: { select: { id: true, firstName: true, lastName: true, customId: true } } },
              take: 1,
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!group) return null

    const now = new Date()
    const activeLotCount = group.products.filter(
      (p) => p.status === 'published' && p.endDate && p.endDate >= now && p.startDate && p.startDate <= now,
    ).length

    const derivedStatus: 'upcoming' | 'active' | 'closed' =
      activeLotCount > 0 ? 'active' : now < group.startDate ? 'upcoming' : 'closed'

    return {
      id: group.id,
      name: pickLocale(group.name, locale),
      description: pickLocale(group.description, locale),
      image: group.image,
      startDate: group.startDate.toISOString(),
      endDate: group.endDate.toISOString(),
      inspectionStartDate: group.inspectionStartDate?.toISOString(),
      inspectionEndDate: group.inspectionEndDate?.toISOString(),
      minDeposit: group.minDeposit.toString(),
      status: group.status,
      derivedStatus,
      activeLotCount,
      totalLots: group.products.length,
      merchant: {
        id: group.merchant.id,
        name: `${group.merchant.firstName} ${group.merchant.lastName}`,
        customId: group.merchant.customId,
      },
      lots: group.products.map((p) => {
        const winner = p.bids[0]
        return {
          id: p.id,
          slug: p.slug,
          name: pickLocale(p.name, locale),
          featureImage: p.featureImage,
          price: p.price.toString(),
          currentBid: p.currentBid.toString(),
          minBidPrice: p.minBidPrice.toString(),
          bidCount: p.bidCount,
          startDate: p.startDate?.toISOString(),
          endDate: p.endDate?.toISOString(),
          totalExtensions: p.totalExtensions,
          status: getAuctionStatus(p),
          productStatus: p.status,
          winner: winner
            ? {
                id: winner.user.id,
                name: `${winner.user.firstName} ${winner.user.lastName}`,
                customId: winner.user.customId,
                amount: winner.amount.toString(),
              }
            : null,
        }
      }),
    }
  },
}
