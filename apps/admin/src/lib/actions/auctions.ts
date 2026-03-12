'use server'

/**
 * Server Actions for the Auction Dashboard
 *
 * Fetches data from the database directly (server-side)
 * for the admin auction monitoring dashboard.
 */
import { prisma } from '@mzadat/db'

// ── Types ────────────────────────────────────────────────────

export interface AuctionDashboardStats {
  liveCount: number
  upcomingCount: number
  endedTodayCount: number
  totalBidsToday: number
  activeGroupCount: number
}

export interface LiveAuction {
  id: string
  slug: string
  name: string
  featureImage: string | null
  currentBid: string
  minBidPrice: string
  bidCount: number
  startDate: string | null
  endDate: string | null
  originalEndDate: string | null
  totalExtensions: number
  status: 'live' | 'upcoming' | 'ended'
  groupId: string | null
  groupName: string | null
  merchantName: string
  merchantCustomId: string
}

export interface EndedAuction extends LiveAuction {
  winnerName: string | null
  winnerCustomId: string | null
  winningBid: string | null
}

export interface ActiveGroup {
  id: string
  name: string
  startDate: string
  endDate: string
  status: string
  totalLots: number
  liveLots: number
  endedLots: number
  upcomingLots: number
  totalBids: number
  merchantName: string
}

// ── Helpers ──────────────────────────────────────────────────

function pickLocale(json: unknown, locale = 'en'): string {
  if (!json || typeof json !== 'object') return ''
  const map = json as Record<string, string>
  return map[locale] ?? map['en'] ?? Object.values(map)[0] ?? ''
}

function auctionStatus(p: { startDate: Date | null; endDate: Date | null; status: string }): 'live' | 'upcoming' | 'ended' {
  const now = new Date()
  if (p.status === 'closed') return 'ended'
  if (p.startDate && now < p.startDate) return 'upcoming'
  if (p.endDate && now > p.endDate) return 'ended'
  return 'live'
}

/** Returns a map of productId → unique bidder count for the given product IDs. */
async function getUniqueBidderCountMap(productIds: string[]): Promise<Map<string, number>> {
  if (productIds.length === 0) return new Map()
  const rows = await prisma.bidHistory.groupBy({
    by: ['productId', 'userId'],
    where: { productId: { in: productIds }, deletedAt: null },
  })
  const map = new Map<string, number>()
  for (const row of rows) {
    map.set(row.productId, (map.get(row.productId) ?? 0) + 1)
  }
  return map
}

// ── Actions ──────────────────────────────────────────────────

export async function getAuctionDashboardStats(): Promise<AuctionDashboardStats> {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)

  const [liveCount, upcomingCount, endedTodayCount, uniqueBiddersTodayRes, activeGroupCount] =
    await Promise.all([
      prisma.product.count({
        where: {
          saleType: 'auction',
          status: 'published',
          startDate: { lte: now },
          endDate: { gte: now },
          deletedAt: null,
        },
      }),
      prisma.product.count({
        where: {
          saleType: 'auction',
          status: { in: ['published', 'pending'] },
          startDate: { gt: now },
          deletedAt: null,
        },
      }),
      prisma.product.count({
        where: {
          saleType: 'auction',
          status: 'closed',
          endDate: { gte: todayStart, lt: todayEnd },
          deletedAt: null,
        },
      }),
      // Count distinct customers who placed a bid today
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(DISTINCT user_id)::bigint AS count
        FROM bid_history
        WHERE created_at >= ${todayStart} AND deleted_at IS NULL
      `,
      prisma.group.count({
        where: { status: 'active' },
      }),
    ])

  return { liveCount, upcomingCount, endedTodayCount, totalBidsToday: Number((uniqueBiddersTodayRes as [{ count: bigint }])[0]?.count ?? 0), activeGroupCount }
}

export async function getLiveAuctions(): Promise<LiveAuction[]> {
  const now = new Date()

  const products = await prisma.product.findMany({
    where: {
      saleType: 'auction',
      status: 'published',
      startDate: { lte: now },
      endDate: { gte: now },
      deletedAt: null,
    },
    include: {
      group: { select: { id: true, name: true } },
      merchant: { select: { firstName: true, lastName: true, customId: true } },
    },
    orderBy: { endDate: 'asc' },
    take: 100,
  })

  const productIds = products.map((p) => p.id)
  const uniqueBidderMap = await getUniqueBidderCountMap(productIds)

  return products.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: pickLocale(p.name),
    featureImage: p.featureImage,
    currentBid: p.currentBid.toString(),
    minBidPrice: p.minBidPrice.toString(),
    bidCount: uniqueBidderMap.get(p.id) ?? 0,
    startDate: p.startDate?.toISOString() ?? null,
    endDate: p.endDate?.toISOString() ?? null,
    originalEndDate: p.originalEndDate?.toISOString() ?? null,
    totalExtensions: p.totalExtensions,
    status: auctionStatus(p),
    groupId: p.groupId,
    groupName: p.group ? pickLocale(p.group.name) : null,
    merchantName: `${p.merchant.firstName} ${p.merchant.lastName}`,
    merchantCustomId: p.merchant.customId,
  }))
}

export async function getUpcomingAuctions(): Promise<LiveAuction[]> {
  const now = new Date()

  const upcomingProducts = await prisma.product.findMany({
    where: {
      saleType: 'auction',
      status: { in: ['published', 'pending'] },
      startDate: { gt: now },
      deletedAt: null,
    },
    include: {
      group: { select: { id: true, name: true } },
      merchant: { select: { firstName: true, lastName: true, customId: true } },
    },
    orderBy: { startDate: 'asc' },
    take: 100,
  })

  const upcomingProductIds = upcomingProducts.map((p) => p.id)
  const upcomingUniqueBidderMap = await getUniqueBidderCountMap(upcomingProductIds)

  return upcomingProducts.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: pickLocale(p.name),
    featureImage: p.featureImage,
    currentBid: p.currentBid.toString(),
    minBidPrice: p.minBidPrice.toString(),
    bidCount: upcomingUniqueBidderMap.get(p.id) ?? 0,
    startDate: p.startDate?.toISOString() ?? null,
    endDate: p.endDate?.toISOString() ?? null,
    originalEndDate: p.originalEndDate?.toISOString() ?? null,
    totalExtensions: p.totalExtensions,
    status: 'upcoming' as const,
    groupId: p.groupId,
    groupName: p.group ? pickLocale(p.group.name) : null,
    merchantName: `${p.merchant.firstName} ${p.merchant.lastName}`,
    merchantCustomId: p.merchant.customId,
  }))
}

export async function getEndedAuctions(limit = 20): Promise<EndedAuction[]> {
  const now = new Date()

  const endedProducts = await prisma.product.findMany({
    where: {
      saleType: 'auction',
      OR: [
        { status: 'closed' },
        { endDate: { lt: now }, status: 'published' },
      ],
      deletedAt: null,
    },
    include: {
      group: { select: { id: true, name: true } },
      merchant: { select: { firstName: true, lastName: true, customId: true } },
      bids: {
        where: { isWinning: true, deletedAt: null },
        include: {
          user: { select: { firstName: true, lastName: true, customId: true } },
        },
        take: 1,
      },
    },
    orderBy: { endDate: 'desc' },
    take: limit,
  })

  const endedProductIds = endedProducts.map((p) => p.id)
  const endedUniqueBidderMap = await getUniqueBidderCountMap(endedProductIds)

  return endedProducts.map((p) => {
    const winner = p.bids[0]
    return {
      id: p.id,
      slug: p.slug,
      name: pickLocale(p.name),
      featureImage: p.featureImage,
      currentBid: p.currentBid.toString(),
      minBidPrice: p.minBidPrice.toString(),
      bidCount: endedUniqueBidderMap.get(p.id) ?? 0,
      startDate: p.startDate?.toISOString() ?? null,
      endDate: p.endDate?.toISOString() ?? null,
      originalEndDate: p.originalEndDate?.toISOString() ?? null,
      totalExtensions: p.totalExtensions,
      status: 'ended' as const,
      groupId: p.groupId,
      groupName: p.group ? pickLocale(p.group.name) : null,
      merchantName: `${p.merchant.firstName} ${p.merchant.lastName}`,
      merchantCustomId: p.merchant.customId,
      winnerName: winner ? `${winner.user.firstName} ${winner.user.lastName}` : null,
      winnerCustomId: winner?.user.customId ?? null,
      winningBid: winner?.amount.toString() ?? null,
    }
  })
}

export async function getActiveGroups(): Promise<ActiveGroup[]> {
  const now = new Date()

  const groups = await prisma.group.findMany({
    where: {
      OR: [
        { status: 'active' },
        { status: 'upcoming', startDate: { lte: now }, endDate: { gte: now } },
      ],
    },
    include: {
      merchant: { select: { firstName: true, lastName: true } },
      products: {
        where: { deletedAt: null },
        select: {
          id: true,
          status: true,
          startDate: true,
          endDate: true,
        },
      },
    },
    orderBy: { startDate: 'asc' },
  })

  // Unique bidder counts for all lots across all groups in one query
  const allGroupProductIds = groups.flatMap((g) => g.products.map((p) => p.id))
  const groupUniqueBidderMap = await getUniqueBidderCountMap(allGroupProductIds)

  return groups.map((g) => {
    const liveLots = g.products.filter(
      (p) => p.status === 'published' && p.startDate && p.startDate <= now && p.endDate && p.endDate >= now,
    ).length
    const endedLots = g.products.filter(
      (p) => p.status === 'closed' || (p.endDate && p.endDate < now),
    ).length

    return {
      id: g.id,
      name: pickLocale(g.name),
      startDate: g.startDate.toISOString(),
      endDate: g.endDate.toISOString(),
      status: g.status,
      totalLots: g.products.length,
      liveLots,
      endedLots,
      upcomingLots: g.products.length - liveLots - endedLots,
      totalBids: g.products.reduce((sum, p) => sum + (groupUniqueBidderMap.get(p.id) ?? 0), 0),
      merchantName: `${g.merchant.firstName} ${g.merchant.lastName}`,
    }
  })
}
