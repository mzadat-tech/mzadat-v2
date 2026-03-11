import type { Request, Response, NextFunction } from 'express'
import { jwtVerify, createRemoteJWKSet } from 'jose'
import { queryOne, type Profile } from '@mzadat/db'
import { env } from '../config/env.js'

// ── Types ───────────────────────────────────────────────
export interface AuthenticatedRequest extends Request {
  userId?: string
  userRole?: string
  jwtPayload?: JwtPayload
  /** Full profile row, fetched once in middleware — reuse in handlers to avoid duplicate DB calls */
  profile?: Profile
}

interface JwtPayload {
  sub: string          // Supabase user ID
  email?: string
  role?: string        // Supabase auth role (e.g. 'authenticated')
  aud?: string
  iss?: string
  exp?: number
  iat?: number
  [key: string]: unknown
}

// ── JWT verification via JWKS ───────────────────────────
// Fetches & caches Supabase's public signing keys (ECC P-256).
// Handles key rotation automatically. Keys cached for 10 min.
const jwksUrl = new URL(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/.well-known/jwks.json`)
const jwks = createRemoteJWKSet(jwksUrl, {
  cacheMaxAge: 600_000, // 10 minutes
})
console.log(`🔑 JWT verification: JWKS (${jwksUrl.href})`)

/**
 * Verify the Supabase-issued JWT using the JWKS endpoint (ECC P-256).
 * Fetches & caches public keys (~10min), then all verification is
 * local & ~1ms. Zero config on key rotation.
 */
export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: 'Missing or invalid authorization header' })
      return
    }

    const token = authHeader.split(' ')[1]

    // ── Verify JWT signature + expiry ─────────────────
    let payload: JwtPayload
    try {
      const { payload: verified } = await jwtVerify(token, jwks, {
        audience: 'authenticated',
        issuer: `${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1`,
      })
      payload = verified as unknown as JwtPayload
    } catch {
      res.status(401).json({ success: false, error: 'Invalid or expired token' })
      return
    }

    if (!payload.sub) {
      res.status(401).json({ success: false, error: 'Token missing subject' })
      return
    }

    // ── Fetch full profile (single raw SQL query, reused by handlers) ──
    const profile = await queryOne<Record<string, unknown>>(`
      SELECT id, custom_id AS "customId", role, status, register_as AS "registerAs",
             first_name AS "firstName", last_name AS "lastName",
             first_name_ar AS "firstNameAr", last_name_ar AS "lastNameAr",
             email, phone, image,
             individual_id AS "individualId", company_name AS "companyName", company_id AS "companyId",
             country_id AS "countryId", state_id AS "stateId", city_id AS "cityId",
             address, zip_code AS "zipCode",
             is_vip AS "isVip", email_verified AS "emailVerified",
             wallet_balance AS "walletBalance",
             corporate_domain_id AS "corporateDomainId",
             created_at AS "createdAt", updated_at AS "updatedAt", deleted_at AS "deletedAt"
      FROM profiles WHERE id = $1
    `, [payload.sub]) as Profile | null

    if (!profile) {
      res.status(403).json({ success: false, error: 'Profile not found' })
      return
    }

    if (profile.status === 'suspended') {
      res.status(403).json({ success: false, error: 'Account suspended' })
      return
    }

    req.userId = payload.sub
    req.userRole = profile.role
    req.jwtPayload = payload
    req.profile = profile

    next()
  } catch {
    res.status(500).json({ success: false, error: 'Authentication error' })
  }
}
