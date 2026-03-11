import { redirect } from 'next/navigation'
import { createSupabaseServerClient, createSupabaseServiceClient } from './supabase/server'

export type AdminUser = {
  id: string
  fullName: string
  email: string
  phone: string | null
  role: string
  status: string
  image: string | null
}

// ── Admin profile cache (avoids repeated auth + profile lookups) ──
const adminCache = new Map<string, { admin: AdminUser; expiresAt: number }>()
const ADMIN_CACHE_TTL = 60_000 // 60 seconds

/**
 * Get the current authenticated admin user.
 * Returns null if not authenticated or not an admin/super_admin.
 * Uses getSession() for fast local JWT decode (~0ms) instead of getUser()
 * which adds ~1200ms per call. The profile DB query below verifies the
 * user's role and status — that IS the security check.
 */
export async function getCurrentAdmin(): Promise<AdminUser | null> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user) return null
  const userId = session.user.id

  // Check cache
  const now = Date.now()
  const cached = adminCache.get(userId)
  if (cached && cached.expiresAt > now) return cached.admin

  const sb = await createSupabaseServiceClient()
  const { data } = await sb
    .from('profiles')
    .select('id, first_name, last_name, email, phone, role, status, image')
    .eq('id', userId)
    .single()

  const profile = data as { id: string; first_name: string; last_name: string; email: string; phone: string | null; role: string; status: string; image: string | null } | null
  if (!profile) return null
  if (profile.role !== 'admin' && profile.role !== 'super_admin') return null
  if (profile.status !== 'active') return null

  const admin: AdminUser = {
    id: profile.id,
    fullName: `${profile.first_name} ${profile.last_name}`,
    email: profile.email,
    phone: profile.phone,
    role: profile.role,
    status: profile.status,
    image: profile.image,
  }

  // Cache for 60s
  adminCache.set(userId, { admin, expiresAt: now + ADMIN_CACHE_TTL })

  return admin
}

/**
 * Require an authenticated admin. Redirects to /login if not authenticated.
 */
export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getCurrentAdmin()
  if (!admin) redirect('/login')
  return admin
}

/**
 * Check if current admin has a specific role
 */
export function isSuper(admin: AdminUser): boolean {
  return admin.role === 'super_admin'
}
