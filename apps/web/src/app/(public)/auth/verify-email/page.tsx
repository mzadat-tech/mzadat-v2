'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { Button } from '@mzadat/ui'
import { createClient } from '@/lib/supabase/client'
import { DEFAULT_LOCALE, getDirection } from '@/lib/i18n'

const locale = DEFAULT_LOCALE
const isAr = locale === 'ar'
const API_BASE = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api`

type Status = 'verifying' | 'success' | 'error'

export default function VerifyEmailPage() {
  const router = useRouter()
  const [status, setStatus] = useState<Status>('verifying')
  const [errorMessage, setErrorMessage] = useState<string>('')

  useEffect(() => {
    async function verify() {
      // Parse the hash fragment — Supabase puts session tokens there
      const hash = window.location.hash.slice(1) // remove leading '#'
      const params = new URLSearchParams(hash)

      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')
      const type = params.get('type')

      if (!accessToken || !refreshToken || type !== 'signup') {
        setErrorMessage(
          isAr
            ? 'رابط التحقق غير صالح أو منتهي الصلاحية.'
            : 'Invalid or expired verification link.',
        )
        setStatus('error')
        return
      }

      try {
        // 1. Set the Supabase session client-side
        const supabase = createClient()
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })

        if (sessionError) {
          throw new Error(sessionError.message)
        }

        // 2. Sync the profile row (mark emailVerified=true, status='active')
        const res = await fetch(`${API_BASE}/auth/email-confirmed`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        })

        const body = await res.json().catch(() => ({}))

        if (!res.ok) {
          throw new Error(body.error ?? `API error ${res.status}`)
        }

        setStatus('success')

        // Redirect to home after a short delay
        setTimeout(() => router.push('/'), 2500)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Verification failed'
        setErrorMessage(message)
        setStatus('error')
      }
    }

    verify()
  }, [router])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="mx-auto w-full max-w-md py-12"
    >
      <div className="overflow-hidden rounded-2xl border border-border bg-white p-8 text-center shadow-lg">
        {status === 'verifying' && (
          <>
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-100 text-primary-700">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
            <h1 className="text-xl font-bold text-foreground">
              {isAr ? 'جارٍ التحقق من بريدك الإلكتروني…' : 'Verifying your email…'}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {isAr ? 'يرجى الانتظار لحظة.' : 'Please wait a moment.'}
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100 text-green-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h1 className="text-xl font-bold text-foreground">
              {isAr ? 'تم التحقق بنجاح!' : 'Email Verified!'}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {isAr
                ? 'تم تفعيل حسابك. سيتم تحويلك الآن…'
                : 'Your account is now active. Redirecting you now…'}
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-red-600">
              <XCircle className="h-8 w-8" />
            </div>
            <h1 className="text-xl font-bold text-foreground">
              {isAr ? 'فشل التحقق' : 'Verification Failed'}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">{errorMessage}</p>

            <div className="mt-6 space-y-3">
              <Button asChild className="w-full bg-primary-700 hover:bg-primary-800">
                <Link href="/auth/login">
                  {isAr ? 'تسجيل الدخول' : 'Sign In'}
                </Link>
              </Button>
              <Button variant="ghost" asChild className="w-full text-muted-foreground">
                <Link href="/">
                  {isAr ? 'الصفحة الرئيسية' : 'Go to Home'}
                </Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </motion.div>
  )
}
