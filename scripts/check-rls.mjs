import pg from 'pg'
const { Pool } = pg

const connStr = process.env.DIRECT_URL || process.env.DATABASE_URL
const pool = new Pool({
  connectionString: connStr,
  ssl: connStr?.includes('localhost') ? false : { rejectUnauthorized: false },
})

const rls = await pool.query(`
  SELECT tablename, rowsecurity
  FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY tablename
`)
console.log('=== TABLES WITH RLS STATUS ===')
rls.rows.forEach(r => console.log(`  ${r.rowsecurity ? '🔒' : '🔓'} ${r.tablename}`))

const policies = await pool.query(`
  SELECT tablename, policyname
  FROM pg_policies
  WHERE schemaname = 'public'
  ORDER BY tablename, policyname
`)
console.log('\n=== EXISTING POLICIES ===')
policies.rows.forEach(r => console.log(`  ✅ ${r.tablename} → ${r.policyname}`))

const missing = await pool.query(`
  SELECT t.tablename
  FROM pg_tables t
  LEFT JOIN pg_policies p ON p.tablename = t.tablename AND p.schemaname = t.schemaname
  WHERE t.schemaname = 'public'
    AND t.rowsecurity = true
    AND p.policyname IS NULL
  ORDER BY t.tablename
`)
console.log('\n=== ⚠️  RLS ENABLED BUT NO POLICIES ===')
if (missing.rows.length === 0) {
  console.log('  None — all tables with RLS have policies!')
} else {
  missing.rows.forEach(r => console.log(`  ❌ ${r.tablename}`))
}

await pool.end()
