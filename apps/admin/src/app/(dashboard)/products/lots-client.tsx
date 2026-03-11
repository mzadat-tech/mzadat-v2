'use client'

import { useState, useEffect, useTransition, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Package, Plus, Pencil, Trash2, Loader2, Search,
  Gavel, ShoppingBag, Eye,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  RotateCcw, ChevronDown, Check, X,
} from 'lucide-react'
import { format, parse } from 'date-fns'
import { DatePicker } from '@mzadat/ui/components/date-picker'
import type { LotRow, LotStats, LotListResult, LotFilters, MerchantOption, DropdownOption } from '@/lib/actions/lots'
import { deleteLot, getLots, getLotsPageData } from '@/lib/actions/lots'

// ── Stat Card ────────────────────────────────────────────────────

function StatCard({ label, value, subtext, icon: Icon, color }: {
  label: string
  value: string | number
  subtext?: string
  icon: React.ElementType
  color: string
}) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
  }
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3.5">
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-medium text-gray-500">{label}</p>
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${colorMap[color] ?? colorMap.blue}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
      <p className="mt-1 text-[22px] font-semibold tracking-tight text-gray-900">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      {subtext && <p className="mt-0.5 text-[11px] text-gray-400">{subtext}</p>}
    </div>
  )
}

// ── Badges ───────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: 'border-gray-200 bg-gray-50 text-gray-500',
    pending: 'border-amber-200 bg-amber-50 text-amber-600',
    published: 'border-emerald-200 bg-emerald-50 text-emerald-600',
    inactive: 'border-red-200 bg-red-50 text-red-500',
    closed: 'border-slate-200 bg-slate-50 text-slate-500',
  }
  return (
    <span className={`inline-flex rounded border px-1.5 py-0.5 text-[11px] font-medium capitalize ${map[status] ?? 'border-gray-200 bg-gray-50 text-gray-500'}`}>
      {status}
    </span>
  )
}

function SaleTypeBadge({ type }: { type: string }) {
  return type === 'auction' ? (
    <span className="inline-flex items-center gap-0.5 rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[11px] font-medium text-blue-600">
      <Gavel className="h-2.5 w-2.5" /> Auction
    </span>
  ) : (
    <span className="inline-flex items-center gap-0.5 rounded border border-purple-200 bg-purple-50 px-1.5 py-0.5 text-[11px] font-medium text-purple-600">
      <ShoppingBag className="h-2.5 w-2.5" /> Direct
    </span>
  )
}

// ── Delete Confirm ───────────────────────────────────────────────

function DeleteConfirm({ lot, onClose, onDeleted }: {
  lot: LotRow
  onClose: () => void
  onDeleted: (id: string) => void
}) {
  const [isPending, startTransition] = useTransition()
  const blocked = lot.ordersCount > 0 || lot.bidsCount > 0

  const handleDelete = () => {
    startTransition(async () => {
      const res = await deleteLot(lot.id)
      if (res.error) toast.error(res.error)
      else { toast.success('Lot deleted'); onDeleted(lot.id) }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-5 shadow-lg space-y-4">
        <h3 className="text-[14px] font-semibold text-gray-900">Delete Lot</h3>
        {blocked ? (
          <p className="text-[13px] text-red-500">
            Cannot delete — this lot has {lot.ordersCount} order(s) and {lot.bidsCount} bid(s).
          </p>
        ) : (
          <p className="text-[13px] text-gray-600">
            Are you sure you want to delete <strong>{lot.nameEn}</strong>? This action cannot be undone.
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} disabled={isPending}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-[13px] font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleDelete} disabled={isPending || blocked}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 transition-colors">
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Pagination ───────────────────────────────────────────────────

function Pagination({ page, totalPages, total, perPage, onPageChange }: {
  page: number
  totalPages: number
  total: number
  perPage: number
  onPageChange: (p: number) => void
}) {
  if (totalPages <= 1) return null

  const from = (page - 1) * perPage + 1
  const to = Math.min(page * perPage, total)

  const pages: (number | '...')[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (page > 3) pages.push('...')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i)
    }
    if (page < totalPages - 2) pages.push('...')
    pages.push(totalPages)
  }

  return (
    <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
      <p className="text-[12px] text-gray-500">
        Showing <span className="font-medium text-gray-700">{from}–{to}</span> of{' '}
        <span className="font-medium text-gray-700">{total.toLocaleString()}</span>
      </p>
      <div className="flex items-center gap-1">
        <button onClick={() => onPageChange(1)} disabled={page === 1}
          className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <ChevronsLeft className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => onPageChange(page - 1)} disabled={page === 1}
          className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`dots-${i}`} className="px-1.5 text-[12px] text-gray-400">…</span>
          ) : (
            <button key={p} onClick={() => onPageChange(p)}
              className={`min-w-7 rounded-md px-1.5 py-1 text-[12px] font-medium transition-colors ${
                p === page ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}>
              {p}
            </button>
          )
        )}
        <button onClick={() => onPageChange(page + 1)} disabled={page === totalPages}
          className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => onPageChange(totalPages)} disabled={page === totalPages}
          className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <ChevronsRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

// ── Searchable Select ────────────────────────────────────────────

type SelectOption = { value: string; label: string }

function SearchableSelect({ value, onChange, options, placeholder = 'Select…' }: {
  value: string
  onChange: (v: string) => void
  options: SelectOption[]
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(
    () => query ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase())) : options,
    [options, query]
  )

  const selectedLabel = options.find((o) => o.value === value)?.label ?? placeholder

  // compute position when opening
  const updatePosition = useCallback(() => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const dropdownW = 224 // w-56 = 14rem = 224px
    const dropdownH = 280 // approx max height
    const vw = window.innerWidth
    const vh = window.innerHeight

    let left = rect.left
    if (left + dropdownW > vw - 8) left = Math.max(8, rect.right - dropdownW)

    let top = rect.bottom + 4
    if (top + dropdownH > vh - 8) top = Math.max(8, rect.top - dropdownH - 4)

    setPos({ top, left })
  }, [])

  // close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const t = e.target as Node
      if (containerRef.current?.contains(t) || dropdownRef.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // close on scroll / resize and reposition
  useEffect(() => {
    if (!open) return
    const onScrollOrResize = () => setOpen(false)
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [open])

  // focus search input & compute position when opened
  useEffect(() => {
    if (open) {
      setQuery('')
      updatePosition()
      setTimeout(() => inputRef.current?.focus(), 0)
    } else {
      setPos(null)
    }
  }, [open, updatePosition])

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button type="button" onClick={() => setOpen((o) => !o)}
        className={`inline-flex h-8 items-center gap-1 rounded-lg border bg-white pl-3 pr-2 text-[13px] transition-colors ${
          open ? 'border-blue-400 ring-1 ring-blue-400' : 'border-gray-200 hover:border-gray-300'
        } ${value && value !== 'all' ? 'text-gray-900' : 'text-gray-500'}`}>
        <span className="max-w-[140px] truncate">{selectedLabel}</span>
        {value && value !== 'all' ? (
          <span onClick={(e) => { e.stopPropagation(); onChange('all'); setOpen(false) }}
            className="ml-0.5 rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
            <X className="h-3 w-3" />
          </span>
        ) : (
          <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        )}
      </button>

      {/* Dropdown — rendered fixed to viewport so it never causes page overflow */}
      {open && pos && (
        <div ref={dropdownRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}
          className="w-56 rounded-lg border border-gray-200 bg-white shadow-lg">
          {/* Search input */}
          {options.length > 5 && (
            <div className="border-b border-gray-100 p-1.5">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                <input ref={inputRef} type="text" value={query} onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search…"
                  className="h-7 w-full rounded-md border border-gray-200 bg-gray-50 pl-7 pr-2 text-[12px] text-gray-700 placeholder-gray-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
            </div>
          )}
          {/* Options list */}
          <div className="max-h-52 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="px-2.5 py-3 text-center text-[12px] text-gray-400">No results</p>
            ) : (
              filtered.map((opt) => (
                <button key={opt.value} type="button"
                  onClick={() => { onChange(opt.value); setOpen(false) }}
                  className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors ${
                    opt.value === value
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}>
                  <Check className={`h-3 w-3 shrink-0 ${opt.value === value ? 'text-blue-600' : 'text-transparent'}`} />
                  <span className="truncate">{opt.label}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Skeleton Components ──────────────────────────────────────────

function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3.5 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-3 w-16 rounded bg-gray-200" />
        <div className="h-7 w-7 rounded-lg bg-gray-100" />
      </div>
      <div className="mt-2 h-6 w-12 rounded bg-gray-200" />
      <div className="mt-1.5 h-2.5 w-20 rounded bg-gray-100" />
    </div>
  )
}

function TableRowSkeleton() {
  return (
    <tr className="border-b border-gray-50 last:border-0">
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 shrink-0 rounded-md bg-gray-100 animate-pulse" />
          <div className="space-y-1">
            <div className="h-3.5 w-28 rounded bg-gray-200 animate-pulse" />
            <div className="h-2.5 w-20 rounded bg-gray-100 animate-pulse" />
          </div>
        </div>
      </td>
      <td className="px-4 py-2.5"><div className="h-3.5 w-16 rounded bg-gray-100 animate-pulse" /></td>
      <td className="px-4 py-2.5"><div className="h-3.5 w-20 rounded bg-gray-100 animate-pulse" /></td>
      <td className="px-4 py-2.5 text-center"><div className="mx-auto h-5 w-16 rounded bg-gray-100 animate-pulse" /></td>
      <td className="px-4 py-2.5 text-right"><div className="ml-auto h-3.5 w-16 rounded bg-gray-100 animate-pulse" /></td>
      <td className="px-4 py-2.5 text-center"><div className="mx-auto h-3.5 w-6 rounded bg-gray-100 animate-pulse" /></td>
      <td className="px-4 py-2.5 text-center"><div className="mx-auto h-3.5 w-6 rounded bg-gray-100 animate-pulse" /></td>
      <td className="px-4 py-2.5 text-center"><div className="mx-auto h-3.5 w-6 rounded bg-gray-100 animate-pulse" /></td>
      <td className="px-4 py-2.5 text-center"><div className="mx-auto h-5 w-14 rounded bg-gray-100 animate-pulse" /></td>
      <td className="px-4 py-2.5"><div className="h-3.5 w-16 rounded bg-gray-100 animate-pulse" /></td>
      <td className="px-4 py-2.5 text-right"><div className="ml-auto h-5 w-12 rounded bg-gray-100 animate-pulse" /></td>
    </tr>
  )
}

function PageSkeleton() {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[15px] font-semibold tracking-tight text-gray-900">Lots</h1>
          <p className="text-[13px] text-gray-400">Manage all auction and direct-sale lots</p>
        </div>
        <Link href="/products/create"
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-[13px] font-medium text-white hover:bg-blue-700 transition-colors">
          <Plus className="h-3.5 w-3.5" /> New Lot
        </Link>
      </div>

      {/* Stat card skeletons */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      {/* Filter bar skeleton */}
      <div className="rounded-xl border border-gray-200 bg-white p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-20 flex-1">
            <div className="h-8 w-full rounded-lg border border-gray-200 bg-gray-50 animate-pulse" />
          </div>
          <div className="h-8 w-24 rounded-lg bg-gray-50 animate-pulse" />
          <div className="h-8 w-24 rounded-lg bg-gray-50 animate-pulse" />
          <div className="h-8 w-28 rounded-lg bg-gray-50 animate-pulse" />
          <div className="h-8 w-28 rounded-lg bg-gray-50 animate-pulse" />
        </div>
      </div>

      {/* Table skeleton */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-2.5 text-left text-[12px] font-medium text-gray-400">Lot</th>
                <th className="px-4 py-2.5 text-left text-[12px] font-medium text-gray-400">Category</th>
                <th className="px-4 py-2.5 text-left text-[12px] font-medium text-gray-400">Merchant</th>
                <th className="px-4 py-2.5 text-center text-[12px] font-medium text-gray-400">Type</th>
                <th className="px-4 py-2.5 text-right text-[12px] font-medium text-gray-400">Price</th>
                <th className="px-4 py-2.5 text-center text-[12px] font-medium text-gray-400">Qty</th>
                <th className="px-4 py-2.5 text-center text-[12px] font-medium text-gray-400">Orders</th>
                <th className="px-4 py-2.5 text-center text-[12px] font-medium text-gray-400">Bids</th>
                <th className="px-4 py-2.5 text-center text-[12px] font-medium text-gray-400">Status</th>
                <th className="px-4 py-2.5 text-left text-[12px] font-medium text-gray-400">Created</th>
                <th className="px-4 py-2.5 text-right text-[12px] font-medium text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 8 }).map((_, i) => <TableRowSkeleton key={i} />)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Main Client ──────────────────────────────────────────────────

export function LotsClient() {
  const router = useRouter()
  const [data, setData] = useState<LotListResult | null>(null)
  const [stats, setStats] = useState<LotStats | null>(null)
  const [merchants, setMerchants] = useState<MerchantOption[]>([])
  const [categories, setCategories] = useState<DropdownOption[]>([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<LotRow | null>(null)
  const [isLoading, startTransition] = useTransition()
  const hasFetched = useRef(false)

  // Filters
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [filterMerchant, setFilterMerchant] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)

  const hasActiveFilters = search || filterStatus !== 'all' || filterType !== 'all' ||
    filterMerchant !== 'all' || filterCategory !== 'all' || dateFrom || dateTo

  // Initial data load
  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true
    getLotsPageData().then(({ data: d, stats: s, dropdowns }) => {
      setData(d)
      setStats(s)
      setMerchants(dropdowns.merchants)
      setCategories(dropdowns.categories)
      setInitialLoading(false)
    }).catch(() => setInitialLoading(false))
  }, [])

  const fetchData = useCallback((newPage = 1) => {
    startTransition(async () => {
      const filters: LotFilters = { page: newPage, perPage: 20 }
      if (search.trim()) filters.search = search.trim()
      if (filterStatus !== 'all') filters.status = filterStatus
      if (filterType !== 'all') filters.saleType = filterType
      if (filterMerchant !== 'all') filters.merchantId = filterMerchant
      if (filterCategory !== 'all') filters.categoryId = filterCategory
      if (dateFrom) filters.dateFrom = dateFrom
      if (dateTo) filters.dateTo = dateTo

      const result = await getLots(filters)
      setData(result)
      setPage(newPage)
    })
  }, [search, filterStatus, filterType, filterMerchant, filterCategory, dateFrom, dateTo])

  // Debounced filter refetch (skip on initial mount)
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    const t = setTimeout(() => fetchData(1), 300)
    return () => clearTimeout(t)
  }, [fetchData])

  if (initialLoading || !data || !stats) return <PageSkeleton />

  const handlePageChange = (p: number) => fetchData(p)

  const clearFilters = () => {
    setSearch('')
    setFilterStatus('all')
    setFilterType('all')
    setFilterMerchant('all')
    setFilterCategory('all')
    setDateFrom('')
    setDateTo('')
  }

  const CURRENCY = 'OMR'

  return (
    <>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[15px] font-semibold tracking-tight text-gray-900">Lots</h1>
            <p className="text-[13px] text-gray-400">Manage all auction and direct-sale lots</p>
          </div>
          <Link href="/products/create"
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-[13px] font-medium text-white hover:bg-blue-700 transition-colors">
            <Plus className="h-3.5 w-3.5" /> New Lot
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Lots" value={stats.total} subtext={`${stats.draft} drafts`} icon={Package} color="blue" />
          <StatCard label="Published" value={stats.published} subtext={`${stats.auction} auction · ${stats.direct} direct`} icon={Eye} color="emerald" />
          <StatCard label="Total Bids" value={stats.totalBids} icon={Gavel} color="amber" />
          <StatCard label="Total Orders" value={stats.totalOrders} icon={ShoppingBag} color="purple" />
        </div>

        {/* Filters */}
        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative min-w-20 flex-1">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                type="search" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, slug, merchant…"
                className="h-8 w-full rounded-lg border border-gray-200 pl-8 pr-3 text-[13px] text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>

            <SearchableSelect
              value={filterType}
              onChange={setFilterType}
              placeholder="All types"
              options={[
                { value: 'all', label: 'All types' },
                { value: 'auction', label: 'Auction' },
                { value: 'direct', label: 'Direct' },
              ]}
            />

            <SearchableSelect
              value={filterStatus}
              onChange={setFilterStatus}
              placeholder="All statuses"
              options={[
                { value: 'all', label: 'All statuses' },
                { value: 'draft', label: 'Draft' },
                { value: 'pending', label: 'Pending' },
                { value: 'published', label: 'Published' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'closed', label: 'Closed' },
              ]}
            />

            <SearchableSelect
              value={filterMerchant}
              onChange={setFilterMerchant}
              placeholder="All merchants"
              options={[
                { value: 'all', label: 'All merchants' },
                ...merchants.map((m) => ({ value: m.id, label: m.name })),
              ]}
            />

            <SearchableSelect
              value={filterCategory}
              onChange={setFilterCategory}
              placeholder="All categories"
              options={[
                { value: 'all', label: 'All categories' },
                ...categories.map((c) => ({ value: c.id, label: c.nameEn })),
              ]}
            />
          </div>

          {/* Date range row */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <DatePicker
              placeholder="From date"
              dateFormat="dd MMM yyyy"
              value={dateFrom ? parse(dateFrom, 'yyyy-MM-dd', new Date()) : null}
              onChange={(d) => setDateFrom(d ? format(d, 'yyyy-MM-dd') : '')}
            />
            <span className="text-[12px] text-gray-400">to</span>
            <DatePicker
              placeholder="To date"
              dateFormat="dd MMM yyyy"
              value={dateTo ? parse(dateTo, 'yyyy-MM-dd', new Date()) : null}
              onChange={(d) => setDateTo(d ? format(d, 'yyyy-MM-dd') : '')}
            />

            {hasActiveFilters && (
              <button onClick={clearFilters}
                className="ml-auto inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-[12px] font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                <RotateCcw className="h-3 w-3" /> Clear filters
              </button>
            )}

            <span className={`${hasActiveFilters ? '' : 'ml-auto'} text-[12px] text-gray-400`}>
              {isLoading ? (
                <span className="inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Loading…</span>
              ) : (
                `${data.total.toLocaleString()} lot${data.total === 1 ? '' : 's'}`
              )}
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-gray-200 bg-white">
          {data.rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100">
                <Package className="h-6 w-6 text-gray-400" />
              </div>
              <p className="mt-3 text-[14px] font-medium text-gray-600">
                {hasActiveFilters ? 'No lots match your filters' : 'No lots yet'}
              </p>
              {!hasActiveFilters ? (
                <Link href="/products/create" className="mt-3 text-[13px] font-medium text-blue-600 hover:text-blue-700">
                  Create your first lot →
                </Link>
              ) : (
                <button onClick={clearFilters} className="mt-3 text-[13px] font-medium text-blue-600 hover:text-blue-700">
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-4 py-2.5 text-left text-[12px] font-medium text-gray-400">Lot</th>
                      <th className="px-4 py-2.5 text-left text-[12px] font-medium text-gray-400">Category</th>
                      <th className="px-4 py-2.5 text-left text-[12px] font-medium text-gray-400">Merchant</th>
                      <th className="px-4 py-2.5 text-center text-[12px] font-medium text-gray-400">Type</th>
                      <th className="px-4 py-2.5 text-right text-[12px] font-medium text-gray-400">Price</th>
                      <th className="px-4 py-2.5 text-center text-[12px] font-medium text-gray-400">Qty</th>
                      <th className="px-4 py-2.5 text-center text-[12px] font-medium text-gray-400">Orders</th>
                      <th className="px-4 py-2.5 text-center text-[12px] font-medium text-gray-400">Bids</th>
                      <th className="px-4 py-2.5 text-center text-[12px] font-medium text-gray-400">Status</th>
                      <th className="px-4 py-2.5 text-left text-[12px] font-medium text-gray-400">Created</th>
                      <th className="px-4 py-2.5 text-right text-[12px] font-medium text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((lot) => (
                      <tr key={lot.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-2.5">
                          <Link href={`/products/${lot.id}/edit`} className="flex items-center gap-2 group">
                            {lot.featureImageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={lot.featureImageUrl} alt={lot.nameEn} className="h-8 w-8 shrink-0 rounded-md object-cover" />
                            ) : (
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gray-100">
                                <Package className="h-4 w-4 text-gray-400" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">{lot.nameEn}</p>
                              {lot.nameAr && <p className="text-[11px] text-gray-400" dir="rtl">{lot.nameAr}</p>}
                              {/* <p className="font-mono text-[11px] text-gray-400">{lot.slug}</p> */}
                            </div>
                          </Link>
                        </td>
                        <td className="px-4 py-2.5 text-gray-500">
                          {lot.categoryNameEn ? (
                            <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[12px]">{lot.categoryNameEn}</span>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-[12px] text-gray-600">{lot.merchantName}</td>
                        <td className="px-4 py-2.5 text-center"><SaleTypeBadge type={lot.saleType} /></td>
                        <td className="px-4 py-2.5 text-right font-medium text-gray-900">{CURRENCY} {lot.price.toFixed(3)}</td>
                        <td className="px-4 py-2.5 text-center text-gray-600">{lot.quantity}</td>
                        <td className="px-4 py-2.5 text-center">
                          {lot.ordersCount > 0 ? (
                            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[12px] font-medium text-emerald-600">{lot.ordersCount}</span>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {lot.bidsCount > 0 ? (
                            <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[12px] font-medium text-blue-600">{lot.bidsCount}</span>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-center"><StatusBadge status={lot.status} /></td>
                        <td className="px-4 py-2.5 text-[12px] text-gray-500">
                          {new Date(lot.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="inline-flex items-center gap-1">
                            <Link href={`/products/${lot.id}/edit`}
                              className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors" title="Edit">
                              <Pencil className="h-3.5 w-3.5" />
                            </Link>
                            <button onClick={() => setDeleteTarget(lot)}
                              className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors" title="Delete">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={data.page} totalPages={data.totalPages} total={data.total} perPage={data.perPage} onPageChange={handlePageChange} />
            </>
          )}
        </div>
      </div>

      {deleteTarget && (
        <DeleteConfirm
          lot={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={(id) => {
            setDeleteTarget(null)
            fetchData(page)
            router.refresh()
          }}
        />
      )}
    </>
  )
}
