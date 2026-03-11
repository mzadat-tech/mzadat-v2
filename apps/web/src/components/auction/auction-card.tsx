'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  Heart,
  MapPin,
  Gavel,
  ArrowUpLeft,
  ArrowUpRight,
  Timer,
  Users,
  Tag,
  Store,
  CalendarClock,
  Shield,
} from 'lucide-react'
import { Badge } from '@mzadat/ui/components/badge'
import { cn, formatOMR } from '@mzadat/ui/lib/utils'
import { useCountdown } from '@/hooks/use-countdown'
import type { ProductCard } from '@/lib/data'

interface AuctionCardProps {
  product: ProductCard
  locale: string
  direction: 'rtl' | 'ltr'
  index?: number
  /** Whether the current user has paid deposit for this product's group */
  depositPaid?: boolean
  /** Whether the current user is logged in */
  isLoggedIn?: boolean
}

export function AuctionCard({ product, locale, direction, index = 0, depositPaid = false, isLoggedIn = false }: AuctionCardProps) {
  const [isFav, setIsFav] = useState(false)
  const [imgError, setImgError] = useState(false)
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  const isLive = product.status === 'live'
  const isUpcoming = product.status === 'upcoming'

  // Use endDate for live, startDate for upcoming
  const countdownTarget = isLive ? product.endDate : isUpcoming ? product.startDate : null
  const timeLeft = useCountdown(countdownTarget)
  const isEnded = timeLeft.total <= 0 && isLive

  const ArrowIcon = direction === 'rtl' ? ArrowUpLeft : ArrowUpRight

  // Timer styling based on status
  const timerLabel = isLive
    ? locale === 'ar' ? 'ينتهي بعد' : 'Ends in'
    : isUpcoming
      ? locale === 'ar' ? 'يبدأ بعد' : 'Starts in'
      : ''

  const TimerIcon = isLive ? Timer : CalendarClock

  const timerBg = isLive
    ? timeLeft.total < 3600000 ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'
    : 'bg-blue-50 border-blue-100'

  const timerIconColor = isLive
    ? timeLeft.total < 3600000 ? 'text-red-500' : 'text-emerald-500'
    : 'text-blue-500'

  const timerLabelColor = isLive
    ? timeLeft.total < 3600000 ? 'text-red-600' : 'text-emerald-600'
    : 'text-blue-600'

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: 'easeOut' }}
      whileHover={{ y: -4 }}
      className="group"
    >
      <Link
        href={`/auctions/${product.slug}`}
        className="block overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition-shadow hover:shadow-lg"
      >
        {/* Image */}
        <div className="relative aspect-[4/2.75] overflow-hidden bg-muted">
          {product.image && !imgError ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Gavel className="h-12 w-12 text-muted-foreground/30" />
            </div>
          )}

          {/* Badges — top right */}
          <div className="absolute inset-e-3 top-3 flex flex-col items-end gap-1.5">
            {isLive && !isEnded && (
              <Badge className="bg-emerald-500 text-white shadow-md">
                <span className="me-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                {locale === 'ar' ? 'مباشر' : 'Live'}
              </Badge>
            )}
            {isUpcoming && (
              <Badge className="bg-amber-500 text-white shadow-md">
                <CalendarClock className="me-1 h-3 w-3" />
                {locale === 'ar' ? 'قريباً' : 'Upcoming'}
              </Badge>
            )}
            {isEnded && (
              <Badge variant="secondary" className="bg-gray-800 text-white">
                {locale === 'ar' ? 'انتهى' : 'Ended'}
              </Badge>
            )}
            {product.saleType === 'direct' && (
              <Badge className="bg-primary-600 text-white">
                <Tag className="me-1 h-3 w-3" />
                {locale === 'ar' ? 'بيع مباشر' : 'Direct Sale'}
              </Badge>
            )}
          </div>

          {/* Category badge */}
          {product.categoryName && (
            <div className="absolute bottom-3 inset-s-3">
              <Badge variant="secondary" className="bg-white/90 text-foreground backdrop-blur-sm">
                {product.categoryName}
              </Badge>
            </div>
          )}

          {/* Favorite */}
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setIsFav(!isFav)
            }}
            className="absolute inset-s-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-foreground backdrop-blur-sm transition-all hover:bg-white hover:scale-110"
            aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart
              className={cn(
                'h-4 w-4 transition-colors',
                isFav ? 'fill-accent-500 text-accent-500' : 'text-muted-foreground',
              )}
            />
          </button>

          {/* Bid Count Overlay */}
          {product.bidCount > 0 && (
            <div className="absolute bottom-3 inset-e-3 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
              <Users className="h-3 w-3" />
              {product.bidCount} {locale === 'ar' ? 'مزايدة' : 'bids'}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Store & Location */}
          <div className="mb-2 flex items-center justify-between">
            {product.storeName && (
              <span className="flex items-center gap-1 text-xs font-medium text-primary-600">
                <Store className="h-3 w-3" />
                {product.storeName}
              </span>
            )}
            {product.location && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {product.location}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="mb-3 line-clamp-2 text-sm font-semibold leading-snug text-foreground">
            {product.name}
          </h3>

          {/* Prices */}
          <div className={cn('mb-3 gap-2', isUpcoming ? '' : 'grid grid-cols-2')}>
            {/* Starting Bid — always show */}
            <div className={cn('rounded-lg bg-muted/50 px-2.5 py-2', isUpcoming && 'w-full')}>
              <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                <Gavel className="h-2.5 w-2.5" />
                {locale === 'ar' ? 'سعر البداية' : 'Starting Bid'}
              </p>
              <p className="truncate text-sm font-bold text-foreground">
                {formatOMR(product.startingPrice)}
              </p>
            </div>
            {/* Current Bid — only for live/ended lots (not upcoming) */}
            {!isUpcoming && (
              <div className="rounded-lg bg-primary-50 px-2.5 py-2">
                <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-primary-600">
                  <Tag className="h-2.5 w-2.5" />
                  {isEnded
                    ? locale === 'ar' ? 'المزايدة النهائية' : 'Final Bid'
                    : locale === 'ar' ? 'المزايدة الحالية' : 'Current Bid'}
                </p>
                <p className="truncate text-sm font-bold text-primary-700">
                  {formatOMR(product.currentBid || product.startingPrice)}
                </p>
              </div>
            )}
          </div>

          {/* Countdown Timer — Ends in (live) / Starts in (upcoming) */}
          {(isLive || isUpcoming) && !isEnded && (
            <div className={cn('mb-3 rounded-lg border p-2.5', timerBg)}>
              <div className="mb-1.5 flex items-center gap-1.5">
                <TimerIcon className={cn('h-3.5 w-3.5', timerIconColor)} />
                <span className={cn('text-[10px] font-semibold uppercase tracking-wider', timerLabelColor)}>
                  {timerLabel}
                </span>
              </div>
              {hasMounted ? (
                <div className="grid grid-cols-4 gap-1">
                  <CountdownUnit value={timeLeft.days} label={locale === 'ar' ? 'يوم' : 'Days'} status={isLive ? 'live' : 'upcoming'} urgent={isLive && timeLeft.total < 3600000} />
                  <CountdownUnit value={timeLeft.hours} label={locale === 'ar' ? 'ساعة' : 'Hrs'} status={isLive ? 'live' : 'upcoming'} urgent={isLive && timeLeft.total < 3600000} />
                  <CountdownUnit value={timeLeft.minutes} label={locale === 'ar' ? 'دقيقة' : 'Min'} status={isLive ? 'live' : 'upcoming'} urgent={isLive && timeLeft.total < 3600000} />
                  <CountdownUnit value={timeLeft.seconds} label={locale === 'ar' ? 'ثانية' : 'Sec'} status={isLive ? 'live' : 'upcoming'} urgent={isLive && timeLeft.total < 3600000} />
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-1">
                  <CountdownUnit value={0} label={locale === 'ar' ? 'يوم' : 'Days'} status={isLive ? 'live' : 'upcoming'} />
                  <CountdownUnit value={0} label={locale === 'ar' ? 'ساعة' : 'Hrs'} status={isLive ? 'live' : 'upcoming'} />
                  <CountdownUnit value={0} label={locale === 'ar' ? 'دقيقة' : 'Min'} status={isLive ? 'live' : 'upcoming'} />
                  <CountdownUnit value={0} label={locale === 'ar' ? 'ثانية' : 'Sec'} status={isLive ? 'live' : 'upcoming'} />
                </div>
              )}
            </div>
          )}

          {/* Group badge */}
          {product.groupName && (
            <div className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Gavel className="h-3 w-3" />
              <span>{product.groupName}</span>
            </div>
          )}

          {/* CTA */}
          <div className="pt-3">
            {isEnded ? (
              <div className="flex items-center justify-center gap-1.5 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-muted-foreground transition-colors group-hover:bg-gray-200 group-hover:text-foreground h-10">
                {locale === 'ar' ? 'عرض النتائج' : 'View Results'}
                <ArrowIcon className="h-3.5 w-3.5" />
              </div>
            ) : (!isLoggedIn || !depositPaid) ? (
              /* User not logged in or deposit not paid → Pay Deposit (amber) */
              <div className="flex items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-all group-hover:bg-amber-600 group-hover:shadow-md h-10">
                <Shield className="h-3.5 w-3.5" />
                {locale === 'ar' ? 'ادفع التأمين' : 'Pay Deposit'}
                <ArrowIcon className="h-3.5 w-3.5" />
              </div>
            ) : (
              /* Deposit paid → Bid Now / Auction Details (primary green) */
              <div className="flex items-center justify-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-all group-hover:bg-primary-700 group-hover:shadow-md h-10">
                <Gavel className="h-3.5 w-3.5" />
                {isUpcoming
                  ? locale === 'ar' ? 'تفاصيل المزاد' : 'Auction Details'
                  : locale === 'ar' ? 'زايد الآن' : 'Bid Now'}
                <ArrowIcon className="h-3.5 w-3.5" />
              </div>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

function CountdownUnit({
  value,
  label,
  status,
  urgent,
}: {
  value: number
  label: string
  status: 'live' | 'upcoming'
  urgent?: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-md px-1 py-1.5 text-center',
        urgent
          ? 'bg-red-100/80'
          : status === 'live'
            ? 'bg-emerald-100/60'
            : 'bg-blue-100/60',
      )}
    >
      <div
        className={cn(
          'text-sm font-bold tabular-nums',
          urgent
            ? 'text-red-700'
            : status === 'live'
              ? 'text-emerald-700'
              : 'text-blue-700',
        )}
      >
        {String(value).padStart(2, '0')}
      </div>
      <div className="text-[9px] font-medium text-muted-foreground">{label}</div>
    </div>
  )
}
