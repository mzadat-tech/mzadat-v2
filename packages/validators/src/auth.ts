import { z } from 'zod'

// ── Sign In ──────────────────────────────────────────────
export const loginSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

// ── Password rules (shared) ────────────────────────────
const passwordField = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')

// ── Customer Registration ────────────────────────────────
export const registerSchema = z
  .object({
    firstName: z.string().min(2, 'First name is required').max(100).trim(),
    lastName: z.string().min(2, 'Last name is required').max(100).trim(),
    email: z.string().email('Invalid email address').toLowerCase().trim(),
    phone: z.string().min(7, 'Phone number too short').max(15, 'Phone number too long').trim(),
    password: passwordField,
    confirmPassword: z.string(),
    registerAs: z.enum(['individual', 'company']).default('individual'),
    // Identity docs (conditional — required based on registerAs)
    individualId: z.string().max(30).optional(), // National / Civil ID
    companyName: z.string().max(255).optional(),
    companyId: z.string().max(30).optional(), // Commercial registration no.
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine(
    (data) => {
      if (data.registerAs === 'company') {
        return !!data.companyName && data.companyName.length >= 2
      }
      return true
    },
    { message: 'Company name is required for company registration', path: ['companyName'] },
  )

// ── Merchant Registration ────────────────────────────────
export const merchantRegisterSchema = z
  .object({
    firstName: z.string().min(2, 'First name is required').max(100).trim(),
    lastName: z.string().min(2, 'Last name is required').max(100).trim(),
    email: z.string().email('Invalid email address').toLowerCase().trim(),
    phone: z.string().min(7).max(15).trim(),
    password: passwordField,
    confirmPassword: z.string(),
    shopName: z.string().min(2, 'Shop name is required').max(255).trim(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

// ── Forgot Password ─────────────────────────────────────
export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
})

// ── Reset Password ───────────────────────────────────────
export const resetPasswordSchema = z
  .object({
    password: passwordField,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

// ── Update Password (while authenticated) ────────────────
export const updatePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordField,
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'Passwords do not match',
    path: ['confirmNewPassword'],
  })

// ── Refresh token ────────────────────────────────────────
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
})

// ── Email Verification (token_hash from Supabase link) ───
export const verifyEmailSchema = z.object({
  tokenHash: z.string().min(1, 'Verification token is required'),
  type: z.enum(['signup', 'email']).default('signup'),
})

// ── Types ────────────────────────────────────────────────
export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type MerchantRegisterInput = z.infer<typeof merchantRegisterSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>
