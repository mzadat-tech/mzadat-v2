'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  Gavel,
  Timer,
  CalendarClock,
  MapPin,
  Share2,
  Shield,
  Eye,
  Tag,
  Users,
  Layers,
  Calendar,
  Search,
} from 'lucide-react'
import { Badge } from '@mzadat/ui/components/badge'
import { cn, formatOMR } from '@mzadat/ui/lib/utils'
import { useCountdown } from '@/hooks/use-countdown'
import type { StoreLot } from '@/lib/data'

interface LotRowCardProps {
  lot: StoreLot
  locale: string
  direction: 'rtl' | 'ltr'
  index?: number
  depositPaid?: boolean
  isLoggedIn?: boolean
}

/** Format a date string to "Mar 9" style */
function fmtDate(d: string | null, locale: string): string {
  if (!d) return ''
  const date = new Date(d)
  return date.toLocaleDateString(locale === 'ar' ? 'ar-OM' : 'en-GB', {
    month: 'short',
    day: 'numeric',
  })
}

/** Format a date string to "Mar 9, 8AM" style */
function fmtDateTime(d: string | null, locale: string): string {
  if (!d) return ''
  const date = new Date(d)
  return date.toLocaleDateString(locale === 'ar' ? 'ar-OM' : 'en-GB', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    hour12: true,
  })
}

export function LotRowCard({
  lot,
  locale,
  direction,
  index = 0,
  depositPaid = false,
  isLoggedIn = false,
}: LotRowCardProps) {
  const [imgError, setImgError] = useState(false)
  const isAr = locale === 'ar'
  const isLive = lot.status === 'live'
  const isUpcoming = lot.status === 'upcoming'
  const isEnded = lot.status === 'ended'

  const countdownTarget = isLive ? lot.endDate : isUpcoming ? lot.startDate : null
  const timeLeft = useCountdown(countdownTarget)
  const hasEnded = timeLeft.total <= 0 && isLive

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (navigator.share) {
      navigator.share({ title: lot.name, url: `/auctions/${lot.slug}` })
    } else {
      navigator.clipboard.writeText(`${window.location.origin}/auctions/${lot.slug}`)
    }
  }

  const handleLocation = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (lot.location) {
      window.open(lot.location, '_blank', 'noopener')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
    >
      <Link
        href={`/auctions/${lot.slug}`}
        className="group flex flex-col overflow-hidden rounded-xl border border-border bg-white transition-all hover:border-primary-200 hover:shadow-md sm:flex-row"
      >
        {/* ── Left: Image + Badges ── */}
        <div className="relative h-44 w-full shrink-0 overflow-hidden bg-muted sm:h-auto sm:w-48 md:w-56">
          {lot.featureImage && !imgError ? (
            <Image
              src={lot.featureImage}
              alt={lot.name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, 224px"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Gavel className="h-10 w-10 text-muted-foreground/30" />
            </div>
          )}

          {/* Status badges */}
          <div className="absolute inset-s-2 top-2 flex flex-col gap-1">
            {isLive && !hasEnded && (
              <Badge className="bg-emerald-500 text-white shadow-sm text-[10px] px-1.5 py-0.5">
                <span className="me-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                {isAr ? 'مباشر' : 'Live'}
              </Badge>
            )}
            {isUpcoming && (
              <Badge className="bg-amber-500 text-white shadow-sm text-[10px] px-1.5 py-0.5">
                <CalendarClock className="me-1 h-2.5 w-2.5" />
                {isAr ? 'قريباً' : 'Upcoming'}
              </Badge>
            )}
            {(isEnded || hasEnded) && (
              <Badge variant="secondary" className="bg-gray-800 text-white text-[10px] px-1.5 py-0.5">
                {isAr ? 'انتهى' : 'Ended'}
              </Badge>
            )}
            {lot.saleType === 'direct' && (
              <Badge className="bg-primary-600 text-white text-[10px] px-1.5 py-0.5">
                <Tag className="me-1 h-2.5 w-2.5" />
                {isAr ? 'بيع مباشر' : 'Direct'}
              </Badge>
            )}
          </div>

          {/* Bid count overlay */}
          {lot.bidCount > 0 && (
            <div className="absolute bottom-2 inset-e-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
              <Users className="h-2.5 w-2.5" />
              {lot.bidCount}
            </div>
          )}
        </div>

        {/* ── Center: Info + Dates ── */}
        <div className="relative flex min-w-0 flex-1 flex-col p-3 sm:p-4">
          {/* Title + Meta */}
          <div>
            <h3 className="line-clamp-1 text-sm font-semibold text-foreground group-hover:text-primary-700 sm:text-base">
              {lot.name}
            </h3>

            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
              {lot.merchantName && (
                <span className="flex items-center gap-1">
                  <span className="h-1 w-1 rounded-full bg-primary-400" />
                  {lot.merchantName}
                </span>
              )}
              {lot.groupName && (
                <span className="flex items-center gap-1">
                  <Layers className="h-3 w-3" />
                  {lot.groupName}
                </span>
              )}
              {lot.categoryName && (
                <span className="flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  {lot.categoryName}
                </span>
              )}
            </div>
          </div>

          {/* Date pills — Auction + Inspection */}
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {/* Auction Date Range */}
            {lot.startDate && lot.endDate && (
              <div
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg border px-2 py-1',
                  isLive && !hasEnded
                    ? 'border-emerald-200 bg-emerald-50'
                    : isUpcoming
                      ? 'border-blue-200 bg-blue-50'
                      : 'border-border bg-muted/40',
                )}
              >
                <Gavel
                  className={cn(
                    'size-3 shrink-0',
                    isLive && !hasEnded
                      ? 'text-emerald-500'
                      : isUpcoming
                        ? 'text-blue-500'
                        : 'text-muted-foreground',
                  )}
                />
                <span
                  className={cn(
                    'text-[10px] font-semibold',
                    isLive && !hasEnded
                      ? 'text-emerald-700'
                      : isUpcoming
                        ? 'text-blue-700'
                        : 'text-muted-foreground',
                  )}
                >
                  {fmtDateTime(lot.startDate, locale)}
                </span>
                <span className="text-[10px] text-muted-foreground/60">→</span>
                <span
                  className={cn(
                    'text-[10px] font-semibold',
                    isLive && !hasEnded
                      ? 'text-emerald-700'
                      : isUpcoming
                        ? 'text-blue-700'
                        : 'text-muted-foreground',
                  )}
                >
                  {fmtDateTime(lot.endDate, locale)}
                </span>
              </div>
            )}

            {/* Countdown timer (compact) */}
            {(isLive || isUpcoming) && !hasEnded && timeLeft.total > 0 && (
              <div
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg border px-2 py-1',
                  isLive
                    ? timeLeft.total < 3600000
                      ? 'border-red-200 bg-red-50'
                      : 'border-emerald-200 bg-emerald-50'
                    : 'border-blue-200 bg-blue-50',
                )}
              >
                <Timer
                  className={cn(
                    'size-3 shrink-0',
                    isLive
                      ? timeLeft.total < 3600000
                        ? 'text-red-500'
                        : 'text-emerald-500'
                      : 'text-blue-500',
                  )}
                />
                <span
                  className={cn(
                    'text-[10px] font-bold tabular-nums',
                    isLive
                      ? timeLeft.total < 3600000
                        ? 'text-red-700'
                        : 'text-emerald-700'
                      : 'text-blue-700',
                  )}
                >
                  {timeLeft.days > 0 && `${timeLeft.days}d `}
                  {String(timeLeft.hours).padStart(2, '0')}:
                  {String(timeLeft.minutes).padStart(2, '0')}:
                  {String(timeLeft.seconds).padStart(2, '0')}
                </span>
              </div>
            )}
          </div>

          {/* Action buttons — absolute bottom-right */}
          <div className="mt-auto flex items-center gap-0.5 pt-1 sm:absolute sm:bottom-3 sm:inset-e-3 sm:mt-0 sm:pt-0">
            {lot.location && (
              <button
                onClick={handleLocation}
                className="flex items-center gap-1 rounded-md p-1.5 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
                title={isAr ? 'عرض الموقع' : 'View Location'}
              >
                <MapPin className="size-3.5" />
              </button>
            )}
            <button
              onClick={handleShare}
              className="flex items-center gap-1 rounded-md p-1.5 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
              title={isAr ? 'مشاركة' : 'Share'}
            >
              <Share2 className="size-3.5" />
            </button>
          </div>
        </div>

        {/* ── Right: Pricing + CTA ── */}
        <div className="flex shrink-0 flex-row items-center gap-2 border-t border-border px-3 py-3 sm:w-44 sm:flex-col sm:items-stretch sm:justify-center sm:gap-1.5 sm:border-t-0 sm:border-s sm:px-3 sm:py-3 md:w-48">
          {/* Starting Bid */}
          <div className="min-w-0 flex-1 sm:flex-none">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {isAr ? 'سعر البداية' : 'Starting Bid'}
            </p>
            <p className="truncate text-sm font-bold text-foreground" title={formatOMR(Number(lot.minBidPrice) || Number(lot.price))}>
              {formatOMR(Number(lot.minBidPrice) || Number(lot.price))}
            </p>
          </div>

          {/* Current Bid (for live/ended) */}
          {!isUpcoming && Number(lot.currentBid) > 0 && (
            <div className="min-w-0 flex-1 sm:flex-none">
              <p className="text-[10px] font-medium uppercase tracking-wider text-primary-600">
                {isEnded || hasEnded
                  ? isAr ? 'المزايدة النهائية' : 'Final Bid'
                  : isAr ? 'المزايدة الحالية' : 'Current Bid'}
              </p>
              <p className="truncate text-sm font-bold text-primary-700" title={formatOMR(Number(lot.currentBid))}>
                {formatOMR(Number(lot.currentBid))}
              </p>
            </div>
          )}

          {/* Deposit */}
          <div className="min-w-0 flex-1 sm:flex-none">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {isAr ? 'التأمين' : 'Deposit'}
            </p>
            <p className="truncate text-xs font-semibold text-foreground">
              {lot.minDepositType === 'percentage'
                ? `${lot.minDeposit}%`
                : formatOMR(Number(lot.minDeposit))}
            </p>
          </div>

          {/* CTA Button */}
          <div className="shrink-0 sm:pt-1">
            {isEnded || hasEnded ? (
              <div className="flex items-center justify-center gap-1.5 rounded-lg bg-gray-100 px-3 py-2 text-xs font-medium text-muted-foreground transition-colors group-hover:bg-gray-200 h-9">
                <Eye className="h-3.5 w-3.5" />
                {isAr ? 'عرض' : 'View'}
              </div>
            ) : !isLoggedIn || !depositPaid ? (
              <div className="flex items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-all group-hover:bg-amber-600 h-9">
                <Shield className="h-3.5 w-3.5" />
                {isAr ? 'ادفع التأمين' : 'Pay Deposit'}
              </div>
            ) : (
              <div className="flex items-center justify-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-all group-hover:bg-primary-700 h-9">
                <Gavel className="h-3.5 w-3.5" />
                {isUpcoming
                  ? isAr ? 'التفاصيل' : 'Details'
                  : isAr ? 'زايد الآن' : 'Bid Now'}
              </div>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
