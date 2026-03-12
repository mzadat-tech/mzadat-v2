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

export interface PlaceBidResult {
  bidId: string
  amount: number
  isExtended: boolean
  newEndDate?: string
}

export async function placeBid(productId: string, amount: number): Promise<PlaceBidResult> {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_BASE}/bids`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ productId, amount }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(body.error || `Bid failed (${res.status})`)
  }
  return body.data
}
