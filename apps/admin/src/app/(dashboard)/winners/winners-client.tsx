'use client'

import { useState, useTransition, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import {
  Trophy,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Search,
  Filter,
  Crown,
  Eye,
  X,
  Loader2,
  Check,
  CreditCard,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import type { WinnerRow, WinnerStats, WinnerGroup, GetWinnersParams } from '@/lib/actions/winners'
import {
  getWinners,
  getWinnerStats,
  getWinnerGroups,
  updateWinnerPaymentStatus,
  updateWinnerOrderStatus,
} from '@/lib/actions/winners'

// ── Constants ────────────────────────────────────────────────────

const PAYMENT_STATUSES = [
  { value: 'all', label: 'All' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'partial', label: 'Partial' },
  { value: 'paid', label: 'Paid' },
] as const

const ORDER_STATUSES = [
  { value: 'all', label: 'All' },
  { value: 'win', label: 'Win' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'completed', label: 'Completed' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'refunded', label: 'Refunded' },
] as const

const UPDATABLE_PAYMENT_STATUSES = [
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'partial', label: 'Partial Payment Done' },
  { value: 'paid', label: 'Fully Paid' },
] as const

const UPDATABLE_ORDER_STATUSES = [
  { value: 'win', label: 'Win (Pending)' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Mark as Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'completed', label: 'Completed' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'refunded', label: 'Refunded' },
] as const

// ── Helpers ──────────────────────────────────────────────────────

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-OM', { style: 'currency', currency: 'OMR' }).format(n)
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function localeName(name: Record<string, string> | null | undefined): string {
  if (!name) return '—'
  return name['en'] || name['ar'] || Object.values(name)[0] || '—'
}

// ── Color Maps ───────────────────────────────────────────────────

type StatusColorSet = {
  dot: string
  triggerBg: string
  triggerBorder: string
  triggerText: string
  optionBg: string       // bg when hovered / selected in list
  optionText: string
}

const PAYMENT_COLORS: Record<string, StatusColorSet> = {
  unpaid:  { dot: 'bg-red-500',     triggerBg: 'bg-red-50',     triggerBorder: 'border-red-200',     triggerText: 'text-red-700',     optionBg: 'bg-red-50',     optionText: 'text-red-700' },
  partial: { dot: 'bg-amber-500',   triggerBg: 'bg-amber-50',   triggerBorder: 'border-amber-200',   triggerText: 'text-amber-700',   optionBg: 'bg-amber-50',   optionText: 'text-amber-700' },
  paid:    { dot: 'bg-emerald-500', triggerBg: 'bg-emerald-50', triggerBorder: 'border-emerald-200', triggerText: 'text-emerald-700', optionBg: 'bg-emerald-50', optionText: 'text-emerald-700' },
}

const ORDER_COLORS: Record<string, StatusColorSet> = {
  win:        { dot: 'bg-amber-500',   triggerBg: 'bg-amber-50',   triggerBorder: 'border-amber-200',   triggerText: 'text-amber-700',   optionBg: 'bg-amber-50',   optionText: 'text-amber-700' },
  processing: { dot: 'bg-blue-500',    triggerBg: 'bg-blue-50',    triggerBorder: 'border-blue-200',    triggerText: 'text-blue-700',    optionBg: 'bg-blue-50',    optionText: 'text-blue-700' },
  shipped:    { dot: 'bg-indigo-500',  triggerBg: 'bg-indigo-50',  triggerBorder: 'border-indigo-200',  triggerText: 'text-indigo-700',  optionBg: 'bg-indigo-50',  optionText: 'text-indigo-700' },
  delivered:  { dot: 'bg-violet-500',  triggerBg: 'bg-violet-50',  triggerBorder: 'border-violet-200',  triggerText: 'text-violet-700',  optionBg: 'bg-violet-50',  optionText: 'text-violet-700' },
  completed:  { dot: 'bg-emerald-500', triggerBg: 'bg-emerald-50', triggerBorder: 'border-emerald-200', triggerText: 'text-emerald-700', optionBg: 'bg-emerald-50', optionText: 'text-emerald-700' },
  on_hold:    { dot: 'bg-orange-500',  triggerBg: 'bg-orange-50',  triggerBorder: 'border-orange-200',  triggerText: 'text-orange-700',  optionBg: 'bg-orange-50',  optionText: 'text-orange-700' },
  rejected:   { dot: 'bg-red-500',     triggerBg: 'bg-red-50',     triggerBorder: 'border-red-200',     triggerText: 'text-red-700',     optionBg: 'bg-red-50',     optionText: 'text-red-700' },
  refunded:   { dot: 'bg-gray-400',    triggerBg: 'bg-gray-50',    triggerBorder: 'border-gray-200',    triggerText: 'text-gray-500',    optionBg: 'bg-gray-100',   optionText: 'text-gray-600' },
}

const FALLBACK_COLORS: StatusColorSet = {
  dot: 'bg-gray-400', triggerBg: 'bg-gray-50', triggerBorder: 'border-gray-200',
  triggerText: 'text-gray-600', optionBg: 'bg-gray-50', optionText: 'text-gray-600',
}

// ── Color Dropdown ────────────────────────────────────────────────

interface DropdownOption {
  value: string
  label: string
}

interface ColorDropdownProps {
  value: string
  options: readonly DropdownOption[]
  colorMap: Record<string, StatusColorSet>
  onChange: (value: string) => void
  loading?: boolean
  /** 'sm' = compact for table rows, 'md' = full-width for modal */
  size?: 'sm' | 'md'
}

function ColorDropdown({ value, options, colorMap, onChange, loading = false, size = 'sm' }: ColorDropdownProps) {
  const [open, setOpen] = useState(false)
  const [panelPos, setPanelPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 })
  const wrapRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  const colors = colorMap[value] ?? FALLBACK_COLORS
  const currentLabel = options.find((o) => o.value === value)?.label ?? value

  // Close on outside click or any scroll (panel position would drift)
  useEffect(() => {
    if (!open) return
    function onMouse(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onScroll() { setOpen(false) }
    document.addEventListener('mousedown', onMouse)
    document.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('mousedown', onMouse)
      document.removeEventListener('scroll', onScroll, true)
    }
  }, [open])

  const handleOpen = () => {
    if (loading) return
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPanelPos({ top: r.bottom + 4, left: r.left, width: r.width })
    }
    setOpen((o) => !o)
  }

  const handleSelect = (v: string) => {
    setOpen(false)
    if (v !== value) onChange(v)
  }

  return (
    <div ref={wrapRef} className="relative inline-block">
      {/* Trigger */}
      <button
        ref={btnRef}
        type="button"
        onClick={handleOpen}
        disabled={loading}
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-medium transition-opacity disabled:opacity-60 ${
          size === 'sm' ? 'text-[11px]' : 'text-[12px] px-3 py-1'
        } ${colors.triggerBg} ${colors.triggerBorder} ${colors.triggerText}`}
      >
        {loading ? (
          <Loader2 className="h-2.5 w-2.5 animate-spin" />
        ) : (
          <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
        )}
        {currentLabel}
        <ChevronDown className={`h-2.5 w-2.5 opacity-60 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Panel — fixed positioning escapes overflow-hidden/auto on table & modal */}
      {open && (
        <div
          style={{
            position: 'fixed',
            top: panelPos.top,
            left: panelPos.left,
            ...(size === 'md' ? { width: panelPos.width } : { minWidth: 160 }),
          }}
          className="z-9999 rounded-lg border border-gray-200 bg-white py-1 shadow-xl"
        >
          {options.map((opt) => {
            const c = colorMap[opt.value] ?? FALLBACK_COLORS
            const isSelected = opt.value === value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelect(opt.value)}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-[12px] font-medium transition-colors ${
                  isSelected ? `${c.optionBg} ${c.optionText}` : `text-gray-700 hover:${c.optionBg} hover:${c.optionText}`
                }`}
              >
                <span className={`h-2 w-2 shrink-0 rounded-full ${c.dot}`} />
                <span className="flex-1 text-left">{opt.label}</span>
                {isSelected && <Check className="h-3 w-3 opacity-70" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Inline Status Dropdown (table rows — fires API action) ────────

interface InlineStatusDropdownProps {
  orderId: string
  value: string
  options: readonly DropdownOption[]
  colorMap: Record<string, StatusColorSet>
  type: 'payment' | 'order'
  onUpdated: () => void
}

function InlineStatusDropdown({ orderId, value, options, colorMap, type, onUpdated }: InlineStatusDropdownProps) {
  const [current, setCurrent] = useState(value)
  const [isPending, startTransition] = useTransition()

  // Keep in sync when parent data refreshes
  useEffect(() => { setCurrent(value) }, [value])

  const handleChange = (newValue: string) => {
    const prev = current
    setCurrent(newValue)
    startTransition(async () => {
      const result =
        type === 'payment'
          ? await updateWinnerPaymentStatus(orderId, newValue as 'unpaid' | 'partial' | 'paid')
          : await updateWinnerOrderStatus(orderId, newValue)

      if (result.error) {
        toast.error(result.error)
        setCurrent(prev)
      } else {
        toast.success(`${type === 'payment' ? 'Payment' : 'Order'} status updated`)
        onUpdated()
      }
    })
  }

  return (
    <ColorDropdown
      value={current}
      options={options}
      colorMap={colorMap}
      onChange={handleChange}
      loading={isPending}
      size="sm"
    />
  )
}

// ── Skeleton ─────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="space-y-0">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex gap-4 border-b border-gray-50 px-4 py-3">
          <div className="h-8 w-8 animate-pulse rounded-full bg-gray-100" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 w-32 animate-pulse rounded bg-gray-100" />
            <div className="h-3 w-24 animate-pulse rounded bg-gray-100" />
          </div>
          <div className="h-3.5 w-20 animate-pulse rounded bg-gray-100" />
          <div className="h-3.5 w-16 animate-pulse rounded bg-gray-100" />
          <div className="h-5 w-14 animate-pulse rounded bg-gray-100" />
          <div className="h-5 w-16 animate-pulse rounded bg-gray-100" />
        </div>
      ))}
    </div>
  )
}

// ── Stats Cards ──────────────────────────────────────────────────

function StatsCards({ stats }: { stats: WinnerStats | null }) {
  if (!stats) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl border border-gray-100 bg-gray-50" />
        ))}
      </div>
    )
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="rounded-xl border border-gray-100 bg-white p-4">
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-gray-400">Total Winners</span>
          <Trophy className="h-4 w-4 text-amber-400" />
        </div>
        <p className="mt-1 text-[22px] font-bold tracking-tight text-gray-900">{stats.total}</p>
      </div>
      <div className="rounded-xl border border-red-100 bg-red-50/40 p-4">
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-red-400">Unpaid</span>
          <AlertCircle className="h-4 w-4 text-red-400" />
        </div>
        <p className="mt-1 text-[22px] font-bold tracking-tight text-red-700">{stats.unpaid}</p>
        <p className="text-[11px] text-red-400">{formatCurrency(stats.unpaidAmount)}</p>
      </div>
      <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-4">
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-amber-500">Partial</span>
          <CreditCard className="h-4 w-4 text-amber-400" />
        </div>
        <p className="mt-1 text-[22px] font-bold tracking-tight text-amber-700">{stats.partial}</p>
      </div>
      <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-emerald-500">Paid</span>
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
        </div>
        <p className="mt-1 text-[22px] font-bold tracking-tight text-emerald-700">{stats.paid}</p>
      </div>
    </div>
  )
}

// ── Detail Modal ─────────────────────────────────────────────────

interface DetailModalProps {
  winner: WinnerRow
  onClose: () => void
  onUpdated: () => void
}

function DetailModal({ winner, onClose, onUpdated }: DetailModalProps) {
  const [paymentStatus, setPaymentStatus] = useState(winner.paymentStatus)
  const [orderStatus, setOrderStatus] = useState(winner.status)
  const [notes, setNotes] = useState(winner.notes ?? '')
  const [isPending, startTransition] = useTransition()

  const handleSave = () => {
    const paymentChanged = paymentStatus !== winner.paymentStatus
    const orderChanged = orderStatus !== winner.status

    if (!paymentChanged && !orderChanged && notes === (winner.notes ?? '')) {
      onClose()
      return
    }

    startTransition(async () => {
      const tasks: Promise<{ error?: string }>[] = []

      if (paymentChanged || (notes && !orderChanged)) {
        tasks.push(
          updateWinnerPaymentStatus(
            winner.id,
            paymentStatus as 'unpaid' | 'partial' | 'paid',
            notes || undefined,
          ),
        )
      }

      if (orderChanged) {
        tasks.push(
          updateWinnerOrderStatus(winner.id, orderStatus, notes || undefined),
        )
      }

      const results = await Promise.all(tasks)
      const firstError = results.find((r) => r.error)?.error

      if (firstError) {
        toast.error(firstError)
      } else {
        toast.success('Winner updated successfully')
        onUpdated()
      }
    })
  }

  const remainingAmount = winner.totalAmount - winner.depositAmount

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-[2px]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-xl rounded-xl border border-gray-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
          <div>
            <h2 className="text-[14px] font-semibold text-gray-900">
              {winner.orderNumber}
            </h2>
            <p className="text-[12px] text-gray-400">Winner Details &amp; Status Update</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto px-5 py-4 space-y-4">
          {/* Winner Info */}
          <div className="rounded-lg border border-gray-100 bg-gray-50/60 p-3 space-y-1.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Winner</p>
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-semibold text-gray-900">
                {winner.user.firstName} {winner.user.lastName}
              </span>
              {winner.user.isVip && <Crown className="h-3.5 w-3.5 text-amber-500" />}
              <span className="text-[11px] font-medium text-gray-400">{winner.user.customId}</span>
            </div>
            <p className="text-[12px] text-gray-500">{winner.user.email}</p>
            {winner.user.phone && (
              <p className="text-[12px] text-gray-400">{winner.user.phone}</p>
            )}
          </div>

          {/* Lot Info */}
          <div className="rounded-lg border border-gray-100 bg-gray-50/60 p-3 space-y-1">
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Winning Lot</p>
            <p className="text-[13px] font-medium text-gray-900">{localeName(winner.product.name)}</p>
            {winner.group && (
              <p className="text-[12px] text-gray-500">
                Group: {localeName(winner.group.name)}
              </p>
            )}
            <p className="text-[11px] font-mono text-gray-400">{winner.product.slug}</p>
          </div>

          {/* Amount Breakdown */}
          <div className="rounded-lg border border-gray-100 p-3 space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Amount Breakdown</p>
            {[
              { label: 'Winning Bid', value: winner.bidAmount },
              { label: 'Tax (VAT)', value: winner.taxAmount },
              { label: 'Commission', value: winner.commissionAmount },
            ].map(({ label, value }) =>
              value > 0 ? (
                <div key={label} className="flex items-center justify-between text-[13px]">
                  <span className="text-gray-500">{label}</span>
                  <span className="text-gray-700">{formatCurrency(value)}</span>
                </div>
              ) : null,
            )}
            <div className="border-t border-gray-100 pt-2 flex items-center justify-between text-[13px] font-semibold">
              <span className="text-gray-900">Total Due</span>
              <span className="text-gray-900">{formatCurrency(winner.totalAmount)}</span>
            </div>
            {winner.depositPaid && winner.depositAmount > 0 && (
              <>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-gray-500">Deposit Paid</span>
                  <span className="text-emerald-600">− {formatCurrency(winner.depositAmount)}</span>
                </div>
                <div className="flex items-center justify-between text-[13px] font-semibold">
                  <span className="text-gray-900">Remaining</span>
                  <span className={remainingAmount > 0 ? 'text-red-600' : 'text-emerald-600'}>
                    {formatCurrency(Math.max(0, remainingAmount))}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Won On */}
          <div className="rounded-lg border border-gray-100 p-2.5">
            <p className="text-[11px] text-gray-400">Won On</p>
            <p className="mt-0.5 text-[12px] font-medium text-gray-700">{formatDate(winner.createdAt)}</p>
          </div>

          {/* Update Payment Status */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-gray-700">Payment Status</label>
            <ColorDropdown
              value={paymentStatus}
              options={UPDATABLE_PAYMENT_STATUSES}
              colorMap={PAYMENT_COLORS}
              onChange={setPaymentStatus}
              size="md"
            />
          </div>

          {/* Update Order / Lot Status */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-gray-700">Order / Lot Status</label>
            <ColorDropdown
              value={orderStatus}
              options={UPDATABLE_ORDER_STATUSES}
              colorMap={ORDER_COLORS}
              onChange={setOrderStatus}
              size="md"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-gray-700">Admin Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes (optional)..."
              rows={2}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] text-gray-700 placeholder-gray-400 focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[13px] font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isPending}
            className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-1.5 text-[13px] font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}



// ── Main Component ───────────────────────────────────────────────

export function WinnersClient() {
  const [winners, setWinners] = useState<WinnerRow[]>([])
  const [stats, setStats] = useState<WinnerStats | null>(null)
  const [groups, setGroups] = useState<WinnerGroup[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<WinnerRow | null>(null)

  // Filters
  const [paymentStatus, setPaymentStatus] = useState('all')
  const [orderStatus, setOrderStatus] = useState('all')
  const [groupId, setGroupId] = useState('all')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 20
  const totalPages = Math.ceil(total / pageSize)

  // Load groups once on mount
  useEffect(() => {
    getWinnerGroups()
      .then(setGroups)
      .catch(() => {})
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params: GetWinnersParams = {
        page,
        pageSize,
        paymentStatus,
        status: orderStatus,
        groupId,
        search: search || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }
      const [result, statsResult] = await Promise.all([
        getWinners(params),
        getWinnerStats(),
      ])
      setWinners(result.data)
      setTotal(result.total)
      setStats(statsResult)
    } catch {
      toast.error('Failed to load winners')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, paymentStatus, orderStatus, groupId, search, dateFrom, dateTo])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleFilterChange = (key: string, val: string) => {
    setPage(1)
    if (key === 'paymentStatus') setPaymentStatus(val)
    else if (key === 'orderStatus') setOrderStatus(val)
    else if (key === 'groupId') setGroupId(val)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  const handleDetailUpdated = () => {
    setDetail(null)
    fetchData()
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[15px] font-semibold tracking-tight text-gray-900">Winners</h1>
          <p className="text-[13px] text-gray-400">
            Manage auction winners, payment statuses, and order fulfillment
          </p>
        </div>
        {total > 0 && (
          <span className="text-[13px] text-gray-500">
            {total} winner{total !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Stats */}
      <StatsCards stats={stats} />

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <form onSubmit={handleSearch} className="relative flex items-center">
          <Search className="absolute left-2.5 h-3.5 w-3.5 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Order #, name, email…"
            className="h-8 rounded-lg border border-gray-200 bg-white pl-8 pr-3 text-[13px] text-gray-700 placeholder-gray-400 focus:border-gray-300 focus:outline-none w-48"
          />
        </form>

        {/* Payment Status */}
        <div className="flex items-center gap-1">
          <Filter className="h-3.5 w-3.5 text-gray-400" />
          {PAYMENT_STATUSES.map((s) => (
            <button
              key={s.value}
              onClick={() => handleFilterChange('paymentStatus', s.value)}
              className={`rounded-lg px-2.5 py-1 text-[12px] font-medium capitalize transition-colors ${
                paymentStatus === s.value
                  ? 'bg-gray-900 text-white'
                  : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Order Status */}
        <select
          value={orderStatus}
          onChange={(e) => handleFilterChange('orderStatus', e.target.value)}
          className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-[13px] text-gray-700 focus:outline-none"
        >
          {ORDER_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label === 'All' ? 'All Statuses' : s.label}
            </option>
          ))}
        </select>

        {/* Group Filter */}
        {groups.length > 0 && (
          <select
            value={groupId}
            onChange={(e) => handleFilterChange('groupId', e.target.value)}
            className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-[13px] text-gray-700 focus:outline-none max-w-45"
          >
            <option value="all">All Groups</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {localeName(g.name)} ({g.winnerCount})
              </option>
            ))}
          </select>
        )}

        {/* Date Range */}
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value)
            setPage(1)
          }}
          className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-[12px] text-gray-600 focus:outline-none"
        />
        <span className="text-[12px] text-gray-400">–</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value)
            setPage(1)
          }}
          className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-[12px] text-gray-600 focus:outline-none"
        />

        {/* Clear filters */}
        {(paymentStatus !== 'all' || orderStatus !== 'all' || groupId !== 'all' || search || dateFrom || dateTo) && (
          <button
            onClick={() => {
              setPaymentStatus('all')
              setOrderStatus('all')
              setGroupId('all')
              setSearch('')
              setSearchInput('')
              setDateFrom('')
              setDateTo('')
              setPage(1)
            }}
            className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[12px] text-gray-500 hover:bg-gray-50"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        {loading ? (
          <TableSkeleton />
        ) : winners.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100">
              <Trophy className="h-6 w-6 text-gray-400" />
            </div>
            <p className="mt-3 text-[13px] font-medium text-gray-500">No winners found</p>
            <p className="text-[12px] text-gray-400">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-gray-400">
                    Order / Winner
                  </th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-gray-400">
                    Winning Lot
                  </th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wide text-gray-400">
                    Bid
                  </th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wide text-gray-400">
                    Total
                  </th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-gray-400">
                    Payment
                  </th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-gray-400">
                    Lot Status
                  </th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-gray-400">
                    Date
                  </th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wide text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {winners.map((w) => (
                  <tr key={w.id} className="border-b border-gray-50 hover:bg-gray-50/40 transition-colors">
                    {/* Order / Winner */}
                    <td className="px-4 py-3">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[12px] font-semibold text-gray-700">
                            {w.orderNumber}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-1">
                          <span className="text-[12px] text-gray-600">
                            {w.user.firstName} {w.user.lastName}
                          </span>
                          {w.user.isVip && (
                            <Crown className="h-3 w-3 text-amber-500" />
                          )}
                        </div>
                        <div className="text-[11px] text-gray-400">{w.user.customId}</div>
                      </div>
                    </td>

                    {/* Winning Lot */}
                    <td className="px-4 py-3">
                      <div className="max-w-45">
                        <p className="truncate text-[13px] font-medium text-gray-900">
                          {localeName(w.product.name)}
                        </p>
                        {w.group && (
                          <p className="truncate text-[11px] text-gray-400">
                            {localeName(w.group.name)}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Bid Amount */}
                    <td className="px-4 py-3 text-right">
                      <span className="font-medium text-gray-900">
                        {formatCurrency(w.bidAmount)}
                      </span>
                    </td>

                    {/* Total Amount */}
                    <td className="px-4 py-3 text-right">
                      <span className="font-semibold text-gray-900">
                        {formatCurrency(w.totalAmount)}
                      </span>
                      {w.depositPaid && w.depositAmount > 0 && (
                        <div className="text-[10px] text-emerald-600">
                          −{formatCurrency(w.depositAmount)} dep.
                        </div>
                      )}
                    </td>

                    {/* Payment Status */}
                    <td className="px-4 py-3">
                      <InlineStatusDropdown
                        orderId={w.id}
                        value={w.paymentStatus}
                        options={UPDATABLE_PAYMENT_STATUSES}
                        colorMap={PAYMENT_COLORS}
                        type="payment"
                        onUpdated={fetchData}
                      />
                    </td>

                    {/* Order / Lot Status */}
                    <td className="px-4 py-3">
                      <InlineStatusDropdown
                        orderId={w.id}
                        value={w.status}
                        options={UPDATABLE_ORDER_STATUSES}
                        colorMap={ORDER_COLORS}
                        type="order"
                        onUpdated={fetchData}
                      />
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3">
                      <span className="text-[12px] text-gray-500">{formatDate(w.createdAt)}</span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setDetail(w)}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                        title="View details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2.5">
            <span className="text-[12px] text-gray-400">
              Page {page} of {totalPages} &bull; {total} total
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {/* Page number pills */}
              {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                const p =
                  totalPages <= 7
                    ? i + 1
                    : page <= 4
                      ? i + 1
                      : page >= totalPages - 3
                        ? totalPages - 6 + i
                        : page - 3 + i
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`h-6 min-w-6 rounded px-1.5 text-[12px] font-medium transition-colors ${
                      p === page
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    {p}
                  </button>
                )
              })}

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {detail && (
        <DetailModal
          winner={detail}
          onClose={() => setDetail(null)}
          onUpdated={handleDetailUpdated}
        />
      )}
    </div>
  )
}
