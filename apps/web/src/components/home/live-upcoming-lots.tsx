'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, ArrowLeft, Flame, Clock } from 'lucide-react'
import { AuctionCard } from '@/components/auction/auction-card'
import type { ProductCard } from '@/lib/data'

interface LiveUpcomingLotsProps {
  liveProducts: ProductCard[]
  upcomingProducts: ProductCard[]
  locale: string
  direction: 'rtl' | 'ltr'
}

export function LiveUpcomingLots({ liveProducts, upcomingProducts, locale, direction }: LiveUpcomingLotsProps) {
  const isAr = locale === 'ar'
  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight
  const hasLive = liveProducts.length > 0
  const hasUpcoming = upcomingProducts.length > 0

  if (!hasLive && !hasUpcoming) return null

  return (
    <section className="py-14 lg:py-18">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Live Lots */}
        {hasLive && (
          <div className="mb-14">
            {/* Header */}
            <div className="mb-8 flex items-end justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <Flame className="h-4 w-4 text-accent-500" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-accent-500">
                    {isAr ? 'مزايدة الآن' : 'Bid Now'}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-foreground sm:text-2xl">
                  {isAr ? 'قطع مزاد مباشرة' : 'Live Auction Lots'}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {isAr ? 'قطع متاحة للمزايدة الآن' : 'Lots currently open for bidding'}
                </p>
              </div>
              <Link
                href="/auctions?status=live"
                className="hidden items-center gap-1.5 text-sm font-medium text-primary-600 transition-colors hover:text-primary-700 sm:flex"
              >
                {isAr ? 'عرض الكل' : 'View All'}
                <ArrowIcon className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 py-4">
              {liveProducts.slice(0, 8).map((product, i) => (
                <AuctionCard key={product.id} product={product} locale={locale} direction={direction} index={i} />
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Lots */}
        {hasUpcoming && (
          <div>
            {/* Header */}
            <div className="mb-8 flex items-end justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-amber-600">
                    {isAr ? 'قريبًا' : 'Coming Soon'}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-foreground sm:text-2xl">
                  {isAr ? 'قطع مزاد قادمة' : 'Upcoming Auction Lots'}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {isAr ? 'استعد للمزايدة على هذه القطع' : 'Get ready to bid on these lots'}
                </p>
              </div>
              <Link
                href="/auctions?status=upcoming"
                className="hidden items-center gap-1.5 text-sm font-medium text-primary-600 transition-colors hover:text-primary-700 sm:flex"
              >
                {isAr ? 'عرض الكل' : 'View All'}
                <ArrowIcon className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 py-4">
              {upcomingProducts.slice(0, 4).map((product, i) => (
                <AuctionCard key={product.id} product={product} locale={locale} direction={direction} index={i} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
