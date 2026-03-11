'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Gavel, Activity, Clock, Trophy, BarChart3,
  RefreshCw, Layers, AlertCircle, Timer,
  ChevronRight, Zap, Users,
} from 'lucide-react'
import type {
  AuctionDashboardStats,
  LiveAuction,
  EndedAuction,
  ActiveGroup,
} from '@/lib/actions/auctions'
import {
  getAuctionDashboardStats,
  getLiveAuctions,
  getUpcomingAuctions,
  getEndedAuctions,
  getActiveGroups,
} from '@/lib/actions/auctions'

// ── Helpers ──────────────────────────────────────────────────

function formatCurrency(value: string): string {
  return `${parseFloat(value).toFixed(3)} OMR`
}

function formatTimeRemaining(endDateStr: string | null): string {
  if (!endDateStr) return '-'
  const end = new Date(endDateStr)
  const now = new Date()
  const diff = end.getTime() - now.getTime()
  if (diff <= 0) return 'Ended'

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const secs = Math.floor((diff % (1000 * 60)) / 1000)

  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${mins}m`
  if (mins > 0) return `${mins}m ${secs}s`
  return `${secs}s`
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '-'
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Muscat',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(dateStr))
}

// ── Sub-components ───────────────────────────────────────────

function StatCard({ title, value, icon: Icon, color, subtitle }: {
  title: string
  value: number
  icon: React.ElementType
  color: string
  subtitle?: string
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[12px] font-medium text-gray-400">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="mt-0.5 text-[11px] text-gray-400">{subtitle}</p>}
        </div>
        <div className={`rounded-lg p-2.5 ${color}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </div>
  )
}

function StatusDot({ status }: { status: 'live' | 'upcoming' | 'ended' }) {
  const colors = {
    live: 'bg-green-500',
    upcoming: 'bg-blue-500',
    ended: 'bg-gray-400',
  }
  return (
    <span className="relative flex h-2.5 w-2.5">
      {status === 'live' && (
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
      )}
      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${colors[status]}`} />
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    live: 'bg-green-50 text-green-700 border-green-200',
    upcoming: 'bg-blue-50 text-blue-700 border-blue-200',
    ended: 'bg-gray-50 text-gray-600 border-gray-200',
    active: 'bg-green-50 text-green-700 border-green-200',
    closed: 'bg-gray-50 text-gray-600 border-gray-200',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${styles[status] || styles.ended}`}>
      <StatusDot status={status === 'active' ? 'live' : status as any} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

function LiveAuctionRow({ auction }: { auction: LiveAuction }) {
  const [timeRemaining, setTimeRemaining] = useState(formatTimeRemaining(auction.endDate))

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(formatTimeRemaining(auction.endDate))
    }, 1000)
    return () => clearInterval(interval)
  }, [auction.endDate])

  const isEndingSoon = auction.endDate && (new Date(auction.endDate).getTime() - Date.now()) < 5 * 60 * 1000

  return (
    <tr className="border-b border-gray-100 transition-colors hover:bg-gray-50/50">
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          {auction.featureImage ? (
            <img
              src={auction.featureImage}
              alt=""
              className="h-8 w-8 rounded-md object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-100">
              <Gavel className="h-3.5 w-3.5 text-gray-400" />
            </div>
          )}
          <div>
            <p className="text-[13px] font-medium text-gray-900 max-w-[200px] truncate">{auction.name}</p>
            {auction.groupName && (
              <p className="text-[11px] text-gray-400">{auction.groupName}</p>
            )}
          </div>
        </div>
      </td>
      <td className="px-3 py-2.5 text-[13px] font-semibold text-gray-900">
        {formatCurrency(auction.currentBid)}
      </td>
      <td className="px-3 py-2.5 text-[13px] text-gray-600 text-center">
        {auction.bidCount}
      </td>
      <td className="px-3 py-2.5">
        <div className={`flex items-center gap-1.5 text-[13px] font-medium ${isEndingSoon ? 'text-red-600' : 'text-gray-700'}`}>
          <Timer className="h-3.5 w-3.5" />
          {timeRemaining}
        </div>
        {auction.totalExtensions > 0 && (
          <p className="text-[10px] text-amber-600 mt-0.5">
            +{auction.totalExtensions} ext
          </p>
        )}
      </td>
      <td className="px-3 py-2.5 text-[12px] text-gray-500">
        {auction.merchantName}
      </td>
      <td className="px-3 py-2.5">
        <StatusBadge status="live" />
      </td>
    </tr>
  )
}

function EndedAuctionRow({ auction }: { auction: EndedAuction }) {
  return (
    <tr className="border-b border-gray-100 transition-colors hover:bg-gray-50/50">
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          {auction.featureImage ? (
            <img src={auction.featureImage} alt="" className="h-8 w-8 rounded-md object-cover" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-100">
              <Gavel className="h-3.5 w-3.5 text-gray-400" />
            </div>
          )}
          <div>
            <p className="text-[13px] font-medium text-gray-900 max-w-[200px] truncate">{auction.name}</p>
            {auction.groupName && <p className="text-[11px] text-gray-400">{auction.groupName}</p>}
          </div>
        </div>
      </td>
      <td className="px-3 py-2.5 text-[13px] font-semibold text-gray-900">
        {formatCurrency(auction.currentBid)}
      </td>
      <td className="px-3 py-2.5 text-[13px] text-gray-600 text-center">
        {auction.bidCount}
      </td>
      <td className="px-3 py-2.5 text-[12px] text-gray-500">
        {formatDateTime(auction.endDate)}
      </td>
      <td className="px-3 py-2.5">
        {auction.winnerName ? (
          <div>
            <p className="text-[12px] font-medium text-green-700">{auction.winnerName}</p>
            <p className="text-[11px] text-gray-400">{auction.winnerCustomId}</p>
          </div>
        ) : (
          <span className="text-[12px] text-gray-400 italic">No bids</span>
        )}
      </td>
      <td className="px-3 py-2.5">
        <StatusBadge status="ended" />
      </td>
    </tr>
  )
}

function ActiveGroupCard({ group }: { group: ActiveGroup }) {
  const progress = group.totalLots > 0
    ? Math.round((group.endedLots / group.totalLots) * 100)
    : 0

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="text-[13px] font-semibold text-gray-900">{group.name}</h4>
          <p className="text-[11px] text-gray-400 mt-0.5">{group.merchantName}</p>
        </div>
        <StatusBadge status={group.status} />
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-gray-100">
          <div
            className="h-1.5 rounded-full bg-green-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Lot stats */}
      <div className="grid grid-cols-4 gap-2 text-center">
        <div>
          <p className="text-lg font-bold text-gray-900">{group.totalLots}</p>
          <p className="text-[10px] text-gray-400">Total</p>
        </div>
        <div>
          <p className="text-lg font-bold text-green-600">{group.liveLots}</p>
          <p className="text-[10px] text-gray-400">Live</p>
        </div>
        <div>
          <p className="text-lg font-bold text-blue-600">{group.upcomingLots}</p>
          <p className="text-[10px] text-gray-400">Upcoming</p>
        </div>
        <div>
          <p className="text-lg font-bold text-gray-500">{group.endedLots}</p>
          <p className="text-[10px] text-gray-400">Ended</p>
        </div>
      </div>

      {/* Dates */}
      <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-2.5">
        <div className="text-[11px] text-gray-400">
          <Clock className="inline h-3 w-3 mr-1" />
          {formatDateTime(group.startDate)} — {formatDateTime(group.endDate)}
        </div>
        <div className="text-[11px] text-gray-500 font-medium">
          {group.totalBids} bids
        </div>
      </div>
    </div>
  )
}

function TableSkeleton({ rows = 4, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 border-b border-gray-100 px-3 py-3">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="h-4 flex-1 rounded bg-gray-200" />
          ))}
        </div>
      ))}
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────

export function AuctionDashboardClient() {
  const [stats, setStats] = useState<AuctionDashboardStats | null>(null)
  const [liveAuctions, setLiveAuctions] = useState<LiveAuction[]>([])
  const [upcomingAuctions, setUpcomingAuctions] = useState<LiveAuction[]>([])
  const [endedAuctions, setEndedAuctions] = useState<EndedAuction[]>([])
  const [activeGroups, setActiveGroups] = useState<ActiveGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'live' | 'upcoming' | 'ended'>('live')
  const [refreshing, setRefreshing] = useState(false)
  const hasFetched = useRef(false)

  const fetchAll = useCallback(async () => {
    try {
      const [s, live, upcoming, ended, groups] = await Promise.all([
        getAuctionDashboardStats(),
        getLiveAuctions(),
        getUpcomingAuctions(),
        getEndedAuctions(20),
        getActiveGroups(),
      ])
      setStats(s)
      setLiveAuctions(live)
      setUpcomingAuctions(upcoming)
      setEndedAuctions(ended)
      setActiveGroups(groups)
    } catch (err) {
      console.error('Failed to fetch auction data:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true
    fetchAll()
  }, [fetchAll])

  // Auto-refresh every 15 seconds
  useEffect(() => {
    const interval = setInterval(fetchAll, 15_000)
    return () => clearInterval(interval)
  }, [fetchAll])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchAll()
  }

  const currentAuctions = activeTab === 'live' ? liveAuctions
    : activeTab === 'upcoming' ? upcomingAuctions : endedAuctions

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[15px] font-semibold text-gray-900">Auction Dashboard</h1>
          <p className="text-[13px] text-gray-400">Real-time monitoring of all auction activity</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[13px] text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-[88px] animate-pulse rounded-lg border border-gray-200 bg-gray-50" />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-5 gap-3">
          <StatCard title="Live Auctions" value={stats.liveCount} icon={Zap} color="bg-green-500" />
          <StatCard title="Upcoming" value={stats.upcomingCount} icon={Clock} color="bg-blue-500" />
          <StatCard title="Ended Today" value={stats.endedTodayCount} icon={Trophy} color="bg-amber-500" />
          <StatCard title="Bids Today" value={stats.totalBidsToday} icon={BarChart3} color="bg-purple-500" />
          <StatCard title="Active Groups" value={stats.activeGroupCount} icon={Layers} color="bg-indigo-500" />
        </div>
      ) : null}

      {/* Active Groups */}
      {activeGroups.length > 0 && (
        <div>
          <h2 className="mb-2 text-[13px] font-semibold text-gray-700 flex items-center gap-1.5">
            <Layers className="h-4 w-4 text-indigo-500" />
            Active Groups
          </h2>
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {activeGroups.map((g) => (
              <ActiveGroupCard key={g.id} group={g} />
            ))}
          </div>
        </div>
      )}

      {/* Auction Tabs + Table */}
      <div className="rounded-lg border border-gray-200 bg-white">
        {/* Tab bar */}
        <div className="flex items-center gap-0 border-b border-gray-200">
          {(['live', 'upcoming', 'ended'] as const).map((tab) => {
            const count = tab === 'live' ? liveAuctions.length
              : tab === 'upcoming' ? upcomingAuctions.length : endedAuctions.length
            const label = tab.charAt(0).toUpperCase() + tab.slice(1)
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                <StatusDot status={tab} />
                {label}
                <span className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                  activeTab === tab ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'
                }`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <TableSkeleton />
          ) : currentAuctions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Gavel className="mb-2 h-8 w-8" />
              <p className="text-[13px]">No {activeTab} auctions</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <th className="px-3 py-2 text-left text-[12px] font-medium text-gray-400">Lot</th>
                  <th className="px-3 py-2 text-left text-[12px] font-medium text-gray-400">
                    {activeTab === 'ended' ? 'Final Bid' : 'Current Bid'}
                  </th>
                  <th className="px-3 py-2 text-center text-[12px] font-medium text-gray-400">Bids</th>
                  <th className="px-3 py-2 text-left text-[12px] font-medium text-gray-400">
                    {activeTab === 'live' ? 'Time Left' : activeTab === 'upcoming' ? 'Starts In' : 'Ended At'}
                  </th>
                  <th className="px-3 py-2 text-left text-[12px] font-medium text-gray-400">
                    {activeTab === 'ended' ? 'Winner' : 'Merchant'}
                  </th>
                  <th className="px-3 py-2 text-left text-[12px] font-medium text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody>
                {activeTab === 'ended'
                  ? endedAuctions.map((a) => <EndedAuctionRow key={a.id} auction={a} />)
                  : activeTab === 'live'
                    ? liveAuctions.map((a) => <LiveAuctionRow key={a.id} auction={a} />)
                    : upcomingAuctions.map((a) => (
                        <tr key={a.id} className="border-b border-gray-100 transition-colors hover:bg-gray-50/50">
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2.5">
                              {a.featureImage ? (
                                <img src={a.featureImage} alt="" className="h-8 w-8 rounded-md object-cover" />
                              ) : (
                                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-100">
                                  <Gavel className="h-3.5 w-3.5 text-gray-400" />
                                </div>
                              )}
                              <div>
                                <p className="text-[13px] font-medium text-gray-900 max-w-[200px] truncate">{a.name}</p>
                                {a.groupName && <p className="text-[11px] text-gray-400">{a.groupName}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-[13px] text-gray-600">
                            {formatCurrency(a.minBidPrice)}
                            <span className="text-[10px] text-gray-400 ml-1">start</span>
                          </td>
                          <td className="px-3 py-2.5 text-[13px] text-gray-500 text-center">-</td>
                          <td className="px-3 py-2.5 text-[12px] text-gray-500">
                            {formatDateTime(a.startDate)}
                          </td>
                          <td className="px-3 py-2.5 text-[12px] text-gray-500">
                            {a.merchantName}
                          </td>
                          <td className="px-3 py-2.5">
                            <StatusBadge status="upcoming" />
                          </td>
                        </tr>
                      ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
