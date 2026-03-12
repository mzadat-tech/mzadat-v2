'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { ArrowRight, ArrowLeft, Users, Calendar, Gavel } from 'lucide-react'
import { Badge } from '@mzadat/ui/components/badge'
import { cn } from '@mzadat/ui/lib/utils'
import { useCountdown } from '@/hooks/use-countdown'
import type { AuctionGroup } from '@/lib/data'

interface LiveGroupsProps {
  groups: AuctionGroup[]
  locale: string
  direction: 'rtl' | 'ltr'
}

export function LiveGroups({ groups, locale, direction }: LiveGroupsProps) {
  const isAr = locale === 'ar'
  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight

  if (!groups.length) return null

  return (
    <section className="bg-gray-50/80 py-14 lg:py-18">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-end justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
                {isAr ? 'مباشر الآن' : 'Live Now'}
              </span>
            </div>
            <h2 className="text-xl font-bold text-foreground sm:text-2xl">
              {isAr ? 'المزادات المباشرة' : 'Live Auction Groups'}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {isAr ? 'مجموعات مزادات نشطة يمكنك المشاركة فيها' : 'Active auction groups open for bidding'}
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

        {/* Groups Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.slice(0, 6).map((group, i) => (
            <GroupCard key={group.id} group={group} locale={locale} direction={direction} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}

function GroupCard({
  group,
  locale,
  direction,
  index,
}: {
  group: AuctionGroup
  locale: string
  direction: 'rtl' | 'ltr'
  index: number
}) {
  const isAr = locale === 'ar'
  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight
  const timeLeft = useCountdown(group.endDate)
  const isLive = group.status === 'active' || group.status === 'live'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35, delay: index * 0.06 }}
    >
      <Link
        href={group.storeSlug ? `/store/${group.storeSlug}?group=${group.id}` : `/auctions?group=${group.slug}`}
        className="group block overflow-hidden rounded-2xl border border-border bg-white transition-all hover:-translate-y-0.5 hover:shadow-lg"
      >
        {/* Image */}
        <div className="relative aspect-[16/9] overflow-hidden bg-muted">
          {group.image ? (
            <Image
              src={group.image}
              alt={group.name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary-100 to-primary-50">
              <Gavel className="h-10 w-10 text-primary-300" />
            </div>
          )}

          {/* Live badge */}
          {isLive && (
            <div className="absolute start-3 top-3">
              <Badge className="bg-emerald-500 text-white shadow-md">
                <span className="me-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                {isAr ? 'مباشر' : 'Live'}
              </Badge>
            </div>
          )}

          {/* Countdown overlay */}
          {isLive && timeLeft.total > 0 && (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-8">
              <div className="flex justify-center gap-2">
                <TimeUnit value={timeLeft.days} label={isAr ? 'يوم' : 'D'} />
                <span className="self-start pt-1 text-sm font-bold text-white/70">:</span>
                <TimeUnit value={timeLeft.hours} label={isAr ? 'ساعة' : 'H'} />
                <span className="self-start pt-1 text-sm font-bold text-white/70">:</span>
                <TimeUnit value={timeLeft.minutes} label={isAr ? 'د' : 'M'} />
                <span className="self-start pt-1 text-sm font-bold text-white/70">:</span>
                <TimeUnit value={timeLeft.seconds} label={isAr ? 'ث' : 'S'} urgent={timeLeft.total < 3600000} />
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="mb-2 text-sm font-semibold text-foreground line-clamp-1 group-hover:text-primary-700">
            {group.name}
          </h3>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Gavel className="h-3 w-3" />
              {group.productCount} {isAr ? 'قطعة' : 'lots'}
            </span>
            {group.inspectionEndDate && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {isAr ? 'معاينة متاحة' : 'Inspection available'}
              </span>
            )}
          </div>

          {/* CTA */}
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
            <span className="text-xs font-medium text-primary-600 group-hover:text-primary-700">
              {isAr ? 'عرض المزاد' : 'View Auction'}
            </span>
            <ArrowIcon className="h-3.5 w-3.5 text-primary-600 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

function TimeUnit({
  value,
  label,
  urgent,
}: {
  value: number
  label: string
  urgent?: boolean
}) {
  return (
    <div className="text-center">
      <div
        className={cn(
          'min-w-[32px] rounded-md bg-white/20 px-1.5 py-1 text-sm font-bold tabular-nums text-white backdrop-blur-sm',
          urgent && 'bg-accent-500/40',
        )}
      >
        {String(value).padStart(2, '0')}
      </div>
      <div className="mt-0.5 text-[9px] font-medium text-white/60">{label}</div>
    </div>
  )
}
