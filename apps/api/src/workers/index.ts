/**
 * Worker orchestrator — starts all BullMQ workers.
 *
 * Gracefully degrades if Redis is unavailable:
 *  - Workers will auto-reconnect when Redis comes back
 *  - The API server continues to function without Redis
 */
import { startAuctionLifecycleWorker } from './auction-lifecycle.worker.js'
import { startWinnerProcessingWorker } from './winner-processing.worker.js'
import { startAuctionScannerWorker } from './auction-scanner.worker.js'
import { startEmailWorker } from './email.worker.js'

export async function startAllWorkers() {
  console.log('🚀 Starting BullMQ workers...')

  try {
    const lifecycleWorker = startAuctionLifecycleWorker()
    const winnerWorker = startWinnerProcessingWorker()
    const scannerWorker = await startAuctionScannerWorker()
    const emailWorker = startEmailWorker()

    console.log('✅ All BullMQ workers running')
    return { lifecycleWorker, winnerWorker, scannerWorker, emailWorker }
  } catch (err) {
    console.warn('⚠️  BullMQ workers failed to start (Redis may be unavailable):', (err as Error).message)
    console.warn('⚠️  Auction automation is DISABLED. Start Redis and restart the API.')
    return null
  }
}
