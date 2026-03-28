/**
 * Valkey / Redis connection config for BullMQ.
 *
 * Supports two modes:
 *  - **ElastiCache Serverless (Valkey)**: TLS connection — set REDIS_TLS=true
 *  - **Local development**: Plain connection — REDIS_TLS=false (default)
 *
 * ElastiCache Serverless enforces Redis Cluster slot restrictions internally.
 * We use prefix `{bull}` (with hash-tag braces) so every BullMQ key hashes to
 * the same slot, preventing CROSSSLOT errors in Lua scripts.
 *
 * BullMQ requirements (maxRetriesPerRequest: null, enableReadyCheck: false)
 * are applied in both modes.
 */
import Redis from 'ioredis'
import { env } from './env.js'

function createConnection(): Redis {
  return new Redis({
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    username: env.REDIS_USERNAME || undefined,
    password: env.REDIS_PASSWORD || undefined,
    tls: env.REDIS_TLS ? {} : undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  })
}

console.log(`🔴 Valkey config: ${env.REDIS_HOST}:${env.REDIS_PORT} (TLS: ${env.REDIS_TLS})`)

/** Shared connection for BullMQ queues & workers */
export const redisConnection = createConnection()

/** Spread into BullMQ Queue / Worker constructors */
export const bullConnection = {
  connection: redisConnection as any,
  prefix: '{bull}',
}
