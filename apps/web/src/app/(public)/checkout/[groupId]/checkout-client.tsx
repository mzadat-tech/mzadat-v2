'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldCheck, Wallet, CheckCircle2, AlertCircle, ArrowLeft,
  ArrowRight, Loader2, Crown, Gavel, Package, Store, Calendar,
  Receipt, Download,
} from 'lucide-react'
import { Button } from '@mzadat/ui'
import { Badge } from '@mzadat/ui/components/badge'
import { Separator } from '@mzadat/ui/components/separator'
import { cn, formatOMR } from '@mzadat/ui/lib/utils'
import { toast } from 'sonner'
import {
  getCheckoutData,
  registerForGroup,
  downloadReceipt,
  type CheckoutData,
  type RegistrationResult,
} from '@/lib/registration-api'

function getName(json: unknown, lang: string): string {
  if (typeof json === 'string') return json
  if (json && typeof json === 'object') {
    const obj = json as Record<string, string>
    return obj[lang] || obj.en || obj.ar || Object.values(obj)[0] || ''
  }
  return ''
}

type Step = 'review' | 'processing' | 'success'

interface CheckoutClientProps {
  groupId: string
  locale: string
  direction: 'rtl' | 'ltr'
}

export function CheckoutClient({ groupId, locale, direction }: CheckoutClientProps) {
  const router = useRouter()
  const isAr = locale === 'ar'
  const BackArrow = isAr ? ArrowRight : ArrowLeft

  const [data, setData] = useState<CheckoutData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<Step>('review')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [result, setResult] = useState<RegistrationResult | null>(null)

  useEffect(() => {
    getCheckoutData(groupId)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [groupId])

  const handleRegister = useCallback(async () => {
    if (!data || !agreedToTerms) return
    setStep('processing')
    try {
      const res = await registerForGroup(groupId)
      setResult(res)
      setStep('success')
      toast.success(
        isAr
          ? 'تم التسجيل بنجاح! يمكنك الآن المزايدة'
          : 'Registration successful! You can now bid.',
      )
    } catch (err: any) {
      setStep('review')
      toast.error(err.message || (isAr ? 'فشل التسجيل' : 'Registration failed'))
    }
  }, [data, agreedToTerms, groupId, isAr])

  // ── Loading / Error states ─────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-400" />
        <h2 className="text-xl font-bold text-gray-900">
          {isAr ? 'حدث خطأ' : 'Something went wrong'}
        </h2>
        <p className="mt-2 text-gray-500">{error || (isAr ? 'لم يتم العثور على المجموعة' : 'Group not found')}</p>
        <Button onClick={() => router.back()} variant="outline" className="mt-6">
          <BackArrow className="h-4 w-4" />
          {isAr ? 'رجوع' : 'Go back'}
        </Button>
      </div>
    )
  }

  // ── Already registered ─────────────────────────────
  if (data.isAlreadyRegistered && data.existingRegistration) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center"
        >
          <CheckCircle2 className="mx-auto mb-4 h-14 w-14 text-emerald-500" />
          <h2 className="text-2xl font-bold text-emerald-900">
            {isAr ? 'أنت مسجل بالفعل!' : "You're already registered!"}
          </h2>
          <p className="mt-2 text-emerald-700">
            {isAr
              ? `رقم الطلب: ${data.existingRegistration.orderNumber}`
              : `Order: ${data.existingRegistration.orderNumber}`}
          </p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button onClick={() => router.back()}>
              <BackArrow className="h-4 w-4" />
              {isAr ? 'العودة للمزايدة' : 'Back to bid'}
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/registrations">
                <Receipt className="h-4 w-4" />
                {isAr ? 'تسجيلاتي' : 'My Registrations'}
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    )
  }

  const { group, lots, user } = data
  const groupName = getName(group.name, isAr ? 'ar' : 'en')
  const deposit = parseFloat(group.minDeposit)
  const isVip = user.isVip
  const discount = isVip ? deposit : 0
  const charge = deposit - discount
  const tax = parseFloat((charge - charge / 1.05).toFixed(3))
  const total = charge
  const walletBalance = parseFloat(user.walletBalance)
  const hasEnoughBalance = isVip || walletBalance >= total

  // ── Success state ──────────────────────────────────
  if (step === 'success' && result) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-lg"
        >
          {/* Success header */}
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 px-8 py-10 text-center text-white">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            >
              <CheckCircle2 className="mx-auto mb-4 h-16 w-16" />
            </motion.div>
            <h2 className="text-2xl font-bold">
              {isAr ? 'تم التسجيل بنجاح!' : 'Registration Successful!'}
            </h2>
            <p className="mt-2 text-emerald-100">
              {result.isVipFree
                ? isAr
                  ? 'تم التسجيل مجاناً — عضوية VIP'
                  : 'Registered for free — VIP membership'
                : isAr
                  ? 'يمكنك الآن المشاركة في المزايدة'
                  : 'You can now participate in bidding'}
            </p>
          </div>

          {/* Order details */}
          <div className="space-y-4 p-8">
            <div className="rounded-xl bg-gray-50 p-4">
              <div className="grid grid-cols-2 gap-y-3 text-sm">
                <span className="text-gray-500">{isAr ? 'رقم الطلب' : 'Order No.'}</span>
                <span className="font-mono font-bold text-gray-900">{result.orderNumber}</span>

                <span className="text-gray-500">{isAr ? 'مبلغ التأمين' : 'Deposit'}</span>
                <span className="text-gray-900">{formatOMR(parseFloat(result.depositAmount))}</span>

                {result.isVipFree && (
                  <>
                    <span className="text-gray-500">{isAr ? 'خصم VIP' : 'VIP Discount'}</span>
                    <span className="font-medium text-emerald-600">
                      - {formatOMR(parseFloat(result.discountAmount))}
                    </span>
                  </>
                )}

                <span className="text-gray-500">{isAr ? 'الضريبة' : 'Tax (5%)'}</span>
                <span className="text-gray-900">{formatOMR(parseFloat(result.taxAmount))}</span>

                <Separator className="col-span-2 my-1" />

                <span className="font-semibold text-gray-900">{isAr ? 'الإجمالي' : 'Total'}</span>
                <span className="text-lg font-bold text-primary-700">
                  {formatOMR(parseFloat(result.totalAmount))}
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <Button className="flex-1" onClick={() => router.back()}>
                <Gavel className="h-4 w-4" />
                {isAr ? 'ابدأ المزايدة' : 'Start Bidding'}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => downloadReceipt(result.id, isAr ? 'ar' : 'en')}
              >
                <Download className="h-4 w-4" />
                {isAr ? 'تحميل الإيصال' : 'Download Receipt'}
              </Button>
            </div>

            <div className="text-center">
              <Link
                href="/dashboard/registrations"
                className="text-sm text-primary-500 hover:underline"
              >
                {isAr ? 'عرض جميع التسجيلات' : 'View all registrations'}
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    )
  }

  // ── Checkout review ────────────────────────────────
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="mb-6 inline-flex items-center gap-2 text-sm text-gray-500 transition hover:text-gray-900"
      >
        <BackArrow className="h-4 w-4" />
        {isAr ? 'رجوع' : 'Back'}
      </button>

      <h1 className="mb-8 text-2xl font-bold text-gray-900 md:text-3xl">
        {isAr ? 'تسجيل في المزاد' : 'Auction Registration'}
      </h1>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* ─── Left: Group details ─── */}
        <div className="space-y-6 lg:col-span-2">
          {/* Group card */}
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-start gap-4 p-5">
              {group.image && (
                <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-gray-100">
                  <Image
                    src={group.image}
                    alt={groupName}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-gray-900">{groupName}</h2>
                  {isVip && (
                    <Badge className="bg-amber-100 text-amber-700">
                      <Crown className="mr-1 h-3 w-3" /> VIP
                    </Badge>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
                  <span className="inline-flex items-center gap-1">
                    <Store className="h-3.5 w-3.5" />
                    {group.merchantName}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Package className="h-3.5 w-3.5" />
                    {lots.length} {isAr ? 'قطع' : lots.length === 1 ? 'lot' : 'lots'}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
                  <Calendar className="h-3 w-3" />
                  {new Date(group.startDate).toLocaleDateString(isAr ? 'ar-OM' : 'en-GB', {
                    year: 'numeric', month: 'short', day: 'numeric',
                  })}
                  {' — '}
                  {new Date(group.endDate).toLocaleDateString(isAr ? 'ar-OM' : 'en-GB', {
                    year: 'numeric', month: 'short', day: 'numeric',
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Lots list */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-5 py-3">
              <h3 className="text-sm font-semibold text-gray-700">
                {isAr ? 'القطع المشمولة في التسجيل' : 'Lots included in registration'}
              </h3>
            </div>
            <div className="divide-y divide-gray-50">
              {lots.map((lot) => {
                const lotName = getName(lot.name, isAr ? 'ar' : 'en')
                return (
                  <div key={lot.id} className="flex items-center gap-3 px-5 py-3">
                    {lot.featureImage ? (
                      <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                        <Image
                          src={lot.featureImage}
                          alt={lotName}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      </div>
                    ) : (
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100">
                        <Gavel className="h-5 w-5 text-gray-400" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">{lotName}</p>
                      <p className="text-xs text-gray-400">
                        {isAr ? 'الحد الأدنى' : 'Starting'}: {formatOMR(parseFloat(lot.minBidPrice))}
                      </p>
                    </div>
                    <Link
                      href={`/lots/${lot.slug}`}
                      className="text-xs text-primary-500 hover:underline"
                    >
                      {isAr ? 'عرض' : 'View'}
                    </Link>
                  </div>
                )
              })}
            </div>
          </div>

          {/* What you get */}
          <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-5">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-blue-900">
              <ShieldCheck className="h-4 w-4" />
              {isAr ? 'ماذا يشمل التسجيل؟' : 'What does registration include?'}
            </h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" />
                {isAr
                  ? 'فتح المزايدة على جميع القطع في هذه المجموعة'
                  : 'Unlock bidding on all lots in this group'}
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" />
                {isAr
                  ? 'مبلغ التأمين قابل للاسترداد عند عدم الفوز'
                  : 'Deposit is refundable if you don\'t win'}
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" />
                {isAr
                  ? 'إيصال تسجيل بالعربية والإنجليزية'
                  : 'Registration receipt in Arabic & English'}
              </li>
            </ul>
          </div>
        </div>

        {/* ─── Right: Payment summary ─── */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-4">
            {/* Cost summary card */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-sm font-semibold text-gray-700">
                {isAr ? 'ملخص الدفع' : 'Payment Summary'}
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">{isAr ? 'مبلغ التأمين' : 'Deposit Amount'}</span>
                  <span className="font-medium text-gray-900">{formatOMR(deposit)}</span>
                </div>

                {isVip && (
                  <div className="flex justify-between">
                    <span className="inline-flex items-center gap-1 text-amber-600">
                      <Crown className="h-3 w-3" />
                      {isAr ? 'خصم VIP (100%)' : 'VIP Discount (100%)'}
                    </span>
                    <span className="font-medium text-emerald-600">- {formatOMR(discount)}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-gray-500">{isAr ? 'الضريبة (5% شاملة)' : 'Tax (5% incl.)'}</span>
                  <span className="font-medium text-gray-900">{formatOMR(tax)}</span>
                </div>

                <Separator />

                <div className="flex justify-between">
                  <span className="font-semibold text-gray-900">
                    {isAr ? 'الإجمالي' : 'Total'}
                  </span>
                  <span className="text-lg font-bold text-primary-700">{formatOMR(total)}</span>
                </div>
              </div>

              {/* Wallet balance */}
              <div
                className={cn(
                  'mt-4 rounded-xl border px-4 py-3',
                  hasEnoughBalance
                    ? 'border-emerald-200 bg-emerald-50'
                    : 'border-red-200 bg-red-50',
                )}
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5">
                    <Wallet className="h-4 w-4" />
                    {isAr ? 'رصيد المحفظة' : 'Wallet Balance'}
                  </span>
                  <span
                    className={cn(
                      'font-bold',
                      hasEnoughBalance ? 'text-emerald-700' : 'text-red-700',
                    )}
                  >
                    {formatOMR(walletBalance)}
                  </span>
                </div>
                {!hasEnoughBalance && !isVip && (
                  <p className="mt-1.5 text-xs text-red-600">
                    {isAr
                      ? `الرصيد غير كافٍ. تحتاج ${formatOMR(total - walletBalance)} إضافي`
                      : `Insufficient balance. You need ${formatOMR(total - walletBalance)} more`}
                  </p>
                )}
              </div>

              {isVip && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 px-4 py-3 text-center"
                >
                  <Crown className="mx-auto mb-1 h-5 w-5 text-amber-500" />
                  <p className="text-xs font-semibold text-amber-700">
                    {isAr ? 'عضو VIP — التسجيل مجاني' : 'VIP Member — Free Registration'}
                  </p>
                </motion.div>
              )}

              {/* Terms checkbox */}
              <label className="mt-5 flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                />
                <span className="text-xs text-gray-500">
                  {isAr
                    ? 'أوافق على شروط وأحكام المزايدة وأقر بأن جميع المزايدات ملزمة'
                    : 'I agree to the auction terms and conditions and acknowledge that all bids are binding'}
                </span>
              </label>

              {/* Register button */}
              <Button
                className="mt-4 w-full"
                size="lg"
                disabled={!agreedToTerms || (!hasEnoughBalance && !isVip) || step === 'processing'}
                onClick={handleRegister}
              >
                {step === 'processing' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {isAr ? 'جارٍ المعالجة...' : 'Processing...'}
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    {isVip
                      ? isAr
                        ? 'تسجيل مجاني (VIP)'
                        : 'Register Free (VIP)'
                      : isAr
                        ? `سجل الآن — ${formatOMR(total)}`
                        : `Register Now — ${formatOMR(total)}`}
                  </>
                )}
              </Button>

              {!hasEnoughBalance && !isVip && (
                <Button variant="outline" className="mt-2 w-full" asChild>
                  <Link href="/dashboard/wallet">
                    <Wallet className="h-4 w-4" />
                    {isAr ? 'شحن المحفظة' : 'Top up wallet'}
                  </Link>
                </Button>
              )}
            </div>

            {/* Payment method indicator */}
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-center text-xs text-gray-400">
              <Wallet className="mx-auto mb-1 h-4 w-4" />
              {isAr ? 'الدفع من المحفظة' : 'Payment via Wallet'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
