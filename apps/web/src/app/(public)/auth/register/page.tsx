'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Phone,
  Building2,
  CreditCard,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Check,
} from 'lucide-react'
import { Button } from '@mzadat/ui'
import { Input } from '@mzadat/ui/components/input'
import { Label } from '@mzadat/ui/components/label'
import { Tabs, TabsList, TabsTrigger } from '@mzadat/ui/components/tabs'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { DEFAULT_LOCALE, getDirection } from '@/lib/i18n'

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api`

const locale = DEFAULT_LOCALE
const direction = getDirection(locale)
const isAr = locale === 'ar'

const registerSchema = z
  .object({
    type: z.enum(['individual', 'company']),
    firstName: z.string().min(2, isAr ? 'الاسم الأول مطلوب' : 'First name required'),
    lastName: z.string().min(2, isAr ? 'الاسم الأخير مطلوب' : 'Last name required'),
    email: z.string().email(isAr ? 'بريد إلكتروني غير صالح' : 'Invalid email'),
    phone: z.string().min(8, isAr ? 'رقم الهاتف غير صالح' : 'Invalid phone number'),
    idNumber: z.string().min(5, isAr ? 'رقم الهوية مطلوب' : 'ID number required'),
    password: z.string().min(8, isAr ? 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' : 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
    companyName: z.string().optional(),
    commercialReg: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: isAr ? 'كلمات المرور غير متطابقة' : 'Passwords do not match',
    path: ['confirmPassword'],
  })

type RegisterForm = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [userType, setUserType] = useState<'individual' | 'company'>('individual')
  const [step, setStep] = useState(1)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { type: 'individual' },
  })

  async function onSubmit(data: RegisterForm) {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          password: data.password,
          confirmPassword: data.confirmPassword,
          registerAs: data.type,
          individualId: data.idNumber,
          companyName: data.companyName,
          companyId: data.commercialReg,
        }),
      })

      const body = await res.json().catch(() => ({}))

      if (!res.ok) {
        toast.error(isAr ? 'فشل التسجيل' : 'Registration failed', {
          description: body.error ?? body.details?.[0]?.message ?? 'Unknown error',
        })
        return
      }

      // Set the Supabase session client-side using the tokens returned by the API
      const { session } = body.data
      const supabase = createClient()
      await supabase.auth.setSession({
        access_token: session.accessToken,
        refresh_token: session.refreshToken,
      })

      toast.success(isAr ? 'تم التسجيل بنجاح!' : 'Registration successful!', {
        description: isAr
          ? 'تحقق من بريدك الإلكتروني لتفعيل الحساب'
          : 'Check your email to verify your account',
      })
      router.push('/auth/verify')
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
      className="mx-auto w-full max-w-lg py-12"
    >
      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-lg">
        <div className="p-8">
          {/* Header */}
          <div className="mb-6 text-center">
            <Link href="/" className="mb-3 inline-block text-3xl font-extrabold text-primary-900">
              {isAr ? 'مزادات' : 'Mzadat'}
            </Link>
            <h1 className="text-xl font-bold text-foreground">
              {isAr ? 'إنشاء حساب جديد' : 'Create Account'}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isAr ? 'سجل للمشاركة في المزادات' : 'Register to participate in auctions'}
            </p>
          </div>

          {/* User Type Toggle */}
          <Tabs
            value={userType}
            onValueChange={(v) => {
              setUserType(v as 'individual' | 'company')
              setValue('type', v as 'individual' | 'company')
            }}
            className="mb-6"
          >
            <TabsList className="w-full">
              <TabsTrigger value="individual" className="flex-1 gap-1.5">
                <User className="h-4 w-4" />
                {isAr ? 'فرد' : 'Individual'}
              </TabsTrigger>
              <TabsTrigger value="company" className="flex-1 gap-1.5">
                <Building2 className="h-4 w-4" />
                {isAr ? ' شركة' : 'Company'}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Step Indicator */}
          <div className="mb-6 flex items-center gap-2">
            {[1, 2].map((s) => (
              <div
                key={s}
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-all ${
                  step >= s
                    ? 'bg-primary-700 text-white'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {step > s ? <Check className="h-4 w-4" /> : s}
              </div>
            ))}
            <span className="text-xs text-muted-foreground">
              {isAr
                ? step === 1 ? 'المعلومات الشخصية' : 'بيانات الحساب'
                : step === 1 ? 'Personal Info' : 'Account Details'}
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  {/* Name fields */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">
                        {isAr ? 'الاسم الأول' : 'First Name'}
                      </Label>
                      <div className="relative">
                        <User className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="firstName"
                          className="ps-10"
                          {...register('firstName')}
                        />
                      </div>
                      {errors.firstName && (
                        <p className="text-xs text-destructive">{errors.firstName.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">
                        {isAr ? 'الاسم الأخير' : 'Last Name'}
                      </Label>
                      <Input id="lastName" {...register('lastName')} />
                      {errors.lastName && (
                        <p className="text-xs text-destructive">{errors.lastName.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="space-y-2">
                    <Label htmlFor="phone">{isAr ? 'رقم الهاتف' : 'Phone Number'}</Label>
                    <div className="relative">
                      <Phone className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="phone"
                        type="tel"
                        dir="ltr"
                        placeholder="+968 XXXX XXXX"
                        className="ps-10"
                        {...register('phone')}
                      />
                    </div>
                    {errors.phone && (
                      <p className="text-xs text-destructive">{errors.phone.message}</p>
                    )}
                  </div>

                  {/* ID Number */}
                  <div className="space-y-2">
                    <Label htmlFor="idNumber">
                      {isAr ? 'رقم الهوية / الجواز' : 'ID / Passport Number'}
                    </Label>
                    <div className="relative">
                      <CreditCard className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="idNumber"
                        className="ps-10"
                        {...register('idNumber')}
                      />
                    </div>
                    {errors.idNumber && (
                      <p className="text-xs text-destructive">{errors.idNumber.message}</p>
                    )}
                  </div>

                  {/* Company Fields */}
                  {userType === 'company' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="companyName">
                          {isAr ? 'اسم الشركة' : 'Company Name'}
                        </Label>
                        <div className="relative">
                          <Building2 className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="companyName"
                            className="ps-10"
                            {...register('companyName')}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="commercialReg">
                          {isAr ? 'رقم السجل التجاري' : 'Commercial Registration'}
                        </Label>
                        <Input id="commercialReg" {...register('commercialReg')} />
                      </div>
                    </>
                  )}

                  <Button
                    type="button"
                    className="w-full bg-primary-700 hover:bg-primary-800"
                    size="lg"
                    onClick={() => setStep(2)}
                  >
                    {isAr ? 'التالي' : 'Next'}
                    <ArrowIcon className="ms-2 h-4 w-4" />
                  </Button>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email">{isAr ? 'البريد الإلكتروني' : 'Email'}</Label>
                    <div className="relative">
                      <Mail className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        className="ps-10"
                        autoComplete="email"
                        {...register('email')}
                      />
                    </div>
                    {errors.email && (
                      <p className="text-xs text-destructive">{errors.email.message}</p>
                    )}
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <Label htmlFor="password">{isAr ? 'كلمة المرور' : 'Password'}</Label>
                    <div className="relative">
                      <Lock className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        className="ps-10 pe-10"
                        autoComplete="new-password"
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

                  {/* Confirm Password */}
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">
                      {isAr ? 'تأكيد كلمة المرور' : 'Confirm Password'}
                    </Label>
                    <div className="relative">
                      <Lock className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="confirmPassword"
                        type="password"
                        className="ps-10"
                        autoComplete="new-password"
                        {...register('confirmPassword')}
                      />
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      size="lg"
                      onClick={() => setStep(1)}
                    >
                      {isAr ? 'السابق' : 'Back'}
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-primary-700 hover:bg-primary-800"
                      size="lg"
                      disabled={loading}
                    >
                      {loading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                      {isAr ? 'إنشاء الحساب' : 'Create Account'}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
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
              type="button"
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
              {isAr ? 'التسجيل عبر Google' : 'Sign up with Google'}
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border bg-muted/30 px-8 py-4 text-center">
          <p className="text-sm text-muted-foreground">
            {isAr ? 'لديك حساب بالفعل؟' : 'Already have an account?'}{' '}
            <Link href="/auth/login" className="font-medium text-primary-600 hover:underline">
              {isAr ? 'تسجيل الدخول' : 'Sign In'}
            </Link>
          </p>
        </div>
      </div>

    </motion.div>
  )
}
