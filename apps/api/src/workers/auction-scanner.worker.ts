/**
 * Auction Scanner Worker
 *
 * Periodic job that catches missed auction lifecycle transitions.
 * Runs every 30 seconds as a repeatable BullMQ job.
 *
 * Catches:
 *  - Auctions that should have started (startDate <= now, status = pending)
 *  - Auctions that should have ended (endDate <= now, status still published)
 *  - Groups that should have started/ended
 *
 * Design notes:
 *  - Uses a *dedicated* PrismaClient with a small connection cap (3) so the
 *    scanner never starves the HTTP server's connection pool.
 *  - All per-item lifecycle calls run in parallel via Promise.allSettled so a
 *    single slow/failing item does not block the rest or hold connections open
 *    longer than necessary.
 *  - Connection errors abort the current scan immediately and are logged as
 *    warnings (not errors) — the next scheduled run will catch up.
 */
import { Worker, type Job } from 'bullmq'
import { PrismaClient } from '@mzadat/db'
import { bullConnection } from '../config/redis.js'
import { QUEUE_NAMES, auctionScannerQueue, type ScannerJob } from '../queues/index.js'
import {
  scheduleAuctionJobs,
  scheduleGroupJobs,
  activateAuction,
  closeAuction,
  activateGroup,
  closeGroup,
} from '../services/auction.service.js'

// ── Dedicated Prisma client with a capped pool ───────────────
// Appending connection_limit and pool_timeout keeps the scanner from
// competing with the HTTP server for the shared 33-connection pool.
function buildScannerDatabaseUrl(): string | undefined {
  const base = process.env.DATABASE_URL
  if (!base) return undefined
  const sep = base.includes('?') ? '&' : '?'
  return `${base}${sep}connection_limit=3&pool_timeout=15`
}

const scannerDbUrl = buildScannerDatabaseUrl()
const scannerPrisma = scannerDbUrl
  ? new PrismaClient({ datasourceUrl: scannerDbUrl })
  : new PrismaClient()

// ── Connection-error detection ───────────────────────────────
function isConnectionError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return (
    msg.includes('Server has closed the connection') ||
    msg.includes('connection pool') ||
    msg.includes('Connection pool timed out') ||
    msg.includes('Timed out fetching') ||
    msg.includes('ECONNRESET') ||
    msg.includes('ETIMEDOUT')
  )
}

// ── Helper: run items in parallel, log per-item failures ─────
async function runAll<T>(
  label: string,
  items: T[],
  fn: (item: T) => Promise<void>,
): Promise<void> {
  const results = await Promise.allSettled(items.map(fn))
  for (const result of results) {
    if (result.status === 'rejected') {
      console.error(`❌ Scanner [${label}] item failed:`, result.reason?.message ?? result.reason)
    }
  }
}

export async function startAuctionScannerWorker() {
  // Add repeatable scanner job (every 30 seconds)
  await auctionScannerQueue.add(
    'scan',
    { type: 'scan' },
    {
      repeat: { every: 30_000 },
      jobId: 'auction-scanner-repeat',
    },
  )

  const worker = new Worker<ScannerJob>(
    QUEUE_NAMES.AUCTION_SCANNER,
    async (_job: Job<ScannerJob>) => {
      const now = new Date()

      try {
        // ── 1 & 2. Fetch all actionable auctions in two queries ──
        const [shouldStart, shouldEnd] = await Promise.all([
          scannerPrisma.product.findMany({
            where: {
              saleType: 'auction',
              status: 'pending',
              startDate: { lte: now },
              deletedAt: null,
            },
            select: { id: true },
          }),
          scannerPrisma.product.findMany({
            where: {
              saleType: 'auction',
              status: 'published',
              endDate: { lt: now },
              deletedAt: null,
            },
            select: { id: true },
          }),
        ])

        // ── 3 & 4. Fetch all actionable groups in two queries ──
        const [groupsShouldStart, groupsShouldEnd] = await Promise.all([
          scannerPrisma.group.findMany({
            where: { status: 'upcoming', startDate: { lte: now } },
            select: { id: true },
          }),
          scannerPrisma.group.findMany({
            where: { status: 'active', endDate: { lt: now } },
            select: { id: true },
          }),
        ])

        // ── 5. Fetch future items for scheduling ───────────────
        const [futureAuctions, futureGroups] = await Promise.all([
          scannerPrisma.product.findMany({
            where: {
              saleType: 'auction',
              status: { in: ['pending', 'published'] },
              startDate: { gt: now },
              deletedAt: null,
            },
            select: { id: true, startDate: true, endDate: true },
            take: 200,
          }),
          scannerPrisma.group.findMany({
            where: { status: 'upcoming', startDate: { gt: now } },
            select: { id: true, startDate: true, endDate: true },
            take: 100,
          }),
        ])

        // ── Process all lifecycle transitions in parallel ──────
        await Promise.all([
          runAll('activate-auction', shouldStart, (p) => activateAuction(p.id)),
          runAll('close-auction', shouldEnd, (p) => closeAuction(p.id)),
          runAll('activate-group', groupsShouldStart, (g) => activateGroup(g.id)),
          runAll('close-group', groupsShouldEnd, (g) => closeGroup(g.id)),
          runAll('schedule-auction', futureAuctions, scheduleAuctionJobs),
          runAll('schedule-group', futureGroups, scheduleGroupJobs),
        ])

        if (shouldStart.length || shouldEnd.length || groupsShouldStart.length || groupsShouldEnd.length) {
          console.log(
            `🔍 Scanner: started=${shouldStart.length}, ended=${shouldEnd.length}, ` +
              `groups-started=${groupsShouldStart.length}, groups-ended=${groupsShouldEnd.length}`,
          )
        }
      } catch (err) {
        if (isConnectionError(err)) {
          // Transient DB unavailability — skip this tick; next run will catch up.
          console.warn('⚠️  Scanner: DB connection unavailable, skipping tick:', (err as Error).message)
          return
        }
        throw err
      }
    },
    {
      ...bullConnection,
      concurrency: 1,
    },
  )

  worker.on('failed', (_job, err) => {
    console.error(`❌ Scanner job failed:`, err.message)
  })

  worker.on('error', () => {
    // Suppress noisy BullMQ reconnection errors
  })

  console.log('🔍 Auction scanner worker started (every 30s)')
  return worker
}
