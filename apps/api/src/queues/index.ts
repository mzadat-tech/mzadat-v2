/**
 * BullMQ Queue definitions.
 *
 * Three queues:
 *  1. auctionLifecycle — delayed jobs for start / end of auctions & groups
 *  2. winnerProcessing — processes winner after auction ends
 *  3. auctionScanner   — repeatable cron that catches missed transitions
 */
import { Queue } from 'bullmq'
import { bullConnection } from '../config/redis.js'

// ── Queue names (constants) ──────────────────────────────────
export const QUEUE_NAMES = {
  AUCTION_LIFECYCLE: 'auction-lifecycle',
  WINNER_PROCESSING: 'auction-winner',
  AUCTION_SCANNER: 'auction-scanner',
} as const

// ── Job type discriminators ──────────────────────────────────
export type AuctionLifecycleJobName =
  | 'start-auction'
  | 'end-auction'
  | 'start-group'
  | 'end-group'

export interface StartAuctionJob {
  productId: string
}

export interface EndAuctionJob {
  productId: string
}

export interface StartGroupJob {
  groupId: string
}

export interface EndGroupJob {
  groupId: string
}

export interface ProcessWinnerJob {
  productId: string
}

export interface ScannerJob {
  type: 'scan'
}

// ── Queue instances ──────────────────────────────────────────

export const auctionLifecycleQueue = new Queue<
  StartAuctionJob | EndAuctionJob | StartGroupJob | EndGroupJob,
  unknown,
  AuctionLifecycleJobName
>(QUEUE_NAMES.AUCTION_LIFECYCLE, {
  ...bullConnection,
  defaultJobOptions: {
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 200 },
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  },
})

export const winnerProcessingQueue = new Queue<ProcessWinnerJob, unknown, 'process-winner'>(
  QUEUE_NAMES.WINNER_PROCESSING,
  {
    ...bullConnection,
    defaultJobOptions: {
      removeOnComplete: { count: 200 },
      removeOnFail: { count: 100 },
      attempts: 3,
      backoff: { type: 'exponential', delay: 10000 },
    },
  },
)

export const auctionScannerQueue = new Queue<ScannerJob, unknown, 'scan'>(
  QUEUE_NAMES.AUCTION_SCANNER,
  {
    ...bullConnection,
    defaultJobOptions: {
      removeOnComplete: { count: 50 },
      removeOnFail: { count: 20 },
    },
  },
)

// Suppress unhandled Redis connection errors on queues (they auto-reconnect)
for (const q of [auctionLifecycleQueue, winnerProcessingQueue, auctionScannerQueue]) {
  q.on('error', (err) => {
    // Log once, don't spam
    if (!(q as any).__errorLogged) {
      console.warn(`⚠️  Queue "${q.name}" Redis error: ${err.message}`)
      ;(q as any).__errorLogged = true
    }
  })
}
