/**
 * Winner Processing Worker
 *
 * Processes the winner for ended auctions.
 * Triggered by the lifecycle worker when an auction closes.
 */
import { Worker, type Job } from 'bullmq'
import { bullConnection } from '../config/redis.js'
import { QUEUE_NAMES, type ProcessWinnerJob } from '../queues/index.js'
import { winnerService } from '../services/winner.service.js'

export function startWinnerProcessingWorker() {
  const worker = new Worker<ProcessWinnerJob>(
    QUEUE_NAMES.WINNER_PROCESSING,
    async (job: Job<ProcessWinnerJob>) => {
      const { productId } = job.data
      console.log(`🏆 Processing winner for: ${productId}`)
      const result = await winnerService.processWinner(productId)
      console.log(`🏆 Result: ${JSON.stringify(result)}`)
      return result
    },
    {
      ...bullConnection,
      concurrency: 3,
    },
  )

  worker.on('completed', (job, result) => {
    console.log(`✅ Winner job completed: ${job.id}`, result)
  })

  worker.on('failed', (job, err) => {
    console.error(`❌ Winner job failed: ${job?.id}`, err.message)
  })

  worker.on('error', (err) => {
    // Suppress noisy reconnection errors
  })

  console.log('🏗️  Winner processing worker started')
  return worker
}
