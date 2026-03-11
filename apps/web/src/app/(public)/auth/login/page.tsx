'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Mail, Lock, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@mzadat/ui'
import { Input } from '@mzadat/ui/components/input'
import { Label } from '@mzadat/ui/components/label'
import { Checkbox } from '@mzadat/ui/components/checkbox'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { DEFAULT_LOCALE, getDirection } from '@/lib/i18n'

const locale = DEFAULT_LOCALE
const direction = getDirection(locale)
const isAr = locale === 'ar'

const loginSchema = z.object({
  email: z.string().email(isAr ? 'بريد إلكتروني غير صالح' : 'Invalid email'),
  password: z.string().min(6, isAr ? 'كلمة المرور قصيرة جداً' : 'Password too short'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginForm) {
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (error) {
        toast.error(isAr ? 'فشل تسجيل الدخول' : 'Login failed', {
          description: error.message,
        })
        return
      }

      toast.success(isAr ? 'تم تسجيل الدخول بنجاح' : 'Logged in successfully')
      router.push('/dashboard')
      router.refresh()
    } catch {
      toast.error(isAr ? 'حدث خطأ' : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="mx-auto w-full max-w-md py-12"
    >
      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-lg">
        <div className="p-8">
          {/* Logo / Title */}
          <div className="mb-8 text-center">
            <Link href="/" className="mb-4 inline-block text-3xl font-extrabold text-primary-900">
              {isAr ? 'مزادات' : 'Mzadat'}
            </Link>
            <h1 className="text-xl font-bold text-foreground">
              {isAr ? 'تسجيل الدخول' : 'Sign In'}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isAr
                ? 'أدخل بياناتك للدخول إلى حسابك'
                : 'Enter your credentials to access your account'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{isAr ? 'البريد الإلكتروني' : 'Email'}</Label>
              <div className="relative">
                <Mail className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder={isAr ? 'example@email.com' : 'example@email.com'}
                  className="ps-10"
                  autoComplete="email"
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{isAr ? 'كلمة المرور' : 'Password'}</Label>
                <Link
                  href="/auth/forgot-password"
                  className="text-xs text-primary-600 hover:underline"
                >
                  {isAr ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="ps-10 pe-10"
                  autoComplete="current-password"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="remember" />
              <Label htmlFor="remember" className="text-sm font-normal text-muted-foreground">
                {isAr ? 'تذكرني' : 'Remember me'}
              </Label>
            </div>

            <Button
              type="submit"
              className="w-full bg-primary-700 hover:bg-primary-800"
              size="lg"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
              ) : (
                <ArrowIcon className="me-2 h-4 w-4" />
              )}
              {isAr ? 'تسجيل الدخول' : 'Sign In'}
            </Button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">
              {isAr ? 'أو' : 'or'}
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Social Login */}
          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={async () => {
                const supabase = createClient()
                await supabase.auth.signInWithOAuth({
                  provider: 'google',
                  options: { redirectTo: `${window.location.origin}/auth/callback` },
                })
              }}
            >
              <svg className="me-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              {isAr ? 'الدخول عبر Google' : 'Continue with Google'}
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border bg-muted/30 px-8 py-4 text-center">
          <p className="text-sm text-muted-foreground">
            {isAr ? 'ليس لديك حساب؟' : "Don't have an account?"}{' '}
            <Link href="/auth/register" className="font-medium text-primary-600 hover:underline">
              {isAr ? 'سجل الآن' : 'Register'}
            </Link>
          </p>
        </div>
      </div>

    </motion.div>
  )
}
