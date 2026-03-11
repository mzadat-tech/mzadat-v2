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
 */
import { Worker, type Job } from 'bullmq'
import { prisma } from '@mzadat/db'
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
import { winnerProcessingQueue } from '../queues/index.js'

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

      // ── 1. Find auctions that should have STARTED ──────────
      const shouldStart = await prisma.product.findMany({
        where: {
          saleType: 'auction',
          status: 'pending',
          startDate: { lte: now },
          deletedAt: null,
        },
        select: { id: true },
      })

      for (const p of shouldStart) {
        await activateAuction(p.id)
      }

      // ── 2. Find auctions that should have ENDED ────────────
      const shouldEnd = await prisma.product.findMany({
        where: {
          saleType: 'auction',
          status: 'published',
          endDate: { lt: now },
          deletedAt: null,
        },
        select: { id: true },
      })

      for (const p of shouldEnd) {
        await closeAuction(p.id)
      }

      // ── 3. Find groups that should have STARTED ────────────
      const groupsShouldStart = await prisma.group.findMany({
        where: {
          status: 'upcoming',
          startDate: { lte: now },
        },
        select: { id: true },
      })

      for (const g of groupsShouldStart) {
        await activateGroup(g.id)
      }

      // ── 4. Find groups that should have ENDED ──────────────
      const groupsShouldEnd = await prisma.group.findMany({
        where: {
          status: 'active',
          endDate: { lt: now },
        },
        select: { id: true },
      })

      for (const g of groupsShouldEnd) {
        await closeGroup(g.id)
      }

      // ── 5. Schedule future auction jobs that aren't in the queue ──
      const futureAuctions = await prisma.product.findMany({
        where: {
          saleType: 'auction',
          status: { in: ['pending', 'published'] },
          startDate: { gt: now },
          deletedAt: null,
        },
        select: { id: true, startDate: true, endDate: true },
        take: 200,
      })

      for (const p of futureAuctions) {
        await scheduleAuctionJobs(p)
      }

      const futureGroups = await prisma.group.findMany({
        where: {
          status: 'upcoming',
          startDate: { gt: now },
        },
        select: { id: true, startDate: true, endDate: true },
        take: 100,
      })

      for (const g of futureGroups) {
        await scheduleGroupJobs(g)
      }

      if (shouldStart.length || shouldEnd.length || groupsShouldStart.length || groupsShouldEnd.length) {
        console.log(
          `🔍 Scanner: started=${shouldStart.length}, ended=${shouldEnd.length}, ` +
            `groups-started=${groupsShouldStart.length}, groups-ended=${groupsShouldEnd.length}`,
        )
      }
    },
    {
      ...bullConnection,
      concurrency: 1,
    },
  )

  worker.on('failed', (job, err) => {
    console.error(`❌ Scanner job failed:`, err.message)
  })

  worker.on('error', (err) => {
    // Suppress noisy reconnection errors
  })

  console.log('🔍 Auction scanner worker started (every 30s)')
  return worker
}
