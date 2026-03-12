'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Trophy, TrendingUp, Clock, Users } from 'lucide-react'
import { cn, formatOMR } from '@mzadat/ui/lib/utils'
import { formatDistanceToNow } from 'date-fns'

interface Bid {
  id: string
  amount: number
  isWinning: boolean
  createdAt: string
  user: { id: string; name: string; customId: string }
}

interface BidHistoryTableProps {
  bids: Bid[]
  currentUserId: string | null
  isAdmin: boolean
  isAr: boolean
  bidCount: number
}

function maskName(name: string, userId: string, currentUserId: string | null, isAdmin: boolean): string {
  if (isAdmin) return name
  if (currentUserId && userId === currentUserId) return name
  return '*****'
}

export function BidHistoryTable({ bids, currentUserId, isAdmin, isAr, bidCount }: BidHistoryTableProps) {
  // Show only the top (highest) bid per user. Bids arrive sorted by amount
  // descending, so the first occurrence of each user ID is their best bid.
  // Admins see the full unfiltered list.
  const displayBids = useMemo(() => {
    if (isAdmin) return bids
    const seenUserIds = new Set<string>()
    return bids.filter((bid) => {
      if (seenUserIds.has(bid.user.id)) return false
      seenUserIds.add(bid.user.id)
      return true
    })
  }, [bids, isAdmin])

  if (displayBids.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-12">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
          <Users className="h-6 w-6 text-slate-400" />
        </div>
        <p className="mt-3 text-sm font-medium text-slate-500">
          {isAr ? 'لا توجد مزايدات بعد' : 'No bids yet'}
        </p>
        <p className="mt-1 text-xs text-slate-400">
          {isAr ? 'كن أول من يزايد!' : 'Be the first to place a bid!'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with bid count */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50">
            <TrendingUp className="h-4 w-4 text-primary-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              {isAr ? 'سجل المزايدات' : 'Bid History'}
            </h3>
            <p className="text-xs text-slate-500">
              {bidCount} {isAr ? 'مزايدة' : bidCount === 1 ? 'bid' : 'bids'}
            </p>
          </div>
        </div>
      </div>

      {/* Bid list */}
      <div className="overflow-hidden rounded-xl border border-slate-200/80">
        <div className="divide-y divide-slate-100">
          {displayBids.map((bid, i) => {
            const isCurrentUser = currentUserId === bid.user.id
            const displayName = maskName(bid.user.name, bid.user.id, currentUserId, isAdmin)

            return (
              <motion.div
                key={bid.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className={cn(
                  'flex items-center justify-between px-4 py-3 transition-colors',
                  i === 0 && 'bg-emerald-50/50',
                  isCurrentUser && i !== 0 && 'bg-primary-50/30',
                )}
              >
                <div className="flex items-center gap-3">
                  {/* Rank indicator */}
                  <div
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                      i === 0
                        ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
                        : i === 1
                          ? 'bg-slate-200 text-slate-600'
                          : i === 2
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-400',
                    )}
                  >
                    {i === 0 ? <Trophy className="h-3.5 w-3.5" /> : i + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          'text-sm font-medium',
                          isCurrentUser ? 'text-primary-700' : 'text-slate-700',
                          displayName === '*****' && 'tracking-widest text-slate-400',
                        )}
                      >
                        {displayName}
                      </span>
                      {isCurrentUser && (
                        <span className="rounded-full bg-primary-100 px-1.5 py-0.5 text-[10px] font-semibold text-primary-700">
                          {isAr ? 'أنت' : 'YOU'}
                        </span>
                      )}
                      {i === 0 && (
                        <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                          {isAr ? 'الأعلى' : 'HIGHEST'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(bid.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                </div>
                <div className={cn(
                  'text-sm font-bold tabular-nums',
                  i === 0 ? 'text-emerald-600' : 'text-slate-700',
                )}>
                  {formatOMR(bid.amount)}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
