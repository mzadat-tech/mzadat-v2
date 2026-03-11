/**
 * Auction Lifecycle Worker
 *
 * Processes delayed jobs:
 *  - start-auction: Activates a product at its startDate
 *  - end-auction: Closes a product at its endDate, triggers winner processing
 *  - start-group: Sets group status to 'active'
 *  - end-group: Sets group status to 'closed' (if all lots done)
 */
import { Worker, type Job } from 'bullmq'
import { bullConnection } from '../config/redis.js'
import { QUEUE_NAMES } from '../queues/index.js'
import type {
  StartAuctionJob,
  EndAuctionJob,
  StartGroupJob,
  EndGroupJob,
  AuctionLifecycleJobName,
} from '../queues/index.js'
import {
  activateAuction,
  closeAuction,
  activateGroup,
  closeGroup,
} from '../services/auction.service.js'

export function startAuctionLifecycleWorker() {
  const worker = new Worker<StartAuctionJob | EndAuctionJob | StartGroupJob | EndGroupJob>(
    QUEUE_NAMES.AUCTION_LIFECYCLE,
    async (job: Job) => {
      const jobName = job.name as AuctionLifecycleJobName

      switch (jobName) {
        case 'start-auction': {
          const { productId } = job.data as StartAuctionJob
          console.log(`▶️  Starting auction: ${productId}`)
          await activateAuction(productId)
          break
        }

        case 'end-auction': {
          const { productId } = job.data as EndAuctionJob
          console.log(`⏹️  Ending auction: ${productId}`)
          await closeAuction(productId)
          break
        }

        case 'start-group': {
          const { groupId } = job.data as StartGroupJob
          console.log(`▶️  Starting group: ${groupId}`)
          await activateGroup(groupId)
          break
        }

        case 'end-group': {
          const { groupId } = job.data as EndGroupJob
          console.log(`⏹️  Ending group: ${groupId}`)
          await closeGroup(groupId)
          break
        }
      }
    },
    {
      ...bullConnection,
      concurrency: 5,
    },
  )

  worker.on('completed', (job) => {
    console.log(`✅ Lifecycle job completed: ${job.name} [${job.id}]`)
  })

  worker.on('failed', (job, err) => {
    console.error(`❌ Lifecycle job failed: ${job?.name} [${job?.id}]`, err.message)
  })

  worker.on('error', (err) => {
    // Suppress noisy reconnection errors
  })

  console.log('🏗️  Auction lifecycle worker started')
  return worker
}
