/**
 * Wallet Service
 *
 * All wallet operations use raw pg for maximum performance.
 * Sensitive amounts are encrypted at rest with pgcrypto for tamper detection.
 * Every transaction gets a unique reference number (WTX-YYYY-NNNNNN).
 *
 * Transaction types (auction-house patterns):
 *   deposit   — user adds funds (bank transfer / gateway)
 *   withdraw  — user withdraws funds
 *   bid       — deposit held when placing a bid
 *   hold      — generic hold (e.g. auction deposit)
 *   release   — release a hold back to available balance
 *   purchase  — final purchase debit
 *   bid_final_payment — remaining balance after bid win
 *   return    — refund of a hold/bid
 *   refund    — general refund
 *   commission — platform fee
 *   admin_adjustment — manual admin credit/debit
 *   fee       — platform processing fee
 */

import { pool, query, queryOne } from '@mzadat/db'
import { generateWalletTxRef } from '../utils/custom-id.js'
import { signUrl } from '../utils/storage.js'

// ── Constants ────────────────────────────────────────────
const DEPOSIT_PRESETS = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000] as const
const MIN_DEPOSIT = 10
const MAX_DEPOSIT = 5000
const CURRENCY = 'OMR'

// ── Type helpers ─────────────────────────────────────────

export interface WalletBalance {
  balance: string
  currency: string
  isVip: boolean
}

export interface WalletTxRow {
  [key: string]: unknown
  id: string
  referenceNumber: string
  userId: string
  orderId: string | null
  productId: string | null
  type: string
  status: string
  amount: string
  adminCommission: string
  merchantAmount: string
  taxAmount: string
  totalAmount: string
  paymentMethod: string | null
  transactionId: string | null
  currency: string
  proofDocument: string | null
  description: string | null
  createdAt: Date
  updatedAt: Date
}

export interface DepositInput {
  userId: string
  amount: number
  paymentMethod: 'bank_transfer' | string
  proofDocument?: string
  bankName?: string
  referenceNumber?: string
  description?: string
  /** If true, auto-approve (payment gateway) */
  autoApprove?: boolean
}

export interface TransactionListParams {
  userId: string
  type?: string
  status?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// ── Encryption key ───────────────────────────────────────

function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY
  if (!key || key.length < 32) {
    throw new Error('ENCRYPTION_KEY must be at least 32 characters')
  }
  return key
}

// ── Service ──────────────────────────────────────────────

export const walletService = {
  // ── Presets info ─────────────────────────────────────
  getDepositPresets() {
    return {
      presets: DEPOSIT_PRESETS,
      min: MIN_DEPOSIT,
      max: MAX_DEPOSIT,
      currency: CURRENCY,
      step: MIN_DEPOSIT,
    }
  },

  // ── Get balance ──────────────────────────────────────
  async getBalance(userId: string): Promise<WalletBalance> {
    const row = await queryOne<{ wallet_balance: string; is_vip: boolean }>(
      `SELECT wallet_balance, is_vip FROM profiles WHERE id = $1`,
      [userId],
    )
    if (!row) throw new Error('Profile not found')
    return {
      balance: row.wallet_balance,
      currency: CURRENCY,
      isVip: row.is_vip,
    }
  },

  // ── Generate next reference number ───────────────────
  async nextRefNumber(): Promise<string> {
    const [{ nextval }] = await query<{ nextval: string }>(
      `SELECT nextval('wallet_tx_ref_seq')`,
    )
    const year = new Date().getFullYear()
    return generateWalletTxRef(year, parseInt(nextval, 10))
  },

  // ── Deposit funds ────────────────────────────────────
  async deposit(input: DepositInput): Promise<WalletTxRow> {
    const { userId, amount, paymentMethod, proofDocument, bankName, referenceNumber: bankRef, description, autoApprove } = input

    if (amount < MIN_DEPOSIT || amount > MAX_DEPOSIT) {
      throw new Error(`Deposit amount must be between ${MIN_DEPOSIT} and ${MAX_DEPOSIT} ${CURRENCY}`)
    }

    const encKey = getEncryptionKey()
    const refNumber = await this.nextRefNumber()
    const status = autoApprove ? 'completed' : 'pending'

    // Use a transaction to ensure atomicity
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // 1. Insert wallet transaction with encrypted amount
      const txResult = await client.query<WalletTxRow>(
        `INSERT INTO wallet_transactions (
          reference_number, user_id, type, status, amount, total_amount,
          payment_method, currency, proof_document, description,
          amount_encrypted
        ) VALUES (
          $1, $2, 'deposit', $3::"WalletTxStatus", $4::numeric, $4::numeric,
          $5, $6, $7, $8,
          pgp_sym_encrypt($4::text, $9)
        )
        RETURNING
          id, reference_number AS "referenceNumber", user_id AS "userId",
          type, status, amount::text, total_amount::text AS "totalAmount",
          payment_method AS "paymentMethod", currency,
          proof_document AS "proofDocument", description,
          created_at AS "createdAt", updated_at AS "updatedAt"`,
        [refNumber, userId, status, amount, paymentMethod, CURRENCY, proofDocument || null, description || null, encKey],
      )

      const walletTx = txResult.rows[0]

      // 2. If bank transfer, also insert into bank_deposits for admin review
      if (paymentMethod === 'bank_transfer' && proofDocument) {
        await client.query(
          `INSERT INTO bank_deposits (
            user_id, wallet_tx_id, amount, proof_document, bank_name, reference_number, status,
            amount_encrypted
          ) VALUES ($1, $2, $3::numeric, $4, $5, $6, $7::"WalletTxStatus",
            pgp_sym_encrypt($3::text, $8)
          )`,
          [userId, walletTx.id, amount, proofDocument, bankName || null, bankRef || null, status, encKey],
        )
      }

      // 3. If auto-approved (gateway), credit wallet immediately
      if (autoApprove) {
        await client.query(
          `UPDATE profiles
           SET wallet_balance = wallet_balance + $1,
               wallet_balance_encrypted = pgp_sym_encrypt((wallet_balance + $1)::text, $3),
               updated_at = NOW()
           WHERE id = $2`,
          [amount, userId, encKey],
        )
      }

      // 4. Audit log
      await client.query(
        `INSERT INTO audit_log (user_id, action, entity_type, entity_id, new_values)
         VALUES ($1, 'create', 'wallet_transaction', $2, $3)`,
        [userId, walletTx.id, JSON.stringify({ type: 'deposit', amount, status, paymentMethod, referenceNumber: refNumber })],
      )

      await client.query('COMMIT')
      return walletTx
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  },

  // ── List transactions ────────────────────────────────
  async listTransactions(params: TransactionListParams): Promise<{
    data: WalletTxRow[]
    total: number
    page: number
    pageSize: number
    totalPages: number
  }> {
    const {
      userId,
      type,
      status,
      dateFrom,
      dateTo,
      page = 1,
      pageSize = 20,
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = params

    // Build dynamic WHERE
    const conditions: string[] = ['wt.user_id = $1']
    const values: unknown[] = [userId]
    let idx = 2

    if (type) {
      conditions.push(`wt.type = $${idx++}::\"WalletTxType\"`)
      values.push(type)
    }
    if (status) {
      conditions.push(`wt.status = $${idx++}::\"WalletTxStatus\"`)
      values.push(status)
    }
    if (dateFrom) {
      conditions.push(`wt.created_at >= $${idx++}::timestamptz`)
      values.push(dateFrom)
    }
    if (dateTo) {
      conditions.push(`wt.created_at <= $${idx++}::timestamptz`)
      values.push(dateTo)
    }

    const where = conditions.join(' AND ')

    // Whitelist sort columns
    const allowedSorts: Record<string, string> = {
      created_at: 'wt.created_at',
      amount: 'wt.amount',
      type: 'wt.type',
      status: 'wt.status',
    }
    const sortCol = allowedSorts[sortBy] || 'wt.created_at'
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC'

    const offset = (Math.max(1, page) - 1) * pageSize

    // Count + data in parallel
    const [countResult, dataResult] = await Promise.all([
      query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM wallet_transactions wt WHERE ${where}`, values),
      query<WalletTxRow>(
        `SELECT
          wt.id,
          wt.reference_number AS "referenceNumber",
          wt.user_id AS "userId",
          wt.order_id AS "orderId",
          wt.product_id AS "productId",
          wt.type,
          wt.status,
          wt.amount::text,
          wt.admin_commission::text AS "adminCommission",
          wt.merchant_amount::text AS "merchantAmount",
          wt.tax_amount::text AS "taxAmount",
          wt.total_amount::text AS "totalAmount",
          wt.payment_method AS "paymentMethod",
          wt.transaction_id AS "transactionId",
          wt.currency,
          wt.proof_document AS "proofDocument",
          wt.description,
          wt.created_at AS "createdAt",
          wt.updated_at AS "updatedAt"
        FROM wallet_transactions wt
        WHERE ${where}
        ORDER BY ${sortCol} ${order}
        LIMIT $${idx++} OFFSET $${idx++}`,
        [...values, pageSize, offset],
      ),
    ])

    const total = parseInt(countResult[0]?.count || '0', 10)

    // Sign proof document URLs
    for (const tx of dataResult) {
      if (tx.proofDocument) {
        tx.proofDocument = (await signUrl(tx.proofDocument)) || tx.proofDocument
      }
    }

    return {
      data: dataResult,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  },

  // ── Get single transaction ───────────────────────────
  async getTransaction(userId: string, txId: string): Promise<WalletTxRow | null> {
    const row = await queryOne<WalletTxRow>(
      `SELECT
        wt.id,
        wt.reference_number AS "referenceNumber",
        wt.user_id AS "userId",
        wt.order_id AS "orderId",
        wt.product_id AS "productId",
        wt.type,
        wt.status,
        wt.amount::text,
        wt.admin_commission::text AS "adminCommission",
        wt.merchant_amount::text AS "merchantAmount",
        wt.tax_amount::text AS "taxAmount",
        wt.total_amount::text AS "totalAmount",
        wt.payment_method AS "paymentMethod",
        wt.transaction_id AS "transactionId",
        wt.currency,
        wt.proof_document AS "proofDocument",
        wt.description,
        wt.created_at AS "createdAt",
        wt.updated_at AS "updatedAt"
      FROM wallet_transactions wt
      WHERE wt.id = $1 AND wt.user_id = $2`,
      [txId, userId],
    )

    if (row?.proofDocument) {
      row.proofDocument = (await signUrl(row.proofDocument)) || row.proofDocument
    }
    return row
  },

  // ── Verify transaction integrity ─────────────────────
  async verifyIntegrity(txId: string): Promise<boolean> {
    const encKey = getEncryptionKey()
    const row = await queryOne<{ amount: string; decrypted: string }>(
      `SELECT amount::text,
              pgp_sym_decrypt(amount_encrypted, $2) AS decrypted
       FROM wallet_transactions WHERE id = $1 AND amount_encrypted IS NOT NULL`,
      [txId, encKey],
    )
    if (!row) return true // No encrypted amount → skip check
    return row.amount === row.decrypted
  },

  // ── Export transactions (CSV data) ───────────────────
  async exportTransactions(params: TransactionListParams): Promise<string> {
    // Reuse list but with large page size
    const result = await this.listTransactions({ ...params, page: 1, pageSize: 10000 })

    const header = 'Reference,Date,Type,Status,Amount,Currency,Payment Method,Description\n'
    const rows = result.data.map((tx) => {
      const date = new Date(tx.createdAt).toISOString()
      const desc = (tx.description || '').replace(/"/g, '""')
      return `"${tx.referenceNumber}","${date}","${tx.type}","${tx.status}","${tx.amount}","${tx.currency || CURRENCY}","${tx.paymentMethod || ''}","${desc}"`
    })

    return header + rows.join('\n')
  },

  // ── Import transactions (admin bulk) ─────────────────
  async importTransactions(
    adminId: string,
    records: Array<{
      userId: string
      type: string
      amount: number
      description?: string
    }>,
  ): Promise<{ imported: number; errors: string[] }> {
    const encKey = getEncryptionKey()
    const errors: string[] = []
    let imported = 0

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      for (let i = 0; i < records.length; i++) {
        const rec = records[i]
        try {
          if (!rec.userId || !rec.type || !rec.amount || rec.amount <= 0) {
            errors.push(`Row ${i + 1}: missing required fields or invalid amount`)
            continue
          }

          const refNumber = await this.nextRefNumber()
          const isCredit = ['deposit', 'return', 'refund', 'release', 'admin_adjustment'].includes(rec.type)

          // Insert transaction
          await client.query(
            `INSERT INTO wallet_transactions (
              reference_number, user_id, type, status, amount, total_amount,
              payment_method, currency, description, amount_encrypted
            ) VALUES (
              $1, $2, $3::"WalletTxType", 'completed'::"WalletTxStatus", $4::numeric, $4::numeric,
              'admin_import', $5, $6,
              pgp_sym_encrypt($4::text, $7)
            )`,
            [refNumber, rec.userId, rec.type, rec.amount, CURRENCY, rec.description || `Admin import by ${adminId}`, encKey],
          )

          // Update wallet balance (with encrypted copy)
          if (isCredit) {
            await client.query(
              `UPDATE profiles
               SET wallet_balance = wallet_balance + $1,
                   wallet_balance_encrypted = pgp_sym_encrypt((wallet_balance + $1)::text, $3),
                   updated_at = NOW()
               WHERE id = $2`,
              [rec.amount, rec.userId, encKey],
            )
          } else {
            await client.query(
              `UPDATE profiles
               SET wallet_balance = wallet_balance - $1,
                   wallet_balance_encrypted = pgp_sym_encrypt((wallet_balance - $1)::text, $3),
                   updated_at = NOW()
               WHERE id = $2`,
              [rec.amount, rec.userId, encKey],
            )
          }

          imported++
        } catch (err: any) {
          errors.push(`Row ${i + 1}: ${err.message}`)
        }
      }

      // Audit log for the import batch
      await client.query(
        `INSERT INTO audit_log (user_id, action, entity_type, new_values)
         VALUES ($1, 'import', 'wallet_transaction', $2)`,
        [adminId, JSON.stringify({ imported, errors: errors.length, totalRecords: records.length })],
      )

      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }

    return { imported, errors }
  },

  // ── Admin: List pending deposits ─────────────────────
  async listPendingDeposits(params: {
    status?: string
    page?: number
    pageSize?: number
  }): Promise<{
    data: any[]
    total: number
    page: number
    pageSize: number
    totalPages: number
  }> {
    const { status = 'pending', page = 1, pageSize = 20 } = params
    const offset = (Math.max(1, page) - 1) * pageSize

    const conditions: string[] = []
    const values: unknown[] = []
    let idx = 1

    if (status !== 'all') {
      conditions.push(`bd.status = $${idx++}::\"WalletTxStatus\"`)
      values.push(status)
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const [countResult, dataResult] = await Promise.all([
      query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM bank_deposits bd ${where}`, values),
      query<any>(
        `SELECT
          bd.id,
          bd.user_id AS "userId",
          bd.wallet_tx_id AS "walletTxId",
          bd.amount::text,
          bd.proof_document AS "proofDocument",
          bd.bank_name AS "bankName",
          bd.reference_number AS "referenceNumber",
          bd.status,
          bd.admin_notes AS "adminNotes",
          bd.reviewed_by AS "reviewedBy",
          bd.reviewed_at AS "reviewedAt",
          bd.created_at AS "createdAt",
          bd.updated_at AS "updatedAt",
          p.first_name AS "userFirstName",
          p.last_name AS "userLastName",
          p.email AS "userEmail",
          p.custom_id AS "userCustomId",
          p.is_vip AS "userIsVip",
          wt.reference_number AS "txReferenceNumber"
        FROM bank_deposits bd
        JOIN profiles p ON p.id = bd.user_id
        LEFT JOIN wallet_transactions wt ON wt.id = bd.wallet_tx_id
        ${where}
        ORDER BY bd.created_at DESC
        LIMIT $${idx++} OFFSET $${idx++}`,
        [...values, pageSize, offset],
      ),
    ])

    const total = parseInt(countResult[0]?.count || '0', 10)

    // Sign proof documents
    for (const dep of dataResult) {
      if (dep.proofDocument) {
        dep.proofDocument = (await signUrl(dep.proofDocument)) || dep.proofDocument
      }
    }

    return {
      data: dataResult,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  },

  // ── Admin: Approve deposit ───────────────────────────
  async approveDeposit(depositId: string, adminId: string, notes?: string): Promise<void> {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // 1. Get deposit details
      const depResult = await client.query<{ user_id: string; amount: string; wallet_tx_id: string; status: string }>(
        `SELECT user_id, amount::text, wallet_tx_id, status FROM bank_deposits WHERE id = $1 FOR UPDATE`,
        [depositId],
      )
      const deposit = depResult.rows[0]
      if (!deposit) throw new Error('Deposit not found')
      if (deposit.status !== 'pending') throw new Error(`Deposit already ${deposit.status}`)

      const amount = parseFloat(deposit.amount)

      // 2. Update bank_deposit status
      await client.query(
        `UPDATE bank_deposits SET status = 'completed'::\"WalletTxStatus\", admin_notes = $1,
         reviewed_by = $2, reviewed_at = NOW(), updated_at = NOW() WHERE id = $3`,
        [notes || null, adminId, depositId],
      )

      // 3. Update wallet_transaction status
      if (deposit.wallet_tx_id) {
        await client.query(
          `UPDATE wallet_transactions SET status = 'completed'::\"WalletTxStatus\", updated_at = NOW()
           WHERE id = $1`,
          [deposit.wallet_tx_id],
        )
      }

      // 4. Credit wallet balance (with encrypted copy)
      await client.query(
        `UPDATE profiles
         SET wallet_balance = wallet_balance + $1,
             wallet_balance_encrypted = pgp_sym_encrypt((wallet_balance + $1)::text, $3),
             updated_at = NOW()
         WHERE id = $2`,
        [amount, deposit.user_id, getEncryptionKey()],
      )

      // 5. Audit log
      await client.query(
        `INSERT INTO audit_log (user_id, action, entity_type, entity_id, new_values)
         VALUES ($1, 'approve', 'bank_deposit', $2, $3)`,
        [adminId, depositId, JSON.stringify({ amount, userId: deposit.user_id, notes })],
      )

      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  },

  // ── Admin: Reject deposit ────────────────────────────
  async rejectDeposit(depositId: string, adminId: string, notes?: string): Promise<void> {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // 1. Get deposit
      const depResult = await client.query<{ user_id: string; amount: string; wallet_tx_id: string; status: string }>(
        `SELECT user_id, amount::text, wallet_tx_id, status FROM bank_deposits WHERE id = $1 FOR UPDATE`,
        [depositId],
      )
      const deposit = depResult.rows[0]
      if (!deposit) throw new Error('Deposit not found')
      if (deposit.status !== 'pending') throw new Error(`Deposit already ${deposit.status}`)

      // 2. Update bank_deposit status
      await client.query(
        `UPDATE bank_deposits SET status = 'rejected'::\"WalletTxStatus\", admin_notes = $1,
         reviewed_by = $2, reviewed_at = NOW(), updated_at = NOW() WHERE id = $3`,
        [notes || 'Rejected by admin', adminId, depositId],
      )

      // 3. Update wallet_transaction status
      if (deposit.wallet_tx_id) {
        await client.query(
          `UPDATE wallet_transactions SET status = 'rejected'::\"WalletTxStatus\", updated_at = NOW()
           WHERE id = $1`,
          [deposit.wallet_tx_id],
        )
      }

      // 4. Audit log
      await client.query(
        `INSERT INTO audit_log (user_id, action, entity_type, entity_id, new_values)
         VALUES ($1, 'reject', 'bank_deposit', $2, $3)`,
        [adminId, depositId, JSON.stringify({ amount: deposit.amount, userId: deposit.user_id, notes })],
      )

      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  },

  // ── Admin: Manual adjustment ─────────────────────────
  async adminAdjustment(
    adminId: string,
    userId: string,
    amount: number,
    description: string,
    isCredit: boolean,
  ): Promise<WalletTxRow> {
    const encKey = getEncryptionKey()
    const refNumber = await this.nextRefNumber()

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // 1. Check user balance for debits
      if (!isCredit) {
        const balResult = await client.query<{ wallet_balance: string }>(
          `SELECT wallet_balance::text FROM profiles WHERE id = $1 FOR UPDATE`,
          [userId],
        )
        const bal = balResult.rows[0]
        if (!bal) throw new Error('User not found')
        if (parseFloat(bal.wallet_balance) < amount) {
          throw new Error('Insufficient balance for debit adjustment')
        }
      }

      // 2. Insert transaction
      const txResult = await client.query<WalletTxRow>(
        `INSERT INTO wallet_transactions (
          reference_number, user_id, type, status, amount, total_amount,
          payment_method, currency, description, amount_encrypted
        ) VALUES (
          $1, $2, 'admin_adjustment'::"WalletTxType", 'completed'::"WalletTxStatus", $3::numeric, $3::numeric,
          'admin', $4, $5,
          pgp_sym_encrypt($3::text, $6)
        )
        RETURNING
          id, reference_number AS "referenceNumber", user_id AS "userId",
          type, status, amount::text, total_amount::text AS "totalAmount",
          payment_method AS "paymentMethod", currency, description,
          created_at AS "createdAt", updated_at AS "updatedAt"`,
        [refNumber, userId, amount, CURRENCY, description, encKey],
      )

      // 3. Update balance (with encrypted copy)
      const op = isCredit ? '+' : '-'
      await client.query(
        `UPDATE profiles
         SET wallet_balance = wallet_balance ${op} $1,
             wallet_balance_encrypted = pgp_sym_encrypt((wallet_balance ${op} $1)::text, $3),
             updated_at = NOW()
         WHERE id = $2`,
        [amount, userId, encKey],
      )

      // 4. Audit log
      await client.query(
        `INSERT INTO audit_log (user_id, action, entity_type, entity_id, new_values)
         VALUES ($1, 'admin_adjustment', 'wallet_transaction', $2, $3)`,
        [adminId, txResult.rows[0].id, JSON.stringify({ userId, amount, isCredit, description })],
      )

      await client.query('COMMIT')
      return txResult.rows[0]
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  },

  // ── Wallet summary (admin dashboard) ─────────────────
  async getWalletSummary(): Promise<{
    totalDeposits: string
    totalWithdrawals: string
    pendingDeposits: number
    pendingWithdrawals: number
    totalUsers: number
    totalBalance: string
  }> {
    const [deposits, withdrawals, pendingDep, pendingWith, users, totalBal] = await Promise.all([
      queryOne<{ total: string }>(
        `SELECT COALESCE(SUM(amount), 0)::text AS total FROM wallet_transactions
         WHERE type = 'deposit' AND status = 'completed'`,
      ),
      queryOne<{ total: string }>(
        `SELECT COALESCE(SUM(amount), 0)::text AS total FROM wallet_transactions
         WHERE type = 'withdraw' AND status = 'completed'`,
      ),
      queryOne<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM bank_deposits WHERE status = 'pending'`,
      ),
      queryOne<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM withdrawals WHERE status = 'pending'`,
      ),
      queryOne<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM profiles WHERE wallet_balance > 0`,
      ),
      queryOne<{ total: string }>(
        `SELECT COALESCE(SUM(wallet_balance), 0)::text AS total FROM profiles`,
      ),
    ])

    return {
      totalDeposits: deposits?.total || '0',
      totalWithdrawals: withdrawals?.total || '0',
      pendingDeposits: parseInt(pendingDep?.count || '0', 10),
      pendingWithdrawals: parseInt(pendingWith?.count || '0', 10),
      totalUsers: parseInt(users?.count || '0', 10),
      totalBalance: totalBal?.total || '0',
    }
  },

  // ── Admin: List all transactions (across users) ──────
  async listAllTransactions(params: {
    userId?: string
    type?: string
    status?: string
    dateFrom?: string
    dateTo?: string
    page?: number
    pageSize?: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  }): Promise<{
    data: any[]
    total: number
    page: number
    pageSize: number
    totalPages: number
  }> {
    const {
      userId,
      type,
      status,
      dateFrom,
      dateTo,
      page = 1,
      pageSize = 20,
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = params

    const conditions: string[] = []
    const values: unknown[] = []
    let idx = 1

    if (userId) {
      conditions.push(`wt.user_id = $${idx++}`)
      values.push(userId)
    }
    if (type) {
      conditions.push(`wt.type = $${idx++}::"WalletTxType"`)
      values.push(type)
    }
    if (status) {
      conditions.push(`wt.status = $${idx++}::"WalletTxStatus"`)
      values.push(status)
    }
    if (dateFrom) {
      conditions.push(`wt.created_at >= $${idx++}::timestamptz`)
      values.push(dateFrom)
    }
    if (dateTo) {
      conditions.push(`wt.created_at <= $${idx++}::timestamptz`)
      values.push(dateTo)
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const allowedSorts: Record<string, string> = {
      created_at: 'wt.created_at',
      amount: 'wt.amount',
      type: 'wt.type',
      status: 'wt.status',
    }
    const sortCol = allowedSorts[sortBy] || 'wt.created_at'
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC'
    const offset = (Math.max(1, page) - 1) * pageSize

    const [countResult, dataResult] = await Promise.all([
      query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM wallet_transactions wt ${where}`, values),
      query<any>(
        `SELECT
          wt.id,
          wt.reference_number AS "referenceNumber",
          wt.user_id AS "userId",
          wt.order_id AS "orderId",
          wt.product_id AS "productId",
          wt.type,
          wt.status,
          wt.amount::text,
          wt.admin_commission::text AS "adminCommission",
          wt.merchant_amount::text AS "merchantAmount",
          wt.tax_amount::text AS "taxAmount",
          wt.total_amount::text AS "totalAmount",
          wt.payment_method AS "paymentMethod",
          wt.transaction_id AS "transactionId",
          wt.currency,
          wt.proof_document AS "proofDocument",
          wt.description,
          wt.created_at AS "createdAt",
          wt.updated_at AS "updatedAt",
          p.first_name AS "userFirstName",
          p.last_name AS "userLastName",
          p.email AS "userEmail",
          p.custom_id AS "userCustomId"
        FROM wallet_transactions wt
        JOIN profiles p ON p.id = wt.user_id
        ${where}
        ORDER BY ${sortCol} ${order}
        LIMIT $${idx++} OFFSET $${idx++}`,
        [...values, pageSize, offset],
      ),
    ])

    const total = parseInt(countResult[0]?.count || '0', 10)

    for (const tx of dataResult) {
      if (tx.proofDocument) {
        tx.proofDocument = (await signUrl(tx.proofDocument)) || tx.proofDocument
      }
    }

    return {
      data: dataResult,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  },

  // ── Admin: Export all transactions (CSV) ─────────────
  async exportAllTransactions(params: {
    userId?: string
    type?: string
    status?: string
    dateFrom?: string
    dateTo?: string
  }): Promise<string> {
    const result = await this.listAllTransactions({ ...params, page: 1, pageSize: 50000 })

    const header = 'Reference,Date,User,Email,Type,Status,Amount,Currency,Payment Method,Description\n'
    const rows = result.data.map((tx: any) => {
      const date = new Date(tx.createdAt).toISOString()
      const desc = (tx.description || '').replace(/"/g, '""')
      const userName = `${tx.userFirstName || ''} ${tx.userLastName || ''}`.trim().replace(/"/g, '""')
      return `"${tx.referenceNumber}","${date}","${userName}","${tx.userEmail || ''}","${tx.type}","${tx.status}","${tx.amount}","${tx.currency || CURRENCY}","${tx.paymentMethod || ''}","${desc}"`
    })

    return header + rows.join('\n')
  },
}
