'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth'
import { createSupabaseServiceClient } from '@/lib/supabase/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SB = any

async function sb(): Promise<SB> {
  return createSupabaseServiceClient()
}

// ── Encryption key ───────────────────────────────────────────────

function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY
  if (!key || key.length < 32) {
    throw new Error('ENCRYPTION_KEY must be at least 32 characters')
  }
  return key
}

// ── Types ────────────────────────────────────────────────────────

export interface WalletSummary {
  totalDeposits: number
  totalWithdrawals: number
  pendingDeposits: number
  pendingWithdrawals: number
  totalUsers: number
  totalBalance: number
}

export interface DepositRow {
  id: string
  userId: string
  walletTxId: string | null
  amount: number
  proofDocument: string | null
  proofDocumentUrl: string | null
  bankName: string | null
  referenceNumber: string | null
  status: string
  adminNotes: string | null
  reviewedBy: string | null
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
  // joined user fields
  userFirstName: string
  userLastName: string
  userEmail: string
  userCustomId: string
  userIsVip: boolean
  // joined tx fields
  txReferenceNumber: string | null
}

export interface TransactionRow {
  id: string
  referenceNumber: string
  userId: string
  orderId: string | null
  productId: string | null
  type: string
  status: string
  amount: number
  adminCommission: number
  merchantAmount: number
  taxAmount: number
  totalAmount: number
  paymentMethod: string | null
  transactionId: string | null
  currency: string
  proofDocument: string | null
  proofDocumentUrl: string | null
  description: string | null
  createdAt: string
  updatedAt: string
  // joined user fields
  userFirstName: string
  userLastName: string
  userEmail: string
  userCustomId: string
}

export interface BankAccountRow {
  id: string
  bankName: Record<string, string>
  accountName: string
  accountNumber: string
  iban: string
  swiftCode: string | null
  branch: string | null
  currency: string
  logo: string | null
  logoUrl: string | null
  sortOrder: number
  status: string
  createdAt: string
  updatedAt: string
}

export interface BankAccountFormData {
  bankNameEn: string
  bankNameAr: string
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

// ── Helpers ──────────────────────────────────────────────────────

async function getSignedUrl(path: string | null): Promise<string | null> {
  if (!path) return null
  const client = await sb()
  const { data } = await client.storage.from('media').createSignedUrl(path, 7 * 24 * 60 * 60)
  return data?.signedUrl ?? null
}

// ── Wallet Summary ──────────────────────────────────────────────

export async function getWalletSummary(): Promise<WalletSummary> {
  await requireAdmin()
  const client = await sb()

  const [pendingDepRes, pendingWithRes, usersRes, balanceRes, depTxRes, withTxRes] =
    await Promise.all([
      client.from('bank_deposits').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      client.from('withdrawals').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      client.from('profiles').select('id', { count: 'exact', head: true }).gt('wallet_balance', 0),
      client.from('profiles').select('wallet_balance'),
      client.from('wallet_transactions').select('amount').eq('type', 'deposit').eq('status', 'completed'),
      client.from('wallet_transactions').select('amount').eq('type', 'withdraw').eq('status', 'completed'),
    ])

  const totalBalance = (balanceRes.data || []).reduce(
    (sum: number, p: any) => sum + parseFloat(p.wallet_balance || '0'),
    0,
  )
  const totalDeposits = (depTxRes.data || []).reduce(
    (s: number, r: any) => s + parseFloat(r.amount || '0'),
    0,
  )
  const totalWithdrawals = (withTxRes.data || []).reduce(
    (s: number, r: any) => s + parseFloat(r.amount || '0'),
    0,
  )

  return {
    totalDeposits,
    totalWithdrawals,
    pendingDeposits: pendingDepRes.count ?? 0,
    pendingWithdrawals: pendingWithRes.count ?? 0,
    totalUsers: usersRes.count ?? 0,
    totalBalance,
  }
}

// ── Deposits ────────────────────────────────────────────────────

export async function getDeposits(params: {
  status?: string
  page?: number
  pageSize?: number
}): Promise<{ data: DepositRow[]; total: number }> {
  await requireAdmin()
  const client = await sb()

  const { status = 'pending', page = 1, pageSize = 20 } = params
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = client
    .from('bank_deposits')
    .select(`
      id, user_id, wallet_tx_id, amount, proof_document, bank_name, reference_number,
      status, admin_notes, reviewed_by, reviewed_at, created_at, updated_at
    `, { count: 'exact' })

  if (status !== 'all') {
    query = query.eq('status', status)
  }

  query = query.order('created_at', { ascending: false }).range(from, to)

  const { data: deposits, count, error } = await query

  if (error) throw new Error(error.message)

  // Fetch user details and tx references in batch
  const userIds = [...new Set((deposits || []).map((d: any) => d.user_id))]
  const txIds = (deposits || []).map((d: any) => d.wallet_tx_id).filter(Boolean)

  const [usersRes, txRes] = await Promise.all([
    userIds.length > 0
      ? client.from('profiles').select('id, first_name, last_name, email, custom_id, is_vip').in('id', userIds)
      : { data: [] },
    txIds.length > 0
      ? client.from('wallet_transactions').select('id, reference_number').in('id', txIds)
      : { data: [] },
  ])

  const usersMap = new Map((usersRes.data || []).map((u: any) => [u.id, u]))
  const txMap = new Map((txRes.data || []).map((t: any) => [t.id, t]))

  const rows: DepositRow[] = []
  for (const d of deposits || []) {
    const user: any = usersMap.get(d.user_id) || {}
    const tx: any = txMap.get(d.wallet_tx_id) || {}
    const proofUrl = await getSignedUrl(d.proof_document)

    rows.push({
      id: d.id,
      userId: d.user_id,
      walletTxId: d.wallet_tx_id,
      amount: parseFloat(d.amount),
      proofDocument: d.proof_document,
      proofDocumentUrl: proofUrl,
      bankName: d.bank_name,
      referenceNumber: d.reference_number,
      status: d.status,
      adminNotes: d.admin_notes,
      reviewedBy: d.reviewed_by,
      reviewedAt: d.reviewed_at,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
      userFirstName: user.first_name || '',
      userLastName: user.last_name || '',
      userEmail: user.email || '',
      userCustomId: user.custom_id || '',
      userIsVip: user.is_vip || false,
      txReferenceNumber: tx.reference_number || null,
    })
  }

  return { data: rows, total: count ?? 0 }
}

export async function approveDeposit(
  depositId: string,
  notes?: string,
): Promise<{ error?: string }> {
  const admin = await requireAdmin()
  const client = await sb()

  // 1. Get deposit
  const { data: deposit, error: fetchErr } = await client
    .from('bank_deposits')
    .select('id, user_id, amount, wallet_tx_id, status')
    .eq('id', depositId)
    .single()

  if (fetchErr || !deposit) return { error: 'Deposit not found' }
  if (deposit.status !== 'pending') return { error: `Deposit already ${deposit.status}` }

  const amount = parseFloat(deposit.amount)

  // 2. Update bank_deposit
  const { error: updateErr } = await client
    .from('bank_deposits')
    .update({
      status: 'completed',
      admin_notes: notes || null,
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', depositId)

  if (updateErr) return { error: updateErr.message }

  // 3. Update wallet_transaction
  if (deposit.wallet_tx_id) {
    await client
      .from('wallet_transactions')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', deposit.wallet_tx_id)
  }

  // 4. Credit wallet balance (with encrypted copy via DB function)
  const { data: profile } = await client
    .from('profiles')
    .select('wallet_balance')
    .eq('id', deposit.user_id)
    .single()

  if (profile) {
    const newBalance = parseFloat(profile.wallet_balance || '0') + amount
    await client.rpc('update_wallet_balance', {
      p_user_id: deposit.user_id,
      p_new_balance: newBalance,
      p_encryption_key: getEncryptionKey(),
    })
  }

  // 5. Audit log
  await client.from('audit_log').insert({
    user_id: admin.id,
    action: 'approve',
    entity_type: 'bank_deposit',
    entity_id: depositId,
    new_values: { amount, userId: deposit.user_id, notes },
  })

  revalidatePath('/deposits')
  revalidatePath('/wallets')
  return {}
}

export async function rejectDeposit(
  depositId: string,
  notes?: string,
): Promise<{ error?: string }> {
  const admin = await requireAdmin()
  const client = await sb()

  const { data: deposit, error: fetchErr } = await client
    .from('bank_deposits')
    .select('id, user_id, amount, wallet_tx_id, status')
    .eq('id', depositId)
    .single()

  if (fetchErr || !deposit) return { error: 'Deposit not found' }
  if (deposit.status !== 'pending') return { error: `Deposit already ${deposit.status}` }

  const { error: updateErr } = await client
    .from('bank_deposits')
    .update({
      status: 'rejected',
      admin_notes: notes || 'Rejected by admin',
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', depositId)

  if (updateErr) return { error: updateErr.message }

  if (deposit.wallet_tx_id) {
    await client
      .from('wallet_transactions')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', deposit.wallet_tx_id)
  }

  await client.from('audit_log').insert({
    user_id: admin.id,
    action: 'reject',
    entity_type: 'bank_deposit',
    entity_id: depositId,
    new_values: { amount: parseFloat(deposit.amount), userId: deposit.user_id, notes },
  })

  revalidatePath('/deposits')
  return {}
}

// ── Transactions ────────────────────────────────────────────────

export async function getTransactions(params: {
  userId?: string
  type?: string
  status?: string
  page?: number
  pageSize?: number
}): Promise<{ data: TransactionRow[]; total: number }> {
  await requireAdmin()
  const client = await sb()

  const { userId, type, status, page = 1, pageSize = 20 } = params
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = client
    .from('wallet_transactions')
    .select(`
      id, reference_number, user_id, order_id, product_id, type, status,
      amount, admin_commission, merchant_amount, tax_amount, total_amount,
      payment_method, transaction_id, currency, proof_document, description,
      created_at, updated_at
    `, { count: 'exact' })

  if (userId) query = query.eq('user_id', userId)
  if (type) query = query.eq('type', type)
  if (status) query = query.eq('status', status)

  query = query.order('created_at', { ascending: false }).range(from, to)

  const { data: transactions, count, error } = await query
  if (error) throw new Error(error.message)

  // Fetch user details
  const userIds = [...new Set((transactions || []).map((t: any) => t.user_id))]
  const usersRes = userIds.length > 0
    ? await client.from('profiles').select('id, first_name, last_name, email, custom_id').in('id', userIds)
    : { data: [] }

  const usersMap = new Map((usersRes.data || []).map((u: any) => [u.id, u]))

  const rows: TransactionRow[] = []
  for (const t of transactions || []) {
    const user: any = usersMap.get(t.user_id) || {}
    const proofUrl = await getSignedUrl(t.proof_document)

    rows.push({
      id: t.id,
      referenceNumber: t.reference_number,
      userId: t.user_id,
      orderId: t.order_id,
      productId: t.product_id,
      type: t.type,
      status: t.status,
      amount: parseFloat(t.amount),
      adminCommission: parseFloat(t.admin_commission || '0'),
      merchantAmount: parseFloat(t.merchant_amount || '0'),
      taxAmount: parseFloat(t.tax_amount || '0'),
      totalAmount: parseFloat(t.total_amount || '0'),
      paymentMethod: t.payment_method,
      transactionId: t.transaction_id,
      currency: t.currency || 'OMR',
      proofDocument: t.proof_document,
      proofDocumentUrl: proofUrl,
      description: t.description,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
      userFirstName: user.first_name || '',
      userLastName: user.last_name || '',
      userEmail: user.email || '',
      userCustomId: user.custom_id || '',
    })
  }

  return { data: rows, total: count ?? 0 }
}

export async function exportTransactionsCsv(params: {
  userId?: string
  type?: string
  status?: string
}): Promise<string> {
  await requireAdmin()
  const { data } = await getTransactions({ ...params, page: 1, pageSize: 50000 })

  const header = 'Reference,Date,User,Email,Type,Status,Amount,Currency,Payment Method,Description\n'
  const rows = data.map((tx) => {
    const date = new Date(tx.createdAt).toISOString()
    const desc = (tx.description || '').replace(/"/g, '""')
    const name = `${tx.userFirstName} ${tx.userLastName}`.trim().replace(/"/g, '""')
    return `"${tx.referenceNumber}","${date}","${name}","${tx.userEmail}","${tx.type}","${tx.status}","${tx.amount}","${tx.currency}","${tx.paymentMethod || ''}","${desc}"`
  })

  return header + rows.join('\n')
}

// ── Admin Adjustment ────────────────────────────────────────────

export async function createAdjustment(data: {
  userId: string
  amount: number
  description: string
  isCredit: boolean
}): Promise<{ error?: string }> {
  const admin = await requireAdmin()
  const client = await sb()

  // Get user profile
  const { data: profile, error: profileErr } = await client
    .from('profiles')
    .select('id, wallet_balance')
    .eq('id', data.userId)
    .single()

  if (profileErr || !profile) return { error: 'User not found' }

  const currentBalance = parseFloat(profile.wallet_balance || '0')
  if (!data.isCredit && currentBalance < data.amount) {
    return { error: 'Insufficient balance for debit adjustment' }
  }

  // Generate reference number - count existing + 1
  const { count: txCount } = await client.from('wallet_transactions').select('id', { count: 'exact', head: true })
  const refNumber = `WTX-${new Date().getFullYear()}-${String((txCount || 0) + 1).padStart(6, '0')}`

  // Insert transaction
  const { error: txErr } = await client.from('wallet_transactions').insert({
    reference_number: refNumber,
    user_id: data.userId,
    type: 'admin_adjustment',
    status: 'completed',
    amount: data.amount,
    total_amount: data.amount,
    payment_method: 'admin',
    currency: 'OMR',
    description: data.description,
  })

  if (txErr) return { error: txErr.message }

  // Update balance (with encrypted copy via DB function)
  const newBalance = data.isCredit
    ? currentBalance + data.amount
    : currentBalance - data.amount

  await client.rpc('update_wallet_balance', {
    p_user_id: data.userId,
    p_new_balance: newBalance,
    p_encryption_key: getEncryptionKey(),
  })

  // Audit log
  await client.from('audit_log').insert({
    user_id: admin.id,
    action: 'admin_adjustment',
    entity_type: 'wallet_transaction',
    new_values: { userId: data.userId, amount: data.amount, isCredit: data.isCredit, description: data.description },
  })

  revalidatePath('/wallets')
  revalidatePath('/transactions')
  return {}
}

// ── Bank Accounts ───────────────────────────────────────────────

export async function getBankAccounts(): Promise<BankAccountRow[]> {
  await requireAdmin()
  const client = await sb()

  const { data, error } = await client
    .from('admin_bank_accounts')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)

  const rows: BankAccountRow[] = []
  for (const r of data || []) {
    const logoUrl = await getSignedUrl(r.logo)
    rows.push({
      id: r.id,
      bankName: r.bank_name || {},
      accountName: r.account_name,
      accountNumber: r.account_number,
      iban: r.iban,
      swiftCode: r.swift_code,
      branch: r.branch,
      currency: r.currency,
      logo: r.logo,
      logoUrl,
      sortOrder: r.sort_order,
      status: r.status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })
  }

  return rows
}

export async function createBankAccount(data: BankAccountFormData): Promise<{ error?: string }> {
  await requireAdmin()
  const client = await sb()

  const { error } = await client.from('admin_bank_accounts').insert({
    bank_name: { en: data.bankNameEn, ar: data.bankNameAr || '' },
    account_name: data.accountName,
    account_number: data.accountNumber,
    iban: data.iban,
    swift_code: data.swiftCode || null,
    branch: data.branch || null,
    currency: data.currency || 'OMR',
    logo: data.logo || null,
    sort_order: data.sortOrder ?? 0,
    status: data.status || 'active',
  })

  if (error) return { error: error.message }

  revalidatePath('/wallets')
  return {}
}

export async function updateBankAccount(
  id: string,
  data: Partial<BankAccountFormData>,
): Promise<{ error?: string }> {
  await requireAdmin()
  const client = await sb()

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (data.bankNameEn !== undefined || data.bankNameAr !== undefined) {
    // Fetch existing to merge
    const { data: existing } = await client.from('admin_bank_accounts').select('bank_name').eq('id', id).single()
    const current = (existing?.bank_name || {}) as Record<string, string>
    update.bank_name = {
      en: data.bankNameEn ?? current.en ?? '',
      ar: data.bankNameAr ?? current.ar ?? '',
    }
  }
  if (data.accountName !== undefined) update.account_name = data.accountName
  if (data.accountNumber !== undefined) update.account_number = data.accountNumber
  if (data.iban !== undefined) update.iban = data.iban
  if (data.swiftCode !== undefined) update.swift_code = data.swiftCode
  if (data.branch !== undefined) update.branch = data.branch
  if (data.currency !== undefined) update.currency = data.currency
  if (data.logo !== undefined) update.logo = data.logo
  if (data.sortOrder !== undefined) update.sort_order = data.sortOrder
  if (data.status !== undefined) update.status = data.status

  const { error } = await client.from('admin_bank_accounts').update(update).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/wallets')
  return {}
}

export async function deleteBankAccount(id: string): Promise<{ error?: string }> {
  await requireAdmin()
  const client = await sb()

  const { error } = await client.from('admin_bank_accounts').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/wallets')
  return {}
}

// ── Wallet Users List (for summary page) ────────────────────────

export async function getWalletUsers(params: {
  search?: string
  page?: number
  pageSize?: number
}): Promise<{ data: any[]; total: number }> {
  await requireAdmin()
  const client = await sb()

  const { search, page = 1, pageSize = 20 } = params
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = client
    .from('profiles')
    .select('id, custom_id, first_name, last_name, email, phone, is_vip, wallet_balance, role, status, created_at', { count: 'exact' })
    .order('wallet_balance', { ascending: false })
    .range(from, to)

  if (search) {
    query = query.or(`email.ilike.%${search}%,custom_id.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`)
  }

  const { data, count, error } = await query
  if (error) throw new Error(error.message)

  return {
    data: (data || []).map((p: any) => ({
      id: p.id,
      customId: p.custom_id,
      firstName: p.first_name,
      lastName: p.last_name,
      email: p.email,
      phone: p.phone,
      isVip: p.is_vip,
      walletBalance: parseFloat(p.wallet_balance || '0'),
      role: p.role,
      status: p.status,
      createdAt: p.created_at,
    })),
    total: count ?? 0,
  }
}
