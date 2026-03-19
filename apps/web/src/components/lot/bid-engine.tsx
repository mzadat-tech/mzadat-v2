'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Gavel, Shield, Lock, AlertTriangle,
  Zap, Clock, Plus, Minus
} from 'lucide-react'
import { Button } from '@mzadat/ui'
import { cn, formatOMR } from '@mzadat/ui/lib/utils'
import { useCountdown } from '@/hooks/use-countdown'

interface BidEngineProps {
  currentBid: number
  startingPrice: number
  bidIncrements: number[]
  depositAmount: number
  depositType: string
  status: string
  startDate: Date | null
  endDate: Date | null
  totalExtensions: number
  isRegistered: boolean
  isAuthenticated: boolean
  isAr: boolean
  onPlaceBid: (amount: number) => void | Promise<void>
  onPayDeposit: () => void
  onLogin: () => void
}

export function BidEngine({
  currentBid,
  startingPrice,
  bidIncrements,
  depositAmount,
  status,
  startDate,
  endDate,
  totalExtensions,
  isRegistered,
  isAuthenticated,
  isAr,
  onPlaceBid,
  onPayDeposit,
  onLogin,
}: BidEngineProps) {
  const [selectedIncrement, setSelectedIncrement] = useState(0)
  const [multiplier, setMultiplier] = useState(1)
  const [isBidding, setIsBidding] = useState(false)

  // Cap multiplier to prevent accidental extreme bids
  const MAX_MULTIPLIER = 10

  // Reset increment index if it's out of bounds (e.g. data hydration change)
  const safeIncrement = selectedIncrement < bidIncrements.length ? selectedIncrement : 0
  const endTimeLeft = useCountdown(endDate)
  const startTimeLeft = useCountdown(startDate)

  const isLive = status === 'live'
  const isUpcoming = status === 'upcoming'
  const isEnded = status === 'ended' || (isLive && endTimeLeft.total <= 0)
  const isUrgent = isLive && endTimeLeft.total > 0 && endTimeLeft.total < 300000

  const basePrice = currentBid || startingPrice
  const increment = bidIncrements[safeIncrement]
  const bidAmount = Math.round((basePrice + increment * multiplier) * 1000) / 1000

  function handleIncrementSelect(index: number) {
    setSelectedIncrement(Math.min(index, bidIncrements.length - 1))
    setMultiplier(1)
  }

  async function handleBid() {
    setIsBidding(true)
    try {
      await onPlaceBid(bidAmount)
    } finally {
      setIsBidding(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* ─── Price Display ─── */}
      <div className={cn(
        'relative overflow-hidden rounded-xl border p-3.5',
        isUrgent
          ? 'border-accent-300 bg-gradient-to-br from-accent-50 to-white'
          : 'border-slate-200 bg-gradient-to-br from-slate-50/80 to-white',
      )}>
        {isUrgent && (
          <div className="absolute -end-8 -top-8 h-32 w-32 rounded-full bg-accent-400/10 blur-2xl" />
        )}

        <div className="relative grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
              {isAr ? 'سعر البداية' : 'Starting Price'}
            </p>
            <p className="mt-0.5 text-base font-semibold text-slate-600">
              {formatOMR(startingPrice)}
            </p>
          </div>
          <div>
            <p className={cn(
              'text-[10px] font-medium uppercase tracking-wider',
              isUrgent ? 'text-accent-500' : 'text-primary-600',
            )}>
              {isAr ? 'المزايدة الحالية' : 'Current Bid'}
            </p>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              <motion.p
                key={currentBid}
                initial={{ scale: 1.15, color: '#059669' }}
                animate={{ scale: 1, color: isUrgent ? '#f9395f' : '#12456e' }}
                className="text-xl font-bold tabular-nums"
              >
                {formatOMR(currentBid || startingPrice)}
              </motion.p>
              {totalExtensions > 0 && (
                <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                  <Zap className="mr-0.5 inline h-3 w-3" />
                  +{totalExtensions}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ─── Ends In Timer (red-themed) ─── */}
        {isLive && !isEnded && (
          <div className="mt-3 border-t border-slate-100 pt-3">
            <div className="mb-2 flex items-center gap-1.5">
              <Clock className={cn('h-3 w-3', isUrgent ? 'text-accent-500' : 'text-red-400')} />
              <span className={cn(
                'text-[10px] font-semibold uppercase tracking-wider',
                isUrgent ? 'text-accent-500' : 'text-red-400',
              )}>
                {isAr ? 'ينتهي بعد' : 'Ends in'}
              </span>
              {isUrgent && (
                <span className="animate-pulse rounded-full bg-accent-100 px-2 py-0.5 text-[10px] font-bold text-accent-600">
                  {isAr ? 'ينتهي قريباً!' : 'Ending Soon!'}
                </span>
              )}
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              <TimeBlock value={endTimeLeft.days} label={isAr ? 'يوم' : 'Days'} color="red" urgent={isUrgent} />
              <TimeBlock value={endTimeLeft.hours} label={isAr ? 'ساعة' : 'Hrs'} color="red" urgent={isUrgent} />
              <TimeBlock value={endTimeLeft.minutes} label={isAr ? 'دقيقة' : 'Min'} color="red" urgent={isUrgent} />
              <TimeBlock value={endTimeLeft.seconds} label={isAr ? 'ثانية' : 'Sec'} color="red" urgent={isUrgent} accent />
            </div>
          </div>
        )}

        {/* Starts In Timer (amber/blue-themed) */}
        {isUpcoming && startDate && startTimeLeft.total > 0 && (
          <div className="mt-3 border-t border-slate-100 pt-3">
            <div className="mb-2 flex items-center gap-1.5">
              <Clock className="h-3 w-3 text-blue-500" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-500">
                {isAr ? 'يبدأ بعد' : 'Starts in'}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              <TimeBlock value={startTimeLeft.days} label={isAr ? 'يوم' : 'Days'} color="blue" />
              <TimeBlock value={startTimeLeft.hours} label={isAr ? 'ساعة' : 'Hrs'} color="blue" />
              <TimeBlock value={startTimeLeft.minutes} label={isAr ? 'دقيقة' : 'Min'} color="blue" />
              <TimeBlock value={startTimeLeft.seconds} label={isAr ? 'ثانية' : 'Sec'} color="blue" />
            </div>
          </div>
        )}
      </div>

      {/* ─── Bid Actions ─── */}
      {(isLive || isUpcoming) && !isEnded && (
        <AnimatePresence mode="wait">
          {!isAuthenticated ? (
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-2"
            >
              <Button
                size="lg"
                onClick={onLogin}
                className="w-full bg-primary-700 text-sm font-semibold hover:bg-primary-800"
              >
                <Lock className="me-2 h-4 w-4" />
                {isAr ? 'سجل دخولك للمزايدة' : 'Sign in to Bid'}
              </Button>
            </motion.div>
          ) : !isRegistered ? (
            <motion.div
              key="deposit"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-2"
            >
              <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <div>
                  <p className="text-xs font-semibold text-amber-800">
                    {isAr ? 'التسجيل مطلوب' : 'Registration Required'}
                  </p>
                  <p className="mt-0.5 text-[11px] text-amber-700">
                    {isAr
                      ? `ادفع تأمين ${formatOMR(depositAmount)} للمشاركة`
                      : `Pay ${formatOMR(depositAmount)} deposit to participate`}
                  </p>
                </div>
              </div>
              <Button
                size="lg"
                onClick={onPayDeposit}
                className="w-full bg-amber-500 text-sm font-semibold text-white hover:bg-amber-600"
              >
                <Shield className="me-2 h-4 w-4" />
                {isAr ? 'ادفع التأمين' : 'Pay Deposit'} — {formatOMR(depositAmount)}
              </Button>
            </motion.div>
          ) : isUpcoming ? (
            <motion.div
              key="registered-upcoming"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <Shield className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <div>
                  <p className="text-xs font-semibold text-emerald-800">
                    {isAr ? 'أنت مسجل!' : "You're Registered!"}
                  </p>
                  <p className="mt-0.5 text-[11px] text-emerald-700">
                    {isAr ? 'ستتمكن من المزايدة عند بدء المزاد' : 'You can bid once the auction goes live'}
                  </p>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="bid"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-2.5"
            >
              {/* Increment selector */}
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {isAr ? 'اختر قيمة الزيادة' : 'Bid Increment'}
              </p>
              <div className="flex gap-1.5">
                {bidIncrements.map((inc, i) => (
                  <button
                    key={i}
                    onClick={() => handleIncrementSelect(i)}
                    className={cn(
                      'flex-1 rounded-lg border px-2 py-1.5 text-center text-xs font-semibold transition-all',
                      safeIncrement === i
                        ? 'border-primary-500 bg-primary-50 text-primary-700 ring-1 ring-primary-200'
                        : 'border-slate-200 text-slate-500 hover:border-primary-300',
                    )}
                  >
                    +{formatOMR(inc)}
                  </button>
                ))}
              </div>

              {/* Plus / Minus with readonly bid price */}
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/50 p-1.5">
                <button
                  onClick={() => setMultiplier(Math.max(1, multiplier - 1))}
                  disabled={multiplier <= 1}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-100 disabled:opacity-30"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <div className="flex-1 text-center">
                  <p className="text-lg font-bold tabular-nums text-slate-900">
                    {formatOMR(bidAmount)}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {formatOMR(basePrice)} + {multiplier}×{formatOMR(increment)}
                  </p>
                </div>
                <button
                  onClick={() => setMultiplier(Math.min(multiplier + 1, MAX_MULTIPLIER))}
                  disabled={multiplier >= MAX_MULTIPLIER}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-100"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <Button
                size="lg"
                disabled={isBidding}
                onClick={handleBid}
                className={cn(
                  'w-full text-sm font-bold shadow-lg transition-all',
                  isUrgent
                    ? 'bg-accent-500 shadow-accent-500/30 hover:bg-accent-600'
                    : 'bg-primary-700 shadow-primary-700/20 hover:bg-primary-800',
                )}
              >
                {isBidding ? (
                  <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    {isAr ? 'جاري المزايدة...' : 'Placing Bid...'}
                  </motion.div>
                ) : (
                  <>
                    <Gavel className="me-2 h-4 w-4" />
                    {isAr ? 'قدم مزايدة' : 'Place Bid'} — {formatOMR(bidAmount)}
                  </>
                )}
              </Button>

              <p className="text-center text-[10px] text-slate-400">
                <Shield className="me-1 inline h-3 w-3" />
                {isAr
                  ? 'المزايدة ملزمة وغير قابلة للإلغاء'
                  : 'Bids are binding and non-reversible'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Ended state */}
      {(isEnded && !isUpcoming) && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
          <Gavel className="mx-auto h-5 w-5 text-slate-400" />
          <p className="mt-1.5 text-sm font-semibold text-slate-600">
            {isAr ? 'انتهى المزاد' : 'Auction Ended'}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            {isAr ? 'تم إغلاق هذا المزاد' : 'This auction has been closed'}
          </p>
        </div>
      )}
    </div>
  )
}

function TimeBlock({
  value,
  label,
  color,
  urgent,
  accent,
}: {
  value: number
  label: string
  color?: 'red' | 'blue'
  urgent?: boolean
  accent?: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-lg p-1.5 text-center transition-colors',
        urgent
          ? accent ? 'bg-accent-100/80' : 'bg-accent-50/60'
          : color === 'red'
            ? 'bg-red-50/60'
            : color === 'blue'
              ? 'bg-blue-50/60'
              : 'bg-white',
      )}
    >
      <motion.div
        key={value}
        initial={{ y: -3, opacity: 0.6 }}
        animate={{ y: 0, opacity: 1 }}
        className={cn(
          'text-lg font-bold tabular-nums',
          urgent
            ? 'text-accent-600'
            : color === 'red'
              ? 'text-red-600'
              : color === 'blue'
                ? 'text-blue-600'
                : 'text-slate-800',
        )}
      >
        {String(value).padStart(2, '0')}
      </motion.div>
      <div className="text-[9px] font-medium uppercase text-slate-400">{label}</div>
    </div>
  )
}
