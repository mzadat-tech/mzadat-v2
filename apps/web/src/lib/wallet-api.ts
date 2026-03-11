/**
 * Wallet API client
 *
 * All calls go through the Express API with Supabase JWT auth.
 * The browser client fetches the session token and passes it as Authorization header.
 */

import { createClient } from '@/lib/supabase/client'

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api`

async function getAuthHeaders(): Promise<Record<string, string>> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Not authenticated')
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...headers, ...(init?.headers || {}) },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `API ${res.status}`)
  }
  return res.json()
}

// ── Types ────────────────────────────────────────────

export interface WalletBalance {
  balance: string
  currency: string
  isVip: boolean
}

export interface DepositPresets {
  presets: number[]
  min: number
  max: number
  currency: string
  step: number
}

export interface BankAccount {
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
}

export interface WalletTransaction {
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
  createdAt: string
  updatedAt: string
}

export interface TransactionListResult {
  success: boolean
  data: WalletTransaction[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ── API Calls ────────────────────────────────────────

export async function getBalance(): Promise<WalletBalance> {
  const res = await apiFetch<{ success: boolean; data: WalletBalance }>('/wallet/balance')
  return res.data
}

export async function getDepositPresets(): Promise<DepositPresets> {
  const res = await apiFetch<{ success: boolean; data: DepositPresets }>('/wallet/presets')
  return res.data
}

export async function getBankAccounts(): Promise<BankAccount[]> {
  const res = await apiFetch<{ success: boolean; data: BankAccount[] }>('/wallet/bank-accounts')
  return res.data
}

export async function submitDeposit(data: {
  amount: number
  paymentMethod: string
  proofDocument?: string
  bankName?: string
  referenceNumber?: string
  description?: string
}): Promise<{ message: string; data: WalletTransaction }> {
  return apiFetch('/wallet/deposit', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function submitBankDeposit(data: {
  amount: number
  proofDocument: string
  bankName: string
  referenceNumber?: string
  description?: string
}): Promise<{ message: string; data: WalletTransaction }> {
  return apiFetch('/wallet/deposit/bank', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function getTransactions(params: {
  type?: string
  status?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}): Promise<TransactionListResult> {
  const qs = new URLSearchParams()
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== '') qs.set(key, String(val))
  }
  return apiFetch(`/wallet/transactions?${qs.toString()}`)
}

export async function getTransaction(id: string): Promise<WalletTransaction> {
  const res = await apiFetch<{ success: boolean; data: WalletTransaction }>(`/wallet/transactions/${encodeURIComponent(id)}`)
  return res.data
}

export async function exportTransactionsCsv(params: {
  type?: string
  status?: string
  dateFrom?: string
  dateTo?: string
}): Promise<string> {
  const qs = new URLSearchParams()
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== '') qs.set(key, String(val))
  }
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_BASE}/wallet/transactions/export?${qs.toString()}`, { headers })
  if (!res.ok) throw new Error('Export failed')
  return res.text()
}

export async function verifyTransaction(id: string): Promise<{ isValid: boolean; referenceNumber: string }> {
  const res = await apiFetch<{ success: boolean; data: { isValid: boolean; referenceNumber: string } }>(
    `/wallet/transactions/${encodeURIComponent(id)}/verify`,
  )
  return res.data
}
