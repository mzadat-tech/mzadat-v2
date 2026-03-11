/**
 * Bid Service
 *
 * Handles bid placement with:
 *  - PostgreSQL `place_bid()` function for atomic, race-free execution
 *  - Single DB round-trip with row-level locking (SELECT … FOR UPDATE)
 *  - Anti-sniping extension computed inside the DB
 *  - WebSocket broadcast after the DB call succeeds
 *  - Automatic retry on lock/serialization conflicts
 */
import { prisma } from '@mzadat/db'
import { SNIPE_EXTENSION_SECONDS, MAX_SNIPE_EXTENSION_MINUTES } from '@mzadat/config'
import { rescheduleEndAuction } from './auction.service.js'
import { broadcastAuctionEvent } from '../websocket/broadcaster.js'

export interface PlaceBidResult {
  bidId: string
  amount: string
  isExtended: boolean
  newEndDate?: string
}

/** Bidder identity passed from authMiddleware's cached profile — avoids extra DB lookup. */
export interface BidderInfo {
  firstName: string
  lastName: string
  customId: string
}

/** Maximum retries on lock/serialization conflict. */
const MAX_BID_RETRIES = 3

/** Shape returned by the PG `place_bid()` function. */
interface PlaceBidDbResult {
  bidId: string
  amount: string
  isExtended: boolean
  newEndDate: string | null
  productId: string
  groupId: string | null
  merchantId: string
  createdAt: string
}

export const bidService = {
  /**
   * Place a bid on an auction product.
   *
   * Calls the PostgreSQL `place_bid()` function which does the entire
   * read → validate → write cycle in a single DB roundtrip with
   * `SELECT … FOR UPDATE` row locking. Concurrent bids on the same
   * product are serialized at the row level — no Serializable isolation
   * overhead, no snapshot conflicts, just a brief wait on the lock.
   *
   * If a lock-wait timeout or transient error occurs, we retry up to
   * MAX_BID_RETRIES times.
   */
  async placeBid(userId: string, productId: string, amount: number, bidderInfo?: BidderInfo): Promise<PlaceBidResult> {
    let lastError: unknown

    for (let attempt = 1; attempt <= MAX_BID_RETRIES; attempt++) {
      try {
        // ── Call the DB function ──────────────────────────────
        const rows = await prisma.$queryRaw<PlaceBidDbResult[]>`
          SELECT place_bid(
            ${userId}::uuid,
            ${productId}::uuid,
            ${amount}::numeric(12,3),
            ${SNIPE_EXTENSION_SECONDS}::int,
            ${MAX_SNIPE_EXTENSION_MINUTES}::int
          ) AS result
        `

        const result: PlaceBidDbResult = (rows[0] as any).result

        // ── Post-commit side effects (outside the DB txn) ────

        // Reschedule auction end job if anti-sniping extended it
        if (result.isExtended && result.newEndDate) {
          await rescheduleEndAuction(productId, new Date(result.newEndDate))
        }

        // Use bidder info from middleware (already fetched) — no extra DB call
        const userName = bidderInfo
          ? `${bidderInfo.firstName} ${bidderInfo.lastName}`
          : 'Unknown'
        const userCustomId = bidderInfo?.customId ?? ''

        // Broadcast to all subscribed clients
        broadcastAuctionEvent('bid:placed', {
          productId,
          groupId: result.groupId,
          bid: {
            id: result.bidId,
            amount: result.amount,
            userId,
            userName,
            userCustomId,
            createdAt: result.createdAt,
          },
          currentBid: result.amount,
          isExtended: result.isExtended,
          newEndDate: result.newEndDate,
        })

        return {
          bidId: result.bidId,
          amount: result.amount,
          isExtended: result.isExtended,
          newEndDate: result.newEndDate ?? undefined,
        }
      } catch (err: any) {
        lastError = err

        // PG function raises exceptions as error code P0001
        // Map them to BidError so the route handler returns proper HTTP codes
        const pgMessage = err?.meta?.message ?? err?.message ?? ''

        if (pgMessage.includes('Product not found')) throw new BidError('Product not found', 404)
        if (pgMessage.includes('not an auction')) throw new BidError('Product is not an auction', 400)
        if (pgMessage.includes('not active')) throw new BidError('Auction is not active', 400)
        if (pgMessage.includes('own product')) throw new BidError('Cannot bid on your own product', 400)
        if (pgMessage.includes('not started')) throw new BidError('Auction has not started yet', 400)
        if (pgMessage.includes('has ended')) throw new BidError('Auction has ended', 400)
        if (pgMessage.includes('Bid must be at least')) throw new BidError(pgMessage, 400)

        // Retryable: lock timeout or serialization conflict
        const isRetryable =
          err?.code === 'P2034' ||
          pgMessage.includes('could not serialize') ||
          pgMessage.includes('deadlock detected') ||
          pgMessage.includes('lock timeout')

        if (isRetryable && attempt < MAX_BID_RETRIES) {
          await new Promise((r) => setTimeout(r, 25 + Math.random() * 50))
          continue
        }

        throw err
      }
    }

    throw lastError
  },

  /** Get bid history for a product. */
  async getProductBids(productId: string, limit = 50, offset = 0) {

    const [bids, total] = await Promise.all([
      prisma.bidHistory.findMany({
        where: { productId, deletedAt: null },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, customId: true } },
        },
        orderBy: { amount: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.bidHistory.count({ where: { productId, deletedAt: null } }),
    ])

    return {
      data: bids.map((b) => ({
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
      total,
    }
  },
}

// ── Custom error ─────────────────────────────────────────────

export class BidError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
  ) {
    super(message)
    this.name = 'BidError'
  }
}
