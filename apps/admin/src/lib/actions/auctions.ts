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

// ── Actions ──────────────────────────────────────────────────

export async function getAuctionDashboardStats(): Promise<AuctionDashboardStats> {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)

  const [liveCount, upcomingCount, endedTodayCount, totalBidsToday, activeGroupCount] =
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
      prisma.bidHistory.count({
        where: {
          createdAt: { gte: todayStart },
          deletedAt: null,
        },
      }),
      prisma.group.count({
        where: { status: 'active' },
      }),
    ])

  return { liveCount, upcomingCount, endedTodayCount, totalBidsToday, activeGroupCount }
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

  return products.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: pickLocale(p.name),
    featureImage: p.featureImage,
    currentBid: p.currentBid.toString(),
    minBidPrice: p.minBidPrice.toString(),
    bidCount: p.bidCount,
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

  const products = await prisma.product.findMany({
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

  return products.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: pickLocale(p.name),
    featureImage: p.featureImage,
    currentBid: p.currentBid.toString(),
    minBidPrice: p.minBidPrice.toString(),
    bidCount: p.bidCount,
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

  const products = await prisma.product.findMany({
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

  return products.map((p) => {
    const winner = p.bids[0]
    return {
      id: p.id,
      slug: p.slug,
      name: pickLocale(p.name),
      featureImage: p.featureImage,
      currentBid: p.currentBid.toString(),
      minBidPrice: p.minBidPrice.toString(),
      bidCount: p.bidCount,
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
          bidCount: true,
        },
      },
    },
    orderBy: { startDate: 'asc' },
  })

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
      totalBids: g.products.reduce((sum, p) => sum + p.bidCount, 0),
      merchantName: `${g.merchant.firstName} ${g.merchant.lastName}`,
    }
  })
}
