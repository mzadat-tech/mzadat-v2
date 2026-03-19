/**
 * Backfill: Refund stuck auction registration deposits
 *
 * Finds all auction registrations that are still 'active' (deposit on hold)
 * for groups that have already closed, where the user is NOT the winner.
 *
 * Safe to run multiple times — idempotency is enforced via FOR UPDATE
 * and the status check on each registration.
 *
 * Usage:
 *   npx tsx scripts/backfill-deposit-refunds.ts
 *
 * Dry-run (no DB writes):
 *   DRY_RUN=true npx tsx scripts/backfill-deposit-refunds.ts
 */
import 'dotenv/config'
import pg from 'pg'

const DRY_RUN = process.env.DRY_RUN === 'true'

function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY
  if (!key || key.length < 32) throw new Error('ENCRYPTION_KEY must be at least 32 characters')
  return key
}

async function nextWalletTxRef(client: pg.PoolClient): Promise<string> {
  const result = await client.query(`SELECT nextval('wallet_tx_ref_seq')`)
  const year = new Date().getFullYear()
  const seq = parseInt(result.rows[0].nextval, 10)
  return `WTX-${year}-${String(seq).padStart(6, '0')}`
}

async function main() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL
  if (!connectionString) throw new Error('Neither DIRECT_URL nor DATABASE_URL is set')

  const pool = new pg.Pool({
    connectionString,
    max: 5,
    ssl: { rejectUnauthorized: false },
  })

  console.log(`\n💰 Backfill: Refund stuck auction deposits`)
  console.log(`   Mode: ${DRY_RUN ? '🟡 DRY RUN (no writes)' : '🔴 LIVE'}\n`)

  // Find all stuck registrations:
  //   - group is closed
  //   - registration is still 'active'
  //   - user paid (not VIP free, has wallet_tx_id)
  //   - user is NOT the winner of any product in that group
  const stuck = await pool.query<{
    id: string
    order_number: string
    user_id: string
    group_id: string
    group_name: string
    total_amount: string
    wallet_tx_id: string
  }>(`
    SELECT
      ar.id,
      ar.order_number,
      ar.user_id,
      ar.group_id,
      g.name::text AS group_name,
      ar.total_amount::text,
      ar.wallet_tx_id
    FROM auction_registrations ar
    JOIN groups g ON g.id = ar.group_id
    WHERE ar.status = 'active'
      AND ar.is_vip_free = false
      AND ar.wallet_tx_id IS NOT NULL
      AND g.status = 'closed'
      -- Not the winner: no 'win' order exists for a product in their group
      AND NOT EXISTS (
        SELECT 1 FROM orders o
        JOIN products p ON p.id = o.product_id
        WHERE o.user_id = ar.user_id
          AND p.group_id = ar.group_id
          AND o.type = 'bid'
          AND o.status = 'win'
      )
    ORDER BY g.name, ar.created_at
  `)

  if (stuck.rows.length === 0) {
    console.log('✅ No stuck deposits found — nothing to do.\n')
    await pool.end()
    return
  }

  console.log(`Found ${stuck.rows.length} stuck deposit(s):\n`)
  console.log(
    stuck.rows
      .map((r) => `  • [${r.order_number}] User=${r.user_id} Group="${r.group_name}" Amount=${r.total_amount} OMR`)
      .join('\n'),
  )
  console.log()

  if (DRY_RUN) {
    console.log('🟡 Dry run — no changes made.\n')
    await pool.end()
    return
  }

  const encKey = getEncryptionKey()
  let refunded = 0
  let skipped = 0
  let failed = 0

  for (const reg of stuck.rows) {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // Re-check under lock (idempotency)
      const check = await client.query(
        `SELECT status FROM auction_registrations WHERE id = $1 FOR UPDATE`,
        [reg.id],
      )
      
      if (check.rows[0]?.status !== 'active') {
        await client.query('ROLLBACK')
        console.log(`  ⏭️  Skip [${reg.order_number}] — already ${check.rows[0]?.status}`)
        skipped++
        continue
      }

      const amount = parseFloat(reg.total_amount)
      const txRef = await nextWalletTxRef(client)

      // 1. Release wallet transaction
      await client.query(
        `INSERT INTO wallet_transactions (
           reference_number, user_id, type, status, amount, total_amount,
           payment_method, currency, description, amount_encrypted
         ) VALUES (
           $1, $2, 'release'::"WalletTxType", 'completed'::"WalletTxStatus", $3::numeric, $3::numeric,
           'wallet', 'OMR', $4,
           pgp_sym_encrypt($3::text, $5)
         )`,
        [txRef, reg.user_id, amount, 'Backfill: auction deposit refund — non-winner release', encKey],
      )

      // 2. Credit wallet balance
      await client.query(
        `UPDATE profiles
         SET wallet_balance = wallet_balance + $1,
             wallet_balance_encrypted = pgp_sym_encrypt((wallet_balance + $1)::text, $3),
             updated_at = NOW()
         WHERE id = $2`,
        [amount, reg.user_id, encKey],
      )

      // 3. Mark registration as refunded
      await client.query(
        `UPDATE auction_registrations SET status = 'refunded', updated_at = NOW() WHERE id = $1`,
        [reg.id],
      )

      // 4. Audit log
      await client.query(
        `INSERT INTO audit_log (user_id, action, entity_type, entity_id, new_values)
         VALUES ($1, 'refund', 'auction_registration', $2, $3)`,
        [
          reg.user_id,
          reg.id,
          JSON.stringify({ amount, txRef, reason: 'backfill_non_winner_deposit' }),
        ],
      )

      await client.query('COMMIT')
      console.log(`  💸 Refunded [${reg.order_number}] ${amount} OMR → User=${reg.user_id} (${txRef})`)
      refunded++
    } catch (err) {
      await client.query('ROLLBACK')
      console.error(`  ❌ Failed [${reg.order_number}]:`, (err as Error).message)
      failed++
    } finally {
      client.release()
    }
  }

  console.log(`\n─────────────────────────────────────`)
  console.log(`  ✅ Refunded : ${refunded}`)
  console.log(`  ⏭️  Skipped  : ${skipped}`)
  console.log(`  ❌ Failed   : ${failed}`)
  console.log(`─────────────────────────────────────\n`)

  await pool.end()
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
