/**
 * Lightweight pg Pool for read queries.
 *
 * Uses DIRECT_URL (port 5432) for lower latency — PgBouncer adds an
 * extra hop that hurts when you're already paying 40ms+ network RTT.
 * Falls back to DATABASE_URL if DIRECT_URL isn't set.
 *
 * Prisma is still used for migrations, mutations, and the Prisma
 * query engine. All read paths should use `pool.query()` instead.
 */
import pg from 'pg'
import { resolve4 } from 'dns/promises'

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('Neither DIRECT_URL nor DATABASE_URL is set')
}

// Resolve the Supabase hostname to an IPv4 address explicitly.
// EC2 instances without IPv6 connectivity get ENETUNREACH when pg
// tries to connect to the AAAA (IPv6) record that DNS returns first.
const url = new URL(connectionString)
const originalHost = url.hostname
let poolConnectionString = connectionString

try {
  const [ipv4] = await resolve4(originalHost)
  if (ipv4) {
    url.hostname = ipv4
    poolConnectionString = url.toString()
    console.log(`🌐 Resolved ${originalHost} → ${ipv4} (IPv4)`)
  }
} catch {
  // DNS resolution failed — fall through to original connection string
}

export const pool = new pg.Pool({
  connectionString: poolConnectionString,
  max: 10,                    // Max simultaneous connections
  idleTimeoutMillis: 30_000,  // Close idle connections after 30s
  connectionTimeoutMillis: 5_000, // Fail fast if can't connect in 5s
  // SSL — Supabase requires it; servername needed for SNI when connecting via IP
  ssl: { rejectUnauthorized: false, servername: originalHost },
})

// Log pool errors (don't crash the process)
pool.on('error', (err) => {
  console.error('🔴 pg pool error:', err.message)
})

/**
 * Helper for parameterised queries with typed results.
 *
 * Usage:
 *   const rows = await sql<{ id: string; name: string }>`
 *     SELECT id, name FROM products WHERE status = ${'published'}
 *   `
 */
export async function query<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  const result = await pool.query<T>(text, params)
  return result.rows
}

/** Get a single row or null */
export async function queryOne<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params?: unknown[],
): Promise<T | null> {
  const rows = await query<T>(text, params)
  return rows[0] ?? null
}

/** Warm up the pool — call on server startup */
export async function warmPool(): Promise<void> {
  const t0 = performance.now()
  const [{ now }] = await query<{ now: Date }>('SELECT NOW() as now')
  const t1 = performance.now()
  console.log(`🟢 pg pool warmed in ${(t1 - t0).toFixed(0)}ms (DB time: ${now.toISOString()})`)
}
