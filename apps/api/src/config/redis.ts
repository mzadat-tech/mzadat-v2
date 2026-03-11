/**
 * Redis connection config for BullMQ.
 *
 * Uses plain host/port config so BullMQ creates its own IORedis
 * instance — avoids version-mismatch issues with ioredis.
 *
 * Default: redis://localhost:6380 (port 6380 to avoid clashes).
 */
import { env } from './env.js'

function parseRedisUrl(url: string) {
  const parsed = new URL(url)
  return {
    host: parsed.hostname || 'localhost',
    port: parseInt(parsed.port, 10) || 6379,
    password: parsed.password || undefined,
    username: parsed.username || undefined,
    db: parsed.pathname ? parseInt(parsed.pathname.slice(1), 10) || 0 : 0,
  }
}

const redisConfig = parseRedisUrl(env.REDIS_URL)

/** Shared connection options for BullMQ queues & workers */
export const bullConnection = {
  connection: {
    ...redisConfig,
    maxRetriesPerRequest: null, // required by BullMQ
    enableReadyCheck: false,
  },
}

console.log(`🔴 Redis config: ${redisConfig.host}:${redisConfig.port}`)
