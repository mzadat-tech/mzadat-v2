/**
 * Lightweight pg Pool for read queries.
 *
 * Uses DIRECT_URL or DATABASE_URL to connect via Supabase's connection
 * pooler (Supavisor). The pooler hostname has IPv4 records, so no
 * special DNS workarounds are needed.
 *
 * Prisma is still used for migrations, mutations, and the Prisma
 * query engine. All read paths should use `pool.query()` instead.
 */
import pg from 'pg'

// Prefer DATABASE_URL (pooled, port 6543) for runtime queries.
// Strip pgbouncer param — only Prisma needs it; raw pg.Pool works without it.
const raw = process.env.DATABASE_URL || process.env.DIRECT_URL
const connectionString = raw?.replace(/[?&]pgbouncer=true/, '')

if (!connectionString) {
  throw new Error('Neither DATABASE_URL nor DIRECT_URL is set')
}

export const pool = new pg.Pool({
  connectionString,
  max: 10,                    // Max simultaneous connections
  idleTimeoutMillis: 30_000,  // Close idle connections after 30s
  connectionTimeoutMillis: 5_000, // Fail fast if can't connect in 5s
  // SSL — Supabase requires it
  ssl: { rejectUnauthorized: false },
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
