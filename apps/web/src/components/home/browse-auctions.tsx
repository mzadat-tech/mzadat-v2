'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Gavel,
  ShoppingBag,
  CheckCircle2,
  Calendar,
  Eye,
  Banknote,
  ArrowRight,
  ArrowLeft,
  Clock,
  Package,
  Tag,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Badge } from '@mzadat/ui/components/badge'
import { cn, formatOMR } from '@mzadat/ui/lib/utils'
import { useCountdown } from '@/hooks/use-countdown'
import useEmblaCarousel from 'embla-carousel-react'
import Autoplay from 'embla-carousel-autoplay'
import type { AuctionGroup, ProductCard } from '@/lib/data'

type TabKey = 'live' | 'direct' | 'completed'

interface BrowseAuctionsProps {
  liveGroups: AuctionGroup[]
  directSaleProducts: ProductCard[]
  completedGroups: AuctionGroup[]
  locale: string
  direction: 'rtl' | 'ltr'
}

function formatDate(date: Date | null, locale: string): string {
  if (!date) return ''
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-OM' : 'en-US', {
    day: 'numeric',
    month: 'short',
  }).format(date)
}

export function BrowseAuctions({
  liveGroups,
  directSaleProducts,
  completedGroups,
  locale,
  direction,
}: BrowseAuctionsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('live')
  const isAr = locale === 'ar'

  const tabs: { key: TabKey; label: string; count: number; icon: React.ReactNode }[] = [
    {
      key: 'live',
      label: isAr ? 'المزادات المباشرة' : 'Live Auctions',
      count: liveGroups.length,
      icon: <Gavel className="h-3.5 w-3.5" />,
    },
    {
      key: 'direct',
      label: isAr ? 'البيع المباشر' : 'Direct Sales',
      count: directSaleProducts.length,
      icon: <ShoppingBag className="h-3.5 w-3.5" />,
    },
    {
      key: 'completed',
      label: isAr ? 'مزادات مكتملة' : 'Completed Auctions',
      count: completedGroups.length,
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    },
  ]

  return (
    <section className="py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {isAr ? 'تصفح المزادات' : 'Browse Auctions'}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {isAr
              ? 'اكتشف مجموعتنا المتنوعة من المزادات والعروض'
              : 'Explore our curated collection of auctions and offerings'}
          </p>
        </div>

        {/* Pills */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-200',
                activeTab === tab.key
                  ? 'bg-primary-900 text-white shadow-md shadow-primary-900/20'
                  : 'border border-border text-muted-foreground hover:border-primary-200 hover:text-foreground'
              )}
            >
              {tab.icon}
              {tab.label}
              {tab.count > 0 && (
                <span
                  className={cn(
                    'inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold',
                    activeTab === tab.key
                      ? 'bg-white/20 text-white'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="mt-5">
          <AnimatePresence mode="wait">
            {activeTab === 'live' && (
              <motion.div
                key="live"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
                {liveGroups.length > 0 ? (
                  <LiveGroupsCarousel
                    groups={liveGroups}
                    locale={locale}
                    direction={direction}
                  />
                ) : (
                  <EmptyState
                    icon={<Gavel className="h-7 w-7" />}
                    title={
                      isAr
                        ? 'لا توجد مزادات مباشرة حالياً'
                        : 'No live auctions at the moment'
                    }
                    description={
                      isAr
                        ? 'تُضاف مزادات جديدة بانتظام. تحقق مرة أخرى قريبًا'
                        : 'New auctions are added regularly. Check back soon for exciting listings.'
                    }
                  />
                )}
              </motion.div>
            )}

            {activeTab === 'direct' && (
              <motion.div
                key="direct"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
                {directSaleProducts.length > 0 ? (
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {directSaleProducts.map((product, i) => (
                      <DirectSaleCard
                        key={product.id}
                        product={product}
                        locale={locale}
                        direction={direction}
                        index={i}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={<ShoppingBag className="h-7 w-7" />}
                    title={
                      isAr
                        ? 'لا توجد منتجات للبيع المباشر'
                        : 'No direct sale items available'
                    }
                    description={
                      isAr
                        ? 'ترقبوا عروض البيع المباشر القادمة'
                        : 'Stay tuned for upcoming direct sale offerings.'
                    }
                  />
                )}
              </motion.div>
            )}

            {activeTab === 'completed' && (
              <motion.div
                key="completed"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
                {completedGroups.length > 0 ? (
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {completedGroups.map((group, i) => (
                      <CompletedGroupCard
                        key={group.id}
                        group={group}
                        locale={locale}
                        index={i}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={<CheckCircle2 className="h-7 w-7" />}
                    title={
                      isAr
                        ? 'لا توجد مزادات مكتملة بعد'
                        : 'No completed auctions yet'
                    }
                    description={
                      isAr
                        ? 'ستظهر المزادات المكتملة هنا فور انتهائها'
                        : 'Completed auctions will appear here once they conclude.'
                    }
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}

// ── Empty State ──────────────────────────────────────────────

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-muted/20 py-20">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground/40">
        {icon}
      </div>
      <h3 className="mt-5 text-sm font-medium text-foreground">{title}</h3>
      <p className="mt-1.5 max-w-sm text-center text-xs leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  )
}

// ── Live Groups Carousel (Embla) ─────────────────────────────

function LiveGroupsCarousel({
  groups,
  locale,
  direction,
}: {
  groups: AuctionGroup[]
  locale: string
  direction: 'rtl' | 'ltr'
}) {
  const isAr = locale === 'ar'
  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight

  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      align: 'start',
      loop: true,
      skipSnaps: false,
      direction,
      slidesToScroll: 1,
    },
    [Autoplay({ delay: 5000, stopOnInteraction: false, stopOnMouseEnter: true })],
  )

  const [selectedSnap, setSelectedSnap] = useState(0)
  const [snapCount, setSnapCount] = useState(0)

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setSelectedSnap(emblaApi.selectedScrollSnap())
    setSnapCount(emblaApi.scrollSnapList().length)
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    onSelect()
    emblaApi.on('select', onSelect)
    emblaApi.on('reInit', onSelect)
    return () => {
      emblaApi.off('select', onSelect)
      emblaApi.off('reInit', onSelect)
    }
  }, [emblaApi, onSelect])

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi])
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi])
  const scrollTo = useCallback((i: number) => emblaApi?.scrollTo(i), [emblaApi])

  const useCarousel = groups.length > 3
  const showControls = useCarousel && groups.length > 1
  const placeholderCount = groups.length < 3 ? 3 - groups.length : 0

  // Static grid for <= 3 cards (with placeholders)
  if (!useCarousel) {
    return (
      <div>
        <div className="mb-4 flex items-center justify-end">
          <Link
            href="/auctions?status=live"
            className="inline-flex items-center gap-1.5 rounded-full border border-primary-600 px-5 py-2 text-sm font-medium text-primary-600 transition-all hover:bg-primary-600 hover:text-white"
          >
            {isAr ? 'عرض الكل' : 'View All'}
            <ArrowIcon className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group, i) => (
            <GroupCard
              key={group.id}
              group={group}
              locale={locale}
              direction={direction}
              index={i}
            />
          ))}
          {Array.from({ length: placeholderCount }).map((_, i) => (
            <div
              key={`placeholder-${i}`}
              className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-muted/10 p-8"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/40 text-muted-foreground/30">
                <Gavel className="h-6 w-6" />
              </div>
              <p className="mt-4 text-sm font-medium text-muted-foreground/60">
                {isAr ? 'مزادات قادمة قريبًا' : 'More auctions coming soon'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground/40">
                {isAr ? 'ترقبوا العروض الجديدة' : 'Stay tuned for new listings'}
              </p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Carousel nav — top right */}
      {showControls && (
        <div className="mb-4 flex items-center justify-end gap-2">
          <button
            onClick={scrollPrev}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary-200 hover:bg-primary-50 hover:text-foreground"
            aria-label="Previous"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={scrollNext}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary-200 hover:bg-primary-50 hover:text-foreground"
            aria-label="Next"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <Link
            href="/auctions?status=live"
            className="ms-1 inline-flex items-center gap-1.5 rounded-full border border-primary-600 px-5 py-2 text-sm font-medium text-primary-600 transition-all hover:bg-primary-600 hover:text-white"
          >
            {isAr ? 'عرض الكل' : 'View All'}
            <ArrowIcon className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {/* Embla viewport */}
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="-ms-5 flex">
          {groups.map((group, i) => (
            <div
              key={group.id}
              className="min-w-0 flex-[0_0_90%] ps-5 sm:flex-[0_0_50%] lg:flex-[0_0_33.333%]"
            >
              <GroupCard
                group={group}
                locale={locale}
                direction={direction}
                index={i}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Dots */}
      {showControls && snapCount > 1 && (
        <div className="mt-6 flex items-center justify-center gap-1.5">
          {Array.from({ length: snapCount }).map((_, i) => (
            <button
              key={i}
              onClick={() => scrollTo(i)}
              className={`h-2 rounded-full transition-all ${
                i === selectedSnap
                  ? 'w-6 bg-primary-600'
                  : 'w-2 bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Group Card (Live / Upcoming) ─────────────────────────────

function formatDateTime(date: Date | null, locale: string): string {
  if (!date) return ''
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-OM' : 'en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date)
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
  const timeLeft = useCountdown(group.status === 'active' ? group.endDate : group.startDate)
  const isActive = group.status === 'active'
  const isUpcoming = group.status === 'upcoming'

  // Navigate to store page with group filter if storeSlug available, otherwise fallback
  const groupHref = group.storeSlug
    ? `/store/${group.storeSlug}?group=${group.id}`
    : `/auctions?group=${group.slug}`

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
    >
      <Link
        href={groupHref}
        className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5"
      >
        {/* Image */}
        <div className="relative aspect-[4/2.75] overflow-hidden bg-muted">
          {group.image ? (
            <Image
              src={group.image}
              alt={group.name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-linear-to-br from-primary-50 to-primary-100/60">
              <Gavel className="h-10 w-10 text-primary-300" />
            </div>
          )}

          {/* Status Badge — top right */}
          <div className="absolute inset-e-3 top-3">
            {isActive && (
              <Badge className="bg-emerald-500 text-white shadow-md">
                <span className="me-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                {isAr ? 'مباشر' : 'Live Now'}
              </Badge>
            )}
            {isUpcoming && (
              <Badge className="bg-amber-500 text-white shadow-md">
                <Clock className="me-1 h-3 w-3" />
                {isAr ? 'قريبًا' : 'Starting Soon'}
              </Badge>
            )}
          </div>

          {/* Lot Count Badge (bottom-left) */}
          <div className="absolute bottom-3 inset-s-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
              <Package className="h-3.5 w-3.5" />
              {group.productCount} {isAr ? 'قطعة' : 'Lots'}
            </span>
          </div>
        </div>

        {/* Status color bar */}
        <div className={cn(
          'h-1 w-full',
          isActive ? 'bg-emerald-500' : isUpcoming ? 'bg-amber-500' : 'bg-gray-300',
        )} />

        {/* Content */}
        <div className="flex flex-1 flex-col p-4">
          {/* Title */}
          <h3 className="text-base font-bold text-foreground line-clamp-2 transition-colors group-hover:text-primary-700">
            {group.name}
          </h3>

          {/* Merchant */}
          {group.merchant && (
            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Gavel className="h-3.5 w-3.5 shrink-0 text-primary-500" />
              <span className="line-clamp-1">{group.merchant.name}</span>
            </div>
          )}

          {/* Info sections */}
          <div className="mt-4 flex-1 space-y-3">
            {/* Inspection Period — always shown */}
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-500">
                <Eye className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-wider text-blue-500">
                  {isAr ? 'فترة المعاينة' : 'Inspection Period'}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {group.inspectionStartDate ? (
                    <>
                      {formatDateTime(group.inspectionStartDate, locale)}
                      {group.inspectionEndDate && (
                        <>
                          <span className="mx-1 text-muted-foreground/40">→</span>
                          {formatDateTime(group.inspectionEndDate, locale)}
                        </>
                      )}
                    </>
                  ) : (
                    <span className="text-muted-foreground/50">{isAr ? 'غير متوفر' : 'N/A'}</span>
                  )}
                </p>
              </div>
            </div>

            {/* Auction Period */}
            {(group.startDate || group.endDate) && (
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                  <Calendar className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-primary-600">
                    {isAr ? 'فترة المزاد' : 'Auction Period'}
                  </p>
                  <div className="mt-0.5">
                    {group.startDate && (
                      <p className="text-xs font-semibold text-foreground">
                        {formatDateTime(group.startDate, locale)}
                      </p>
                    )}
                    {group.endDate && (
                      <p className="text-xs font-semibold text-foreground">
                        {formatDateTime(group.endDate, locale)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Deposit Amount */}
            {group.minDeposit > 0 && (
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <Banknote className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-emerald-600">
                    {isAr ? 'مبلغ التأمين' : 'Deposit Amount'}
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-foreground">
                    {formatOMR(group.minDeposit)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* CTA Button */}
          <div className="mt-4 pt-3">
            <span className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-900 px-4 py-2.5 text-sm font-medium text-white transition-colors group-hover:bg-primary-800">
              {isAr ? 'عرض جميع المزادات' : 'View All Auctions'}
              <ArrowIcon className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

// ── Direct Sale Card ─────────────────────────────────────────

function DirectSaleCard({
  product,
  locale,
  direction,
  index,
}: {
  product: ProductCard
  locale: string
  direction: 'rtl' | 'ltr'
  index: number
}) {
  const isAr = locale === 'ar'
  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
    >
      <Link
        href={`/auctions/${product.slug}`}
        className="group block overflow-hidden rounded-2xl border border-border bg-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5"
      >
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100/60">
              <ShoppingBag className="h-10 w-10 text-primary-300" />
            </div>
          )}

          <div className="absolute inset-e-3 top-3">
            <Badge className="bg-primary-700 text-white shadow-md">
              <Tag className="me-1 h-3 w-3" />
              {isAr ? 'بيع مباشر' : 'Direct Sale'}
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          {product.storeName && (
            <span className="text-xs font-medium text-primary-600">
              {product.storeName}
            </span>
          )}

          <h3 className="mt-1 font-semibold text-foreground line-clamp-2 transition-colors group-hover:text-primary-700">
            {product.name}
          </h3>

          {/* Group badge */}
          {product.groupName && (
            <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              <Gavel className="h-2.5 w-2.5" />
              {product.groupName}
            </div>
          )}

          {/* Price */}
          <div className="mt-3 rounded-xl bg-primary-50/80 px-4 py-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-primary-600">
              {isAr ? 'السعر' : 'Price'}
            </p>
            <p className="text-lg font-bold text-primary-700">
              {formatOMR(product.startingPrice)}
            </p>
          </div>

          {/* CTA */}
          <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
            <span className="text-xs font-medium text-primary-600 transition-colors group-hover:text-primary-700">
              {isAr ? 'اشترِ الآن' : 'Buy Now'}
            </span>
            <ArrowIcon className="h-3.5 w-3.5 text-primary-600 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

// ── Completed Group Card (info only — no navigation) ─────────

function CompletedGroupCard({
  group,
  locale,
  index,
}: {
  group: AuctionGroup
  locale: string
  index: number
}) {
  const isAr = locale === 'ar'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
    >
      {/* No link — info only */}
      <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-white">
        {/* Image */}
        <div className="relative aspect-video overflow-hidden bg-muted">
          {group.image ? (
            <Image
              src={group.image}
              alt={group.name}
              fill
              className="object-cover grayscale-30"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-linear-to-br from-gray-100 to-gray-50">
              <Gavel className="h-10 w-10 text-gray-300" />
            </div>
          )}

          <div className="absolute inset-e-3 top-3">
            <Badge variant="secondary" className="bg-gray-800/90 text-white backdrop-blur-sm">
              <CheckCircle2 className="me-1 h-3 w-3" />
              {isAr ? 'مكتمل' : 'Completed'}
            </Badge>
          </div>

          {/* Lot Count Badge */}
          <div className="absolute bottom-3 inset-s-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
              <Package className="h-3.5 w-3.5" />
              {group.productCount} {isAr ? 'قطعة' : 'Lots'}
            </span>
          </div>
        </div>

        {/* Gray bar for completed */}
        <div className="h-1 w-full bg-gray-300" />

        {/* Content */}
        <div className="flex flex-1 flex-col p-4">
          <h3 className="text-base font-bold text-foreground line-clamp-2">{group.name}</h3>
          {group.merchant && (
            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Gavel className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
              <span className="line-clamp-1">{group.merchant.name}</span>
            </div>
          )}

          <div className="mt-4 flex-1 space-y-3">
            {/* Auction Period */}
            {(group.startDate || group.endDate) && (
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
                  <Calendar className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                    {isAr ? 'فترة المزاد' : 'Auction Period'}
                  </p>
                  <div className="mt-0.5">
                    {group.startDate && (
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(group.startDate, locale)}
                      </p>
                    )}
                    {group.endDate && (
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(group.endDate, locale)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Deposit */}
            {group.minDeposit > 0 && (
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
                  <Banknote className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">
                    {isAr ? 'مبلغ التأمين' : 'Deposit Amount'}
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-muted-foreground">
                    {formatOMR(group.minDeposit)}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3">
            <span className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-muted-foreground">
              {isAr ? 'انتهى المزاد' : 'Auction Ended'}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
