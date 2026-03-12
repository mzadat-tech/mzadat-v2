/**
 * Auth Routes
 *
 * POST /auth/register              — Customer sign-up
 * POST /auth/register/merchant     — Merchant sign-up (creates store)
 * POST /auth/login                 — Sign in (email + password)
 * POST /auth/logout                — Sign out (revoke tokens)
 * POST /auth/refresh               — Refresh access token
 * POST /auth/verify-email          — Verify email via Supabase token_hash
 * POST /auth/forgot-password       — Request password reset email
 * POST /auth/reset-password        — Reset password with recovery token
 * PUT  /auth/update-password       — Change password (authenticated)
 * GET  /auth/me                    — Get current user profile
 * POST /auth/resend-verification   — Resend email verification
 */

import { Router, type IRouter } from 'express'
import type { Request, Response } from 'express'
import { validate } from '../middleware/validate.js'
import { authMiddleware, type AuthenticatedRequest } from '../middleware/auth.js'
import { authService, AppError } from '../services/auth.service.js'
import {
  loginSchema,
  registerSchema,
  merchantRegisterSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updatePasswordSchema,
  refreshTokenSchema,
  verifyEmailSchema,
} from '@mzadat/validators'

const router: IRouter = Router()

// ── Helper: send error response ──────────────────────────
function handleError(res: Response, err: unknown): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ success: false, error: err.message })
    return
  }
  console.error('[auth] Unhandled error:', err)
  res.status(500).json({ success: false, error: 'Internal server error' })
}

// ── POST /auth/register ──────────────────────────────────
// Customer registration
router.post(
  '/register',
  validate(registerSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await authService.register(req.body)
      res.status(201).json({ success: true, data: result })
    } catch (err) {
      handleError(res, err)
    }
  },
)

// ── POST /auth/register/merchant ─────────────────────────
// Merchant registration — also creates a store
router.post(
  '/register/merchant',
  validate(merchantRegisterSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await authService.registerMerchant(req.body)
      res.status(201).json({ success: true, data: result })
    } catch (err) {
      handleError(res, err)
    }
  },
)

// ── POST /auth/login ─────────────────────────────────────
router.post(
  '/login',
  validate(loginSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body
      const result = await authService.login(email, password)
      res.json({ success: true, data: result })
    } catch (err) {
      handleError(res, err)
    }
  },
)

// ── POST /auth/logout ────────────────────────────────────
router.post(
  '/logout',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      await authService.logout(req.userId!)
      res.json({ success: true, message: 'Logged out successfully' })
    } catch (err) {
      handleError(res, err)
    }
  },
)

// ── POST /auth/refresh ───────────────────────────────────
router.post(
  '/refresh',
  validate(refreshTokenSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const session = await authService.refreshSession(req.body.refreshToken)
      res.json({ success: true, data: { session } })
    } catch (err) {
      handleError(res, err)
    }
  },
)
// ── POST /auth/verify-email ────────────────────────────
// User clicks email verification link → redirected to frontend
// Frontend extracts token_hash & type from URL, POSTs here
router.post(
  '/verify-email',
  validate(verifyEmailSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { tokenHash, type } = req.body
      const result = await authService.verifyEmail(tokenHash, type)
      res.json({ success: true, data: result, message: 'Email verified successfully' })
    } catch (err) {
      handleError(res, err)
    }
  },
)
// ── POST /auth/forgot-password ───────────────────────────
router.post(
  '/forgot-password',
  validate(forgotPasswordSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      await authService.forgotPassword(req.body.email, req.body.redirectTo)
      // Always 200 to prevent email enumeration
      res.json({ success: true, message: 'If the email exists, a reset link has been sent' })
    } catch (err) {
      handleError(res, err)
    }
  },
)

// ── POST /auth/reset-password ────────────────────────────
// Called after user clicks reset link — frontend passes the
// access_token from the URL fragment + new password
router.post(
  '/reset-password',
  validate(resetPasswordSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      // The access_token from Supabase's recovery email comes as Bearer token
      const authHeader = req.headers.authorization
      if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ success: false, error: 'Recovery token required' })
        return
      }
      const accessToken = authHeader.split(' ')[1]

      // Use admin API to update the user's password via the recovery token
      // First decode the JWT to get user ID
      const { data: { user }, error } = await (await import('../config/database.js')).supabaseAdmin.auth.getUser(accessToken)
      if (error || !user) {
        res.status(401).json({ success: false, error: 'Invalid or expired recovery token' })
        return
      }

      const { error: updateError } = await (await import('../config/database.js')).supabaseAdmin.auth.admin.updateUserById(
        user.id,
        { password: req.body.password },
      )

      if (updateError) {
        throw new AppError('Failed to reset password', 500)
      }

      res.json({ success: true, message: 'Password reset successfully' })
    } catch (err) {
      handleError(res, err)
    }
  },
)

// ── PUT /auth/update-password ────────────────────────────
// Authenticated — change password (requires current password)
router.put(
  '/update-password',
  authMiddleware,
  validate(updatePasswordSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { currentPassword, newPassword } = req.body
      await authService.updatePassword(req.userId!, currentPassword, newPassword)
      res.json({ success: true, message: 'Password updated successfully' })
    } catch (err) {
      handleError(res, err)
    }
  },
)

// ── GET /auth/me ─────────────────────────────────────────
// Get current authenticated user profile
// Uses the profile already fetched in authMiddleware — zero extra DB calls
router.get(
  '/me',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const profile = req.profile!
      res.json({
        success: true,
        data: {
          user: {
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
          },
        },
      })
    } catch (err) {
      handleError(res, err)
    }
  },
)

// ── POST /auth/email-confirmed ──────────────────────────
// Called after Supabase redirects to /auth/verify-email with session tokens
// in the URL hash (implicit-grant flow). The frontend sets the session, then
// POSTs here (with the access_token as Bearer) to sync the profile row.
router.post(
  '/email-confirmed',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const user = await authService.syncEmailVerified(req.userId!)
      res.json({ success: true, data: { user }, message: 'Email verified successfully' })
    } catch (err) {
      handleError(res, err)
    }
  },
)

// ── POST /auth/resend-verification ───────────────────────
router.post(
  '/resend-verification',
  validate(forgotPasswordSchema), // same shape: { email }
  async (req: Request, res: Response): Promise<void> => {
    try {
      await authService.resendVerification(req.body.email)
      // Always 200 to prevent enumeration
      res.json({ success: true, message: 'If the email exists, a verification email has been sent' })
    } catch (err) {
      handleError(res, err)
    }
  },
)

export { router as authRoutes }
