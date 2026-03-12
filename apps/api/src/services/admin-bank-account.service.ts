/**
 * Admin Bank Account Service
 *
 * Manages platform bank accounts displayed to users during bank-transfer deposits.
 * Admin can add/update/remove bank accounts. Users see only active accounts.
 */

import { query, queryOne } from '@mzadat/db'
import { publicUrl } from '../utils/storage.js'

export interface AdminBankAccountRow {
  [key: string]: unknown
  id: string
  bankName: Record<string, string>
  accountName: string
  accountNumber: string
  iban: string
  swiftCode: string | null
  branch: string | null
  currency: string
  logo: string | null
  sortOrder: number
  status: string
  createdAt: Date
  updatedAt: Date
}

export interface UpsertBankAccountInput {
  bankName: Record<string, string> // {"en": "Bank Muscat", "ar": "بنك مسقط"}
  accountName: string
  accountNumber: string
  iban: string
  swiftCode?: string
  branch?: string
  currency?: string
  logo?: string
  sortOrder?: number
  status?: string
}

const SELECT_FIELDS = `
  id,
  bank_name AS "bankName",
  account_name AS "accountName",
  account_number AS "accountNumber",
  iban,
  swift_code AS "swiftCode",
  branch,
  currency,
  logo,
  sort_order AS "sortOrder",
  status,
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`

export const adminBankAccountService = {
  // ── List (admin: all, public: active only) ───────────
  async list(activeOnly = false): Promise<AdminBankAccountRow[]> {
    const where = activeOnly ? `WHERE status = 'active'` : ''
    const rows = await query<AdminBankAccountRow>(
      `SELECT ${SELECT_FIELDS} FROM admin_bank_accounts ${where} ORDER BY sort_order ASC, created_at ASC`,
    )

    for (const row of rows) {
      if (row.logo) {
        row.logo = publicUrl(row.logo) || row.logo
      }
    }
    return rows
  },

  // ── Get by ID ────────────────────────────────────────
  async getById(id: string): Promise<AdminBankAccountRow | null> {
    const row = await queryOne<AdminBankAccountRow>(
      `SELECT ${SELECT_FIELDS} FROM admin_bank_accounts WHERE id = $1`,
      [id],
    )
    if (row?.logo) {
      row.logo = publicUrl(row.logo) || row.logo
    }
    return row
  },

  // ── Create ───────────────────────────────────────────
  async create(input: UpsertBankAccountInput): Promise<AdminBankAccountRow> {
    const row = await queryOne<AdminBankAccountRow>(
      `INSERT INTO admin_bank_accounts (
        bank_name, account_name, account_number, iban, swift_code,
        branch, currency, logo, sort_order, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::\"ContentStatus\")
      RETURNING ${SELECT_FIELDS}`,
      [
        JSON.stringify(input.bankName),
        input.accountName,
        input.accountNumber,
        input.iban,
        input.swiftCode || null,
        input.branch || null,
        input.currency || 'OMR',
        input.logo || null,
        input.sortOrder ?? 0,
        input.status || 'active',
      ],
    )
    return row!
  },

  // ── Update ───────────────────────────────────────────
  async update(id: string, input: Partial<UpsertBankAccountInput>): Promise<AdminBankAccountRow | null> {
    // Build dynamic SET clause
    const sets: string[] = []
    const values: unknown[] = []
    let idx = 1

    if (input.bankName !== undefined) {
      sets.push(`bank_name = $${idx++}`)
      values.push(JSON.stringify(input.bankName))
    }
    if (input.accountName !== undefined) {
      sets.push(`account_name = $${idx++}`)
      values.push(input.accountName)
    }
    if (input.accountNumber !== undefined) {
      sets.push(`account_number = $${idx++}`)
      values.push(input.accountNumber)
    }
    if (input.iban !== undefined) {
      sets.push(`iban = $${idx++}`)
      values.push(input.iban)
    }
    if (input.swiftCode !== undefined) {
      sets.push(`swift_code = $${idx++}`)
      values.push(input.swiftCode)
    }
    if (input.branch !== undefined) {
      sets.push(`branch = $${idx++}`)
      values.push(input.branch)
    }
    if (input.currency !== undefined) {
      sets.push(`currency = $${idx++}`)
      values.push(input.currency)
    }
    if (input.logo !== undefined) {
      sets.push(`logo = $${idx++}`)
      values.push(input.logo)
    }
    if (input.sortOrder !== undefined) {
      sets.push(`sort_order = $${idx++}`)
      values.push(input.sortOrder)
    }
    if (input.status !== undefined) {
      sets.push(`status = $${idx++}::\"ContentStatus\"`)
      values.push(input.status)
    }

    if (sets.length === 0) return this.getById(id)

    sets.push('updated_at = NOW()')
    values.push(id)

    const row = await queryOne<AdminBankAccountRow>(
      `UPDATE admin_bank_accounts SET ${sets.join(', ')} WHERE id = $${idx}
       RETURNING ${SELECT_FIELDS}`,
      values,
    )
    return row
  },

  // ── Delete ───────────────────────────────────────────
  async delete(id: string): Promise<boolean> {
    const result = await queryOne<{ id: string }>(
      `DELETE FROM admin_bank_accounts WHERE id = $1 RETURNING id`,
      [id],
    )
    return !!result
  },
}
