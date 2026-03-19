'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { User, Phone, Building2, CreditCard, ArrowRight, Loader2, ArrowLeft } from 'lucide-react'
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

const completeProfileSchema = z
  .object({
    type: z.enum(['individual', 'company']),
    firstName: z.string().min(2, isAr ? 'الاسم الأول مطلوب' : 'First name is required').max(100),
    lastName: z.string().min(2, isAr ? 'الاسم الأخير مطلوب' : 'Last name is required').max(100),
    phone: z.string().min(7, isAr ? 'رقم الهاتف قصير جداً' : 'Phone number too short').max(15).trim(),
    individualId: z.string().max(30).optional(),
    companyName: z.string().max(255).optional(),
    companyId: z.string().max(30).optional(),
  })
  .refine(
    (data) => {
      if (data.type === 'company') {
        return !!data.companyName && data.companyName.length >= 2
      }
      return true
    },
    { message: isAr ? 'اسم الشركة مطلوب' : 'Company name is required', path: ['companyName'] },
  )

type CompleteProfileForm = z.infer<typeof completeProfileSchema>

export default function CompleteProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const [token, setToken] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CompleteProfileForm>({
    resolver: zodResolver(completeProfileSchema),
    defaultValues: {
      type: 'individual',
    },
  })

  const accountType = watch('type')

  useEffect(() => {
    // Pre-fill fields from session if available
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/auth/login')
        return
      }
      
      setToken(session.access_token)

      const metadata = session.user.user_metadata || {}
      
      // Attempt to split full_name into first and last name
      const fullName = metadata.full_name || ''
      const parts = fullName.split(' ')
      
      if (parts.length > 0 && parts[0]) {
        setValue('firstName', parts[0])
      }
      if (parts.length > 1) {
        setValue('lastName', parts.slice(1).join(' '))
      }
    })
  }, [router, setValue, supabase.auth])

  async function onSubmit(data: CompleteProfileForm) {
    if (!token) return

    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/auth/oauth/complete-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          registerAs: data.type,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          individualId: data.individualId,
          companyName: data.companyName,
          companyId: data.companyId,
        }),
      })

      const result = await res.json()

      if (!res.ok || !result.success) {
        toast.error(isAr ? 'فشل إكمال الملف الشخصي' : 'Failed to complete profile', {
          description: result.error || 'Unknown error occurred',
        })
        return
      }

      toast.success(isAr ? 'تم إكمال الملف الشخصي بنجاح' : 'Profile completed successfully')
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
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
      className="mx-auto w-full max-w-xl py-12"
    >
      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-lg">
        <div className="p-8">
          <div className="mb-8 text-center">
            <h1 className="text-xl font-bold text-foreground">
              {isAr ? 'إكمال الملف الشخصي' : 'Complete Your Profile'}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isAr
                ? 'نحتاج لبعض المعلومات الإضافية قبل أن تتمكن من المتابعة'
                : 'We need a little more information before you can continue'}
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Tabs
              defaultValue="individual"
              value={accountType}
              onValueChange={(val) => setValue('type', val as 'individual' | 'company')}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="individual" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {isAr ? 'أفراد' : 'Individual'}
                </TabsTrigger>
                <TabsTrigger value="company" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {isAr ? 'شركات' : 'Company'}
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* First Name */}
              <div className="space-y-2">
                <Label htmlFor="firstName">{isAr ? 'الاسم الأول' : 'First Name'}</Label>
                <div className="relative">
                  <User className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="firstName"
                    placeholder={isAr ? 'أحمد' : 'Ahmed'}
                    className="ps-10"
                    {...register('firstName')}
                  />
                </div>
                {errors.firstName && (
                  <p className="text-xs text-destructive">{errors.firstName.message}</p>
                )}
              </div>

              {/* Last Name */}
              <div className="space-y-2">
                <Label htmlFor="lastName">{isAr ? 'الاسم الأخير' : 'Last Name'}</Label>
                <div className="relative">
                  <User className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="lastName"
                    placeholder={isAr ? 'البلوشي' : 'Al Balushi'}
                    className="ps-10"
                    {...register('lastName')}
                  />
                </div>
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
                  placeholder="9xxxxxxx"
                  className="ps-10"
                  {...register('phone')}
                />
              </div>
              {errors.phone && (
                <p className="text-xs text-destructive">{errors.phone.message}</p>
              )}
            </div>

            <AnimatePresence mode="wait">
              {accountType === 'company' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 overflow-hidden"
                >
                  <div className="space-y-2">
                    <Label htmlFor="companyName">{isAr ? 'اسم الشركة' : 'Company Name'}</Label>
                    <div className="relative">
                      <Building2 className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="companyName"
                        placeholder={isAr ? 'شركة مزادات' : 'Mzadat LLC'}
                        className="ps-10"
                        {...register('companyName')}
                      />
                    </div>
                    {errors.companyName && (
                      <p className="text-xs text-destructive">{errors.companyName.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="companyId">
                      {isAr ? 'السجل التجاري' : 'Commercial Registration (CR)'}
                    </Label>
                    <div className="relative">
                      <CreditCard className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="companyId"
                        placeholder="1xxxxxx"
                        className="ps-10"
                        {...register('companyId')}
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {accountType === 'individual' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 overflow-hidden"
                >
                  <div className="space-y-2">
                    <Label htmlFor="individualId">
                      {isAr ? 'الرقم المدني' : 'Civil ID'}
                    </Label>
                    <div className="relative">
                      <CreditCard className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="individualId"
                        placeholder="1xxxxxxx"
                        className="ps-10"
                        {...register('individualId')}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              type="submit"
              className="w-full bg-primary-700 hover:bg-primary-800"
              size="lg"
              disabled={loading}
            >
              {loading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {isAr ? 'حفظ المتابعة' : 'Save & Continue'}
              <ArrowIcon className="ms-2 h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </motion.div>
  )
}