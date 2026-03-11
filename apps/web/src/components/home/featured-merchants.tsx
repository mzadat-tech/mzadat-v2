'use client'

import { useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { ArrowRight, ArrowLeft, MapPin, Package, ChevronLeft, ChevronRight } from 'lucide-react'

interface MerchantData {
  id: string
  name: string
  slug: string
  description: string
  logo: string | null
  logoUrl: string | null
  banner: string | null
  location: string
  productCount: number
}

interface FeaturedMerchantsProps {
  merchants: MerchantData[]
  locale: string
  direction: 'rtl' | 'ltr'
}

export function FeaturedMerchants({ merchants, locale, direction }: FeaturedMerchantsProps) {
  const isAr = locale === 'ar'
  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight
  const scrollRef = useRef<HTMLDivElement>(null)

  if (!merchants.length) return null

  // Sort by product count (highest first) and take top 12
  const sorted = [...merchants]
    .sort((a, b) => b.productCount - a.productCount)
    .slice(0, 12)

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return
    const amount = 240
    scrollRef.current.scrollBy({
      left: dir === 'left' ? -amount : amount,
      behavior: 'smooth',
    })
  }

  return (
    <section className="py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {isAr ? 'تجار مميزون' : 'Featured Merchants'}
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {isAr ? 'تجار موثوقون على منصتنا' : 'Trusted sellers on our platform'}
            </p>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <button
              onClick={() => scroll('left')}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary-200 hover:bg-primary-50 hover:text-foreground"
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary-200 hover:bg-primary-50 hover:text-foreground"
              aria-label="Scroll right"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <Link
              href="/shops"
              className="ms-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 transition-colors hover:text-primary-700"
            >
              {isAr ? 'عرض الكل' : 'View All'}
              <ArrowIcon className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Carousel */}
        <div className="relative">
          <div
            ref={scrollRef}
            className="scrollbar-hide flex gap-4 overflow-x-auto scroll-smooth py-4"
          >
            {sorted.map((merchant, i) => (
              <MerchantCard
                key={merchant.id}
                merchant={merchant}
                locale={locale}
                direction={direction}
                index={i}
              />
            ))}
          </div>
        </div>

        {/* Mobile View All */}
        <div className="mt-6 flex justify-center sm:hidden">
          <Link
            href="/shops"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600"
          >
            {isAr ? 'عرض جميع التجار' : 'View All Merchants'}
            <ArrowIcon className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  )
}

function MerchantCard({
  merchant,
  locale,
  direction,
  index,
}: {
  merchant: MerchantData
  locale: string
  direction: 'rtl' | 'ltr'
  index: number
}) {
  const isAr = locale === 'ar'
  const logoSrc = merchant.logoUrl || merchant.logo

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      className="w-[200px] shrink-0"
    >
      <Link
        href={`/shops/${merchant.slug || merchant.id}`}
        className="group flex flex-col items-center rounded-2xl border border-border bg-white p-6 text-center transition-all duration-300 hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md"
      >
        {/* Logo */}
        <div className="mb-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-border bg-muted transition-colors group-hover:border-primary-200">
          {logoSrc ? (
            <Image
              src={logoSrc}
              alt={merchant.name}
              width={64}
              height={64}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-xl font-bold text-primary-300">
              {merchant.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        {/* Name */}
        <h3 className="text-sm font-semibold text-foreground line-clamp-1 transition-colors group-hover:text-primary-700">
          {merchant.name}
        </h3>

        {/* Location */}
        {merchant.location && (
          <span className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {merchant.location}
          </span>
        )}

        {/* Lot count */}
        <span className="mt-2 flex items-center gap-1 text-xs font-medium text-primary-600">
          <Package className="h-3 w-3" />
          {merchant.productCount} {isAr ? 'قطعة' : 'Lots'}
        </span>
      </Link>
    </motion.div>
  )
}
