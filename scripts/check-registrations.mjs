import pg from 'pg'
import { config } from 'dotenv'
config()

const userId = 'b36518a5-7696-4b10-ae2e-58e7395aaa13'
const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL, ssl: { rejectUnauthorized: false } })
try {
  // Run the exact same query as listByUser
  const r = await pool.query(`SELECT
    ar.id, ar.order_number AS "orderNumber",
    ar.group_id AS "groupId",
    ar.deposit_amount::text AS "depositAmount",
    ar.status,
    ar.created_at AS "createdAt",
    g.name AS "groupName",
    g.status AS "groupStatus"
   FROM auction_registrations ar
   JOIN groups g ON g.id = ar.group_id
   WHERE ar.user_id = $1
   ORDER BY ar.created_at DESC
   LIMIT 20 OFFSET 0`, [userId])
  console.log('Results:', r.rows.length)
  console.log(JSON.stringify(r.rows, null, 2))
} catch(e) { console.error('Error:', e.message) }
pool.end()
