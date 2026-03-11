'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@mzadat/ui'
import { AuctionCard } from '@/components/auction/auction-card'
import type { ProductCard } from '@/lib/data'

interface LiveAuctionsSectionProps {
  products: ProductCard[]
  locale: string
  direction: 'rtl' | 'ltr'
}

export function LiveAuctionsSection({ products, locale, direction }: LiveAuctionsSectionProps) {
  const isAr = locale === 'ar'
  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight

  if (products.length === 0) return null

  return (
    <section className="py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-10 flex items-end justify-between"
        >
          <div>
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                <Sparkles className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium text-emerald-600">
                {isAr ? 'مزادات مباشرة' : 'Live Now'}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
              {isAr ? 'المزادات النشطة' : 'Active Auctions'}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {isAr
                ? 'شارك في أحدث المزادات المتاحة الآن'
                : 'Participate in the latest available auctions'}
            </p>
          </div>

          <Button variant="outline" size="sm" asChild className="hidden sm:flex">
            <Link href="/auctions/live" className="gap-1.5">
              {isAr ? 'عرض الكل' : 'View All'}
              <ArrowIcon className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </motion.div>

        {/* Auction Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 py-4">
          {products.map((product, index) => (
            <AuctionCard
              key={product.id}
              product={product}
              locale={locale}
              direction={direction}
              index={index}
            />
          ))}
        </div>

        {/* Mobile View All */}
        <div className="mt-8 text-center sm:hidden">
          <Button variant="outline" asChild>
            <Link href="/auctions/live" className="gap-1.5">
              {isAr ? 'عرض جميع المزادات' : 'View All Auctions'}
              <ArrowIcon className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
