import http from 'http'
import { app } from './app.js'
import { env } from './config/env.js'
import { setupWebSocket } from './websocket/server.js'
import { startAllWorkers } from './workers/index.js'
import { warmPool } from '@mzadat/db'

const port = env.API_PORT

// Create HTTP server (needed for ws upgrade)
const server = http.createServer(app)

// Attach WebSocket
setupWebSocket(server)

// Start BullMQ workers
startAllWorkers().catch((err) => {
  console.error('❌ Failed to start workers:', err)
})

server.listen(port, async () => {
  console.log(`⚡ Mzadat API running on http://localhost:${port}`)
  console.log(`📋 Health check: http://localhost:${port}/health`)
  console.log(`📄 API Docs: http://localhost:${port}/docs`)
  console.log(`🔌 WebSocket: ws://localhost:${port}/ws`)
  console.log(`🌍 Environment: ${env.NODE_ENV}`)
  console.log(`🕐 Timezone: ${env.TZ}`)

  // Warm up the pg pool so the first request doesn't pay connection cost
  await warmPool().catch((err) => console.error('⚠️ Pool warm failed:', err.message))
})
