'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Gavel, Shield, TrendingUp } from 'lucide-react'
import { Button } from '@mzadat/ui'

interface HeroSectionProps {
  locale: string
  direction: 'rtl' | 'ltr'
}

export function HeroSection({ locale, direction }: HeroSectionProps) {
  const isAr = locale === 'ar'
  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700">
      {/* Decorative grid */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      {/* Decorative orbs */}
      <motion.div
        className="absolute -start-32 -top-32 h-96 w-96 rounded-full bg-primary-400/10 blur-3xl"
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -bottom-32 -end-32 h-96 w-96 rounded-full bg-accent-500/10 blur-3xl"
        animate={{ scale: [1.2, 1, 1.2], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
      />

      <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-36">
        <div className="mx-auto max-w-3xl text-center">
          {/* Pre-title badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium text-white/90 backdrop-blur-sm"
          >
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            {isAr ? 'مزادات مباشرة الآن' : 'Live Auctions Now'}
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl"
          >
            {isAr ? (
              <>
                منصة المزادات
                <br />
                <span className="text-primary-300">الأولى في سلطنة عُمان</span>
              </>
            ) : (
              <>
                The Premier Auction
                <br />
                <span className="text-primary-300">Platform in Oman</span>
              </>
            )}
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-white/70"
          >
            {isAr
              ? 'شارك في مزادات حصرية وبيع مباشر لمجموعة متنوعة من المنتجات والأصول بشفافية تامة'
              : 'Participate in exclusive auctions and direct sales across a diverse range of products and assets with complete transparency'}
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Button
              size="lg"
              asChild
              className="min-w-[180px] bg-white text-primary-900 shadow-xl hover:bg-white/90"
            >
              <Link href="/auctions" className="gap-2">
                {isAr ? 'تصفح المزادات' : 'Browse Auctions'}
                <ArrowIcon className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="min-w-[180px] border-white/30 text-white hover:bg-white/10"
            >
              <Link href="/auth/register">
                {isAr ? 'سجل مجاناً' : 'Register Free'}
              </Link>
            </Button>
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="mt-14 grid grid-cols-3 gap-6 border-t border-white/10 pt-10"
          >
            <TrustItem
              icon={<Gavel className="h-5 w-5" />}
              value="500+"
              label={isAr ? 'مزاد مكتمل' : 'Auctions Completed'}
            />
            <TrustItem
              icon={<Shield className="h-5 w-5" />}
              value="100%"
              label={isAr ? 'شفافية كاملة' : 'Full Transparency'}
            />
            <TrustItem
              icon={<TrendingUp className="h-5 w-5" />}
              value="10K+"
              label={isAr ? 'مستخدم نشط' : 'Active Users'}
            />
          </motion.div>
        </div>
      </div>

      {/* Bottom wave */}
      <div className="absolute -bottom-px left-0 right-0">
        <svg viewBox="0 0 1440 80" fill="none" className="w-full text-background">
          <path
            d="M0 80V40C360 0 720 0 1080 40C1260 60 1440 80 1440 80H0Z"
            fill="currentColor"
          />
        </svg>
      </div>
    </section>
  )
}

function TrustItem({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode
  value: string
  label: string
}) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-primary-300">
        {icon}
      </div>
      <div className="text-xl font-bold text-white sm:text-2xl">{value}</div>
      <div className="mt-0.5 text-xs text-white/60 sm:text-sm">{label}</div>
    </div>
  )
}
