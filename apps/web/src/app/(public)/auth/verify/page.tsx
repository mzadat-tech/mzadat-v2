'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Mail, ArrowLeft } from 'lucide-react'
import { Button } from '@mzadat/ui'

const isAr = false

export default function VerifyPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="mx-auto w-full max-w-md py-12"
    >
      <div className="overflow-hidden rounded-2xl border border-border bg-white p-8 text-center shadow-lg">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-100 text-primary-700">
          <Mail className="h-8 w-8" />
        </div>

        <h1 className="text-xl font-bold text-foreground">
          {isAr ? 'تحقق من بريدك الإلكتروني' : 'Check Your Email'}
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm text-muted-foreground">
          {isAr
            ? 'لقد أرسلنا رابط التحقق إلى بريدك الإلكتروني. يرجى النقر على الرابط لتفعيل حسابك.'
            : "We've sent a verification link to your email. Please click the link to activate your account."}
        </p>

        <div className="mt-6 space-y-3">
          <Button asChild className="w-full bg-primary-700 hover:bg-primary-800">
            <Link href="/auth/login">
              {isAr ? 'العودة لتسجيل الدخول' : 'Back to Sign In'}
            </Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/" className="gap-1.5 text-muted-foreground">
              <ArrowLeft className="h-4 w-4" />
              {isAr ? 'الصفحة الرئيسية' : 'Home'}
            </Link>
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
