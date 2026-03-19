'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Store,
  MapPin,
  Gavel,
  Calendar,
  ChevronDown,
  Layers,
  ArrowLeft,
  LayoutList,
  Package,
  Users,
  Clock,
} from 'lucide-react'
import { Badge } from '@mzadat/ui/components/badge'
import { cn, formatOMR } from '@mzadat/ui/lib/utils'
import { useCountdown } from '@/hooks/use-countdown'
import { LotRowCard } from '@/components/auction/lot-row-card'
import { getMyPaidGroupIds } from '@/lib/registration-api'
import type { StoreDetail, StoreGroup, StoreLot } from '@/lib/data'

interface StorePageClientProps {
  store: StoreDetail
  locale: string
  direction: 'rtl' | 'ltr'
  initialTab: 'live' | 'past'
  initialGroupId?: string
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : '/api'

export function StorePageClient({
  store,
  locale,
  direction,
  initialTab,
  initialGroupId,
}: StorePageClientProps) {
  const isAr = locale === 'ar'
  const router = useRouter()
  const searchParams = useSearchParams()

  const [activeTab, setActiveTab] = useState<'live' | 'past'>(initialTab)
  const [selectedGroup, setSelectedGroup] = useState<string | undefined>(initialGroupId)
  const [lots, setLots] = useState<StoreLot[]>(store.lots)
  const [loading, setLoading] = useState(false)
  const [groupsOpen, setGroupsOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [paidGroupIds, setPaidGroupIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    getMyPaidGroupIds()
      .then(({ isLoggedIn: loggedIn, paidGroupIds: ids }) => {
        setIsLoggedIn(loggedIn)
        setPaidGroupIds(ids)
      })
      .catch(() => {})
  }, [])

  // Fetch lots when tab or group changes
  const fetchLots = useCallback(async (tab: 'live' | 'past', groupId?: string) => {
    setLoading(true)
    try {
      let url = `${API_BASE}/stores/by-slug/${store.slug}?locale=${locale}&tab=${tab}`
      if (groupId) url += `&group=${groupId}`
      const res = await fetch(url)
      const json = await res.json()
      if (json.success) {
        setLots(json.data.lots)
      }
    } catch {
      // keep existing lots
    } finally {
      setLoading(false)
    }
  }, [store.slug, locale])

  const handleTabChange = (tab: 'live' | 'past') => {
    setActiveTab(tab)
    fetchLots(tab, selectedGroup)
    // Update URL
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  const handleGroupFilter = (groupId?: string) => {
    setSelectedGroup(groupId)
    fetchLots(activeTab, groupId)
    setGroupsOpen(false)
    // Update URL
    const params = new URLSearchParams(searchParams.toString())
    if (groupId) {
      params.set('group', groupId)
    } else {
      params.delete('group')
    }
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  const selectedGroupObj = store.groups.find((g) => g.id === selectedGroup)
  const liveGroupCount = store.groups.filter((g) => g.isLive).length

  return (
    <div className="min-h-screen bg-white">

      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
    {/* ═══ Store Header ═══ */}
      <header className="relative bg-white">
        {/* Cover Band */}
        <div className="relative h-32 overflow-hidden bg-linear-to-r from-primary-700 via-primary-600 to-primary-500 sm:h-40 md:h-44 rounded-xl">
          {store.bannerUrl ? (
            <Image
              src={store.bannerUrl}
              alt=""
              fill
              className="object-cover"
              priority
              sizes="100vw"
            />
          ) : (
            <>
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M20 20.5V18H0v-2h20v-2H0v-2h20v-2H0V8h20V6H0V4h20V2H0V0h22v20h2V0h2v20h2V0h2v20h2V0h2v20h2V0h2v20.5z\' fill=\'%23ffffff\' fill-opacity=\'1\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")' }} />
            </>
          )}
          <div className="absolute inset-0 bg-linear-to-t from-black/30 via-transparent to-transparent" />
        </div>

        {/* Profile Row */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative flex items-end gap-4 pb-5 sm:gap-5">
            {/* Logo */}
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="-mt-10 shrink-0 sm:-mt-12"
            >
              <div className="flex size-20 items-center justify-center rounded-xl border-[3px] border-white bg-white shadow-lg ring-1 ring-black/5 sm:size-24 sm:rounded-2xl">
                {store.logoUrl ? (
                  <Image
                    src={store.logoUrl}
                    alt={store.name}
                    width={80}
                    height={80}
                    className="rounded-lg object-contain sm:rounded-xl"
                  />
                ) : (
                  <Store className="size-9 text-primary-600 sm:size-10" />
                )}
              </div>
            </motion.div>

            {/* Name + Meta */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.08 }}
              className="flex min-w-0 flex-1 flex-col gap-2 pt-5 sm:flex-row sm:items-end sm:justify-between"
            >
              <div className="min-w-0">
                <h1 className="truncate text-lg font-bold text-foreground sm:text-xl md:text-2xl">
                  {store.name}
                </h1>
                {store.description && (
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground sm:text-sm">
                    {store.description}
                  </p>
                )}
              </div>

              {/* Stats + Actions */}
              <div className="flex shrink-0 items-center gap-2">
                {/* Stats chips */}
                <div className="flex items-center gap-1.5">
                  {store.owner && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                      <Users className="size-3" />
                      {store.owner.name}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-semibold text-primary-700">
                    <Gavel className="size-3" />
                    {store.auctionCount}
                  </span>
                  {store.groups.length > 0 && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                      <Package className="size-3" />
                      {store.groups.length}
                    </span>
                  )}
                </div>

                {/* Back link */}
                <Link
                  href="/shops"
                  className="hidden items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted sm:inline-flex"
                >
                  <ArrowLeft className="size-3" />
                  {isAr ? 'كل المتاجر' : 'All Shops'}
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </header>

      {/* ═══ Filters Bar ═══ */}
      <div className="sticky top-0 z-30 mt-6 border-b border-border bg-white/95 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center gap-3 py-3">
            {/* Tabs */}
            <div className="flex rounded-lg border border-border bg-muted/50 p-0.5">
              <button
                onClick={() => handleTabChange('live')}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all',
                  activeTab === 'live'
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    activeTab === 'live' ? 'animate-pulse bg-emerald-500' : 'bg-gray-300',
                  )}
                />
                {isAr ? 'مباشر وقادم' : 'Live & Upcoming'}
              </button>
              <button
                onClick={() => handleTabChange('past')}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all',
                  activeTab === 'past'
                    ? 'bg-white text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Calendar className="h-3 w-3" />
                {isAr ? 'منتهية' : 'Past'}
              </button>
            </div>

            {/* Group Filter Dropdown */}
            {store.groups.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setGroupsOpen(!groupsOpen)}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all',
                    selectedGroup
                      ? 'border-primary-200 bg-primary-50 text-primary-700'
                      : 'border-border bg-white text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Layers className="h-3.5 w-3.5" />
                  {selectedGroupObj
                    ? selectedGroupObj.name
                    : isAr ? 'كل المجموعات' : 'All Groups'}
                  <ChevronDown
                    className={cn(
                      'h-3 w-3 transition-transform',
                      groupsOpen && 'rotate-180',
                    )}
                  />
                </button>

                <AnimatePresence>
                  {groupsOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute inset-s-0 top-full z-40 mt-1 w-64 rounded-xl border border-border bg-white p-1.5 shadow-xl"
                    >
                      <button
                        onClick={() => handleGroupFilter(undefined)}
                        className={cn(
                          'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors',
                          !selectedGroup
                            ? 'bg-primary-50 text-primary-700'
                            : 'text-muted-foreground hover:bg-muted',
                        )}
                      >
                        <LayoutList className="h-3.5 w-3.5" />
                        {isAr ? 'كل المجموعات' : 'All Groups'}
                      </button>
                      {store.groups.map((g) => (
                        <button
                          key={g.id}
                          onClick={() => handleGroupFilter(g.id)}
                          className={cn(
                            'flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors',
                            selectedGroup === g.id
                              ? 'bg-primary-50 text-primary-700'
                              : 'text-muted-foreground hover:bg-muted',
                          )}
                        >
                          <span className="flex items-center gap-2">
                            {g.isLive && (
                              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                            )}
                            <span className="line-clamp-1">{g.name}</span>
                          </span>
                          <Badge variant="secondary" className="ms-2 text-[10px]">
                            {g.lotCount}
                          </Badge>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Results count */}
            <div className="ms-auto text-xs text-muted-foreground">
              {lots.length}{' '}
              {isAr ? 'مزاد' : lots.length === 1 ? 'auction' : 'auctions'}
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* ═══ Lots List ═══ */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-36 animate-pulse rounded-xl border border-border bg-muted/40"
              />
            ))}
          </div>
        ) : lots.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="py-20 text-center"
          >
            <Gavel className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
            <h3 className="text-lg font-semibold text-foreground">
              {activeTab === 'live'
                ? isAr
                  ? 'لا توجد مزادات نشطة'
                  : 'No live or upcoming auctions'
                : isAr
                  ? 'لا توجد مزادات منتهية'
                  : 'No past auctions'}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {isAr ? 'تابعنا لمعرفة المزادات الجديدة' : 'Stay tuned for new auctions'}
            </p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {lots.map((lot, i) => (
              <LotRowCard
                key={lot.id}
                lot={lot}
                locale={locale}
                direction={direction}
                index={i}
                isLoggedIn={isLoggedIn}
                depositPaid={!!(lot.groupId && paidGroupIds.has(lot.groupId))}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Group Quick Card (horizontal scroll chips) ──

function GroupQuickCard({
  group,
  locale,
  isSelected,
  onClick,
}: {
  group: StoreGroup
  locale: string
  isSelected: boolean
  onClick: () => void
}) {
  const isAr = locale === 'ar'
  const timeLeft = useCountdown(group.endDate)

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex shrink-0 items-center gap-3 rounded-xl border px-2 py-2 text-start transition-all',
        isSelected
          ? 'border-primary-300 bg-primary-50 shadow-sm'
          : 'border-border bg-white hover:border-primary-200 hover:shadow-sm',
      )}
    >
      {/* Group image */}
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-muted">
        {group.image ? (
          <Image
            src={group.image}
            alt={group.name}
            fill
            className="object-cover"
            sizes="40px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Gavel className="h-4 w-4 text-muted-foreground/40" />
          </div>
        )}
      </div>

      <div className="min-w-0">
        <p className="line-clamp-1 text-xs font-semibold text-foreground">
          {group.name}
        </p>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>{group.lotCount} {isAr ? 'قطعة' : 'lots'}</span>
          {timeLeft.total > 0 && (
            <>
              <span className="text-muted-foreground/40">•</span>
              <span className="font-medium text-emerald-600">
                {timeLeft.days > 0 && `${timeLeft.days}d `}
                {String(timeLeft.hours).padStart(2, '0')}:
                {String(timeLeft.minutes).padStart(2, '0')}:
                {String(timeLeft.seconds).padStart(2, '0')}
              </span>
            </>
          )}
        </div>
      </div>
    </button>
  )
}
