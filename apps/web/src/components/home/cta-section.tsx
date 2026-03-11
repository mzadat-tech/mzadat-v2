'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@mzadat/ui'

interface CTASectionProps {
  locale: string
  direction: 'rtl' | 'ltr'
}

export function CTASection({ locale, direction }: CTASectionProps) {
  const isAr = locale === 'ar'
  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight

  return (
    <section className="py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 p-8 sm:p-12 lg:p-16"
        >
          {/* Decorative */}
          <div className="absolute -end-20 -top-20 h-64 w-64 rounded-full bg-primary-600/20 blur-3xl" />
          <div className="absolute -bottom-20 -start-20 h-64 w-64 rounded-full bg-accent-500/10 blur-3xl" />

          <div className="relative mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
              {isAr ? 'ابدأ تجربة المزايدة الآن' : 'Start Your Auction Journey'}
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-lg text-white/70">
              {isAr
                ? 'سجل الآن واستمتع بتجربة مزايدة سريعة وشفافة على مجموعة متنوعة من المنتجات'
                : 'Register now and enjoy a fast, transparent bidding experience across a diverse range of products'}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                size="lg"
                asChild
                className="min-w-[180px] bg-white text-primary-900 shadow-xl hover:bg-white/90"
              >
                <Link href="/auth/register" className="gap-2">
                  {isAr ? 'سجل مجاناً' : 'Register Free'}
                  <ArrowIcon className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="min-w-[180px] border-white/30 text-white hover:bg-white/10"
              >
                <Link href="/auctions">
                  {isAr ? 'تصفح المزادات' : 'Browse Auctions'}
                </Link>
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
