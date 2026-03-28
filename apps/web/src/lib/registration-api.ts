/**
 * Registration API client — handles all auction registration calls.
 */

import { createClient } from '@/lib/supabase/client'
import { CLIENT_API_BASE } from '@/lib/api-base'

const API_BASE = CLIENT_API_BASE

async function getAuthHeaders(): Promise<Record<string, string>> {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
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
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || `API ${res.status}`)
  return body as T
}

// ── Types ────────────────────────────────────────────

export interface CheckoutData {
  group: {
    id: string
    name: Record<string, string> | string
    description: Record<string, string> | string
    image: string | null
    merchantId: string
    merchantName: string
    merchantCustomId: string
    minDeposit: string
    status: string
    startDate: string
    endDate: string
  }
  lots: Array<{
    id: string
    name: Record<string, string> | string
    slug: string
    featureImage: string | null
    minBidPrice: string
  }>
  user: {
    id: string
    name: string
    email: string
    phone: string | null
    isVip: boolean
    walletBalance: string
    customId: string
  }
  isAlreadyRegistered: boolean
  existingRegistration: { id: string; orderNumber: string } | null
}

export interface RegistrationResult {
  id: string
  orderNumber: string
  depositAmount: string
  discountAmount: string
  taxAmount: string
  totalAmount: string
  isVipFree: boolean
  paymentStatus: string
  status: string
  createdAt: string
}

export interface UserRegistration {
  id: string
  orderNumber: string
  groupId: string
  depositAmount: string
  discountAmount: string
  taxAmount: string
  totalAmount: string
  paymentMethod: string
  paymentStatus: string
  isVipFree: boolean
  status: string
  createdAt: string
  groupName: Record<string, string> | string
  groupStatus: string
  groupStartDate: string
  groupEndDate: string
  groupImage: string | null
  lotCount: number
}

// ── API functions ────────────────────────────────────

/** Get checkout data for a group (pre-registration view) */
export async function getCheckoutData(groupId: string): Promise<CheckoutData> {
  const res = await apiFetch<{ success: boolean; data: CheckoutData }>(
    `/registrations/checkout/${encodeURIComponent(groupId)}`,
  )
  return res.data
}

/** Register for a group (pay deposit) */
export async function registerForGroup(groupId: string): Promise<RegistrationResult> {
  const res = await apiFetch<{ success: boolean; data: RegistrationResult }>(
    '/registrations',
    {
      method: 'POST',
      body: JSON.stringify({ groupId, paymentMethod: 'wallet' }),
    },
  )
  return res.data
}

/** Get user's registrations (paginated) */
export async function getMyRegistrations(
  page = 1,
  pageSize = 20,
): Promise<{ data: UserRegistration[]; total: number; page: number; pageSize: number }> {
  return apiFetch(`/registrations/my?page=${page}&pageSize=${pageSize}`)
}

/** Check if registered for a group */
export async function checkRegistration(
  groupId: string,
): Promise<{ registered: boolean; registration?: { id: string; orderNumber: string; status: string } }> {
  const res = await apiFetch<{
    success: boolean
    data: { registered: boolean; registration?: { id: string; orderNumber: string; status: string } }
  }>(`/registrations/check/${encodeURIComponent(groupId)}`)
  return res.data
}

/** Open receipt in a new tab (client-side HTML receipt) */
export function downloadReceipt(registrationId: string, lang: 'en' | 'ar' = 'en'): void {
  window.open(`/receipt/${encodeURIComponent(registrationId)}?lang=${lang}`, '_blank')
}

/**
 * Returns the set of group IDs for which the current user has an active
 * (deposit-paid) registration.  Safe to call when not logged in — returns
 * { isLoggedIn: false, paidGroupIds: empty Set }.
 */
export async function getMyPaidGroupIds(): Promise<{
  isLoggedIn: boolean
  paidGroupIds: Set<string>
}> {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) return { isLoggedIn: false, paidGroupIds: new Set() }

  try {
    const result = await getMyRegistrations(1, 100)
    const paidGroupIds = new Set(
      result.data.filter((r) => r.status === 'active').map((r) => r.groupId),
    )
    return { isLoggedIn: true, paidGroupIds }
  } catch {
    return { isLoggedIn: true, paidGroupIds: new Set() }
  }
}
