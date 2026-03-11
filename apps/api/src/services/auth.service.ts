/**
 * Auth Service
 *
 * Handles all authentication business logic using:
 *   - Supabase Auth  → signup, login, tokens, password reset
 *   - Prisma         → profile CRUD (fast direct DB access)
 *
 * Design:
 *   Supabase Auth creates the auth.users row and issues JWTs.
 *   We then create a matching public.profiles row via Prisma
 *   with app-specific fields (role, custom_id, wallet, etc.).
 */

import { prisma, type UserRole, type RegisterType } from '@mzadat/db'
import { supabaseAdmin } from '../config/database.js'
import { env } from '../config/env.js'
import { generateCustomId } from '../utils/custom-id.js'
import type { RegisterInput, MerchantRegisterInput } from '@mzadat/validators'

// ─── Helpers ────────────────────────────────────────────────

/** Generate next custom ID for a given role */
async function nextCustomId(role: 'customer' | 'merchant'): Promise<string> {
  const prefix = role === 'merchant' ? 'MC' : 'C'
  const lastProfile = await prisma.profile.findFirst({
    where: { customId: { startsWith: prefix } },
    orderBy: { customId: 'desc' },
    select: { customId: true },
  })

  if (!lastProfile) return generateCustomId(prefix, 1)

  const numPart = parseInt(lastProfile.customId.slice(prefix.length), 10)
  return generateCustomId(prefix, numPart + 1)
}

/** Slugify a store name */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Make a unique slug by appending a counter if needed */
async function uniqueStoreSlug(name: string): Promise<string> {
  const base = slugify(name)
  let slug = base
  let counter = 0

  while (await prisma.store.findUnique({ where: { slug }, select: { id: true } })) {
    counter++
    slug = `${base}-${counter}`
  }
  return slug
}

// ─── Response types ─────────────────────────────────────────

export interface AuthSession {
  accessToken: string
  refreshToken: string
  expiresAt: number // Unix timestamp
}

export interface AuthResult {
  session: AuthSession
  user: {
    id: string
    customId: string
    email: string
    firstName: string
    lastName: string
    role: UserRole
    status: string
    phone: string | null
    registerAs: RegisterType
    isVip: boolean
    emailVerified: boolean
    image: string | null
  }
}

// ─── Service ────────────────────────────────────────────────

export const authService = {
  // ── Customer Sign-Up ────────────────────────────────────
  async register(input: RegisterInput): Promise<AuthResult> {
    // 1. Check if email already exists in profiles (fast Prisma check)
    const existing = await prisma.profile.findUnique({
      where: { email: input.email },
      select: { id: true },
    })
    if (existing) {
      throw new AppError('An account with this email already exists', 409)
    }

    // 2. Create auth user in Supabase
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: false, // we'll verify via email
      user_metadata: {
        first_name: input.firstName,
        last_name: input.lastName,
      },
    })

    if (authError || !authData.user) {
      throw new AppError(authError?.message ?? 'Failed to create auth account', 500)
    }

    const userId = authData.user.id

    // 3. Generate custom ID
    const customId = await nextCustomId('customer')

    // 4. Create profile row (Prisma — direct DB, no Supabase overhead)
    const profile = await prisma.profile.create({
      data: {
        id: userId,
        customId,
        role: 'customer',
        status: 'pending_verification',
        registerAs: input.registerAs as RegisterType,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        individualId: input.individualId ?? null,
        companyName: input.companyName ?? null,
        companyId: input.companyId ?? null,
        walletBalance: 0,
        isVip: false,
        emailVerified: false,
      },
    })

    // 5. Send verification email via Supabase
    //    Supabase sends a magic link to the user's email.
    //    Clicking it redirects to WEB_URL/auth/verify-email?token_hash=...&type=signup
    const { error: inviteError } = await supabaseAdmin.auth.resend({
      type: 'signup',
      email: input.email,
      options: {
        emailRedirectTo: `${env.WEB_URL}/auth/verify-email`,
      },
    })

    if (inviteError) {
      console.error('[auth.service] Failed to send verification email:', inviteError.message)
    }

    // 6. Sign in to get session tokens (user can browse while unverified,
    //    but protected actions check emailVerified flag)
    const { data: signInData, error: signInError } =
      await supabaseAdmin.auth.signInWithPassword({
        email: input.email,
        password: input.password,
      })

    if (signInError || !signInData.session) {
      // Profile was created — user can still login manually
      throw new AppError('Account created but auto sign-in failed. Please login.', 201)
    }

    return {
      session: {
        accessToken: signInData.session.access_token,
        refreshToken: signInData.session.refresh_token,
        expiresAt: signInData.session.expires_at ?? 0,
      },
      user: profileToUserResponse(profile),
    }
  },

  // ── Merchant Sign-Up ────────────────────────────────────
  async registerMerchant(input: MerchantRegisterInput): Promise<AuthResult & { store: { id: string; slug: string; name: string } }> {
    // 1. Check if email already exists
    const existing = await prisma.profile.findUnique({
      where: { email: input.email },
      select: { id: true },
    })
    if (existing) {
      throw new AppError('An account with this email already exists', 409)
    }

    // 2. Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: false,
      user_metadata: {
        first_name: input.firstName,
        last_name: input.lastName,
        role: 'merchant',
      },
    })

    if (authError || !authData.user) {
      throw new AppError(authError?.message ?? 'Failed to create auth account', 500)
    }

    const userId = authData.user.id
    const customId = await nextCustomId('merchant')
    const slug = await uniqueStoreSlug(input.shopName)

    // 3. Create profile + store in a single transaction (atomic, fast)
    const [profile, store] = await prisma.$transaction([
      prisma.profile.create({
        data: {
          id: userId,
          customId,
          role: 'merchant',
          status: 'pending_verification',
          registerAs: 'individual',
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          phone: input.phone,
          walletBalance: 0,
          isVip: false,
          emailVerified: false,
        },
      }),
      prisma.store.create({
        data: {
          ownerId: userId,
          slug,
          name: { en: input.shopName, ar: '' },
        },
      }),
    ])

    // 4. Send verification email
    const { error: inviteError } = await supabaseAdmin.auth.resend({
      type: 'signup',
      email: input.email,
      options: {
        emailRedirectTo: `${env.WEB_URL}/auth/verify-email`,
      },
    })

    if (inviteError) {
      console.error('[auth.service] Failed to send merchant verification email:', inviteError.message)
    }

    // 5. Sign in to get session tokens
    const { data: signInData, error: signInError } =
      await supabaseAdmin.auth.signInWithPassword({
        email: input.email,
        password: input.password,
      })

    if (signInError || !signInData.session) {
      throw new AppError('Account created but auto sign-in failed. Please login.', 201)
    }

    return {
      session: {
        accessToken: signInData.session.access_token,
        refreshToken: signInData.session.refresh_token,
        expiresAt: signInData.session.expires_at ?? 0,
      },
      user: profileToUserResponse(profile),
      store: {
        id: store.id,
        slug: store.slug,
        name: input.shopName,
      },
    }
  },

  // ── Sign In ─────────────────────────────────────────────
  async login(email: string, password: string): Promise<AuthResult> {
    // 1. Authenticate via Supabase (validates credentials, returns JWT)
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    })

    if (error || !data.session) {
      // Map common Supabase errors to user-friendly messages
      if (error?.message?.includes('Invalid login credentials')) {
        throw new AppError('Invalid email or password', 401)
      }
      if (error?.message?.includes('Email not confirmed')) {
        throw new AppError('Please verify your email before signing in', 403)
      }
      throw new AppError(error?.message ?? 'Login failed', 401)
    }

    // 2. Fetch profile (Prisma — single indexed query, ~1ms)
    const profile = await prisma.profile.findUnique({
      where: { id: data.user.id },
    })

    if (!profile) {
      throw new AppError('Profile not found. Please contact support.', 404)
    }

    if (profile.status === 'suspended') {
      throw new AppError('Your account has been suspended', 403)
    }

    return {
      session: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at ?? 0,
      },
      user: profileToUserResponse(profile),
    }
  },

  // ── Sign Out ────────────────────────────────────────────
  async logout(userId: string): Promise<void> {
    // Revoke all refresh tokens for this user via admin API
    await supabaseAdmin.auth.admin.signOut(userId)
  },

  // ── Refresh Token ───────────────────────────────────────
  async refreshSession(refreshToken: string): Promise<AuthSession> {
    const { data, error } = await supabaseAdmin.auth.refreshSession({
      refresh_token: refreshToken,
    })

    if (error || !data.session) {
      throw new AppError('Invalid or expired refresh token', 401)
    }

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at ?? 0,
    }
  },

  // ── Forgot Password ────────────────────────────────────
  async forgotPassword(email: string, redirectTo?: string): Promise<void> {
    // Check profile exists (fast Prisma indexed lookup)
    const profile = await prisma.profile.findUnique({
      where: { email },
      select: { id: true },
    })

    // Always return success to prevent email enumeration
    if (!profile) return

    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo ?? `${process.env.WEB_URL ?? 'http://localhost:3000'}/reset-password`,
    })

    if (error) {
      // Log but don't expose to user
      console.error('[auth.service] forgotPassword error:', error.message)
    }
  },

  // ── Reset Password (with Supabase recovery token) ──────
  // Note: Actual reset-password logic is handled directly in the
  // route handler since it requires decoding the recovery token
  // from the Authorization header. See routes/auth.ts.

  // ── Update Password (authenticated) ────────────────────
  async updatePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    // 1. Get user email from profile
    const profile = await prisma.profile.findUnique({
      where: { id: userId },
      select: { email: true },
    })

    if (!profile) {
      throw new AppError('Profile not found', 404)
    }

    // 2. Verify current password by attempting sign-in
    const { error: verifyError } = await supabaseAdmin.auth.signInWithPassword({
      email: profile.email,
      password: currentPassword,
    })

    if (verifyError) {
      throw new AppError('Current password is incorrect', 401)
    }

    // 3. Update password via admin API (bypasses password validation)
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    })

    if (error) {
      throw new AppError('Failed to update password', 500)
    }
  },

  // ── Get Current User Profile ───────────────────────────
  async getMe(userId: string): Promise<AuthResult['user']> {
    const profile = await prisma.profile.findUnique({
      where: { id: userId },
    })

    if (!profile) {
      throw new AppError('Profile not found', 404)
    }

    return profileToUserResponse(profile)
  },

  // ── Verify Email (token_hash from Supabase link) ───────
  /**
   * Called when the user clicks the verification link in their email.
   * Supabase redirects to: WEB_URL/auth/verify-email?token_hash=xxx&type=signup
   * The frontend extracts token_hash + type and calls this endpoint.
   *
   * Flow:
   *  1. Exchange token_hash → Supabase verifies the OTP/hash
   *  2. On success, Supabase marks auth.users.email_confirmed_at
   *  3. We sync profiles.email_verified = true & status = 'active'
   *  4. Return fresh session so user is logged in immediately
   */
  async verifyEmail(tokenHash: string, type: string): Promise<AuthResult> {
    // 1. Verify the token with Supabase (one-time use)
    const { data, error } = await supabaseAdmin.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as 'signup' | 'email',
    })

    if (error || !data.session || !data.user) {
      throw new AppError(
        error?.message ?? 'Invalid or expired verification link',
        401,
      )
    }

    // 2. Update profile: mark email as verified, activate account
    const profile = await prisma.profile.update({
      where: { id: data.user.id },
      data: {
        emailVerified: true,
        status: 'active',
      },
    })

    // 3. Return session + updated user
    return {
      session: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at ?? 0,
      },
      user: profileToUserResponse(profile),
    }
  },

  // ── Resend Verification Email ──────────────────────────
  async resendVerification(email: string): Promise<void> {
    const { error } = await supabaseAdmin.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${env.WEB_URL}/auth/verify-email`,
      },
    })

    if (error) {
      // Don't expose whether email exists
      console.error('[auth.service] resendVerification error:', error.message)
    }
  },
}

// ─── Map Prisma profile → API response ──────────────────────

function profileToUserResponse(profile: {
  id: string
  customId: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  status: string
  phone: string | null
  registerAs: RegisterType
  isVip: boolean
  emailVerified: boolean
  image: string | null
}): AuthResult['user'] {
  return {
    id: profile.id,
    customId: profile.customId,
    email: profile.email,
    firstName: profile.firstName,
    lastName: profile.lastName,
    role: profile.role,
    status: profile.status,
    phone: profile.phone,
    registerAs: profile.registerAs,
    isVip: profile.isVip,
    emailVerified: profile.emailVerified,
    image: profile.image,
  }
}

// ─── App Error ──────────────────────────────────────────────

export class AppError extends Error {
  statusCode: number
  constructor(message: string, statusCode = 400) {
    super(message)
    this.statusCode = statusCode
    this.name = 'AppError'
  }
}
