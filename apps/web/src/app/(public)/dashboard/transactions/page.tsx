'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Search,
  Loader2,
  Wallet,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Filter,
  X,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@mzadat/ui/components/card'
import { Input } from '@mzadat/ui/components/input'
import { Label } from '@mzadat/ui/components/label'
import { Button } from '@mzadat/ui'
import { Badge } from '@mzadat/ui/components/badge'
import { Separator } from '@mzadat/ui/components/separator'
import { formatOMR } from '@mzadat/ui/lib/utils'
import { fadeInUp, staggerContainer } from '@/lib/motion'
import { toast } from 'sonner'
import {
  getTransactions,
  exportTransactionsCsv,
  type WalletTransaction,
  type TransactionListResult,
} from '@/lib/wallet-api'

// ── Helpers ────────────────────────────────────────────

const TX_CREDIT_TYPES = new Set([
  'deposit', 'return', 'refund', 'release', 'admin_adjustment',
])
function isCreditTx(type: string) {
  return TX_CREDIT_TYPES.has(type)
}

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'deposit', label: 'Deposit' },
  { value: 'withdraw', label: 'Withdrawal' },
  { value: 'bid', label: 'Bid Hold' },
  { value: 'hold', label: 'Hold' },
  { value: 'release', label: 'Release' },
  { value: 'purchase', label: 'Purchase' },
  { value: 'bid_final_payment', label: 'Final Payment' },
  { value: 'return', label: 'Return' },
  { value: 'refund', label: 'Refund' },
  { value: 'commission', label: 'Commission' },
  { value: 'admin_adjustment', label: 'Adjustment' },
  { value: 'fee', label: 'Fee' },
]

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'failed', label: 'Failed' },
]

function txTypeLabel(type: string): string {
  const found = TYPE_OPTIONS.find((o) => o.value === type)
  return found?.label || type
}

const PAGE_SIZE = 15

// ── Page ──────────────────────────────────────────────

export default function TransactionsPage() {
  const [result, setResult] = useState<TransactionListResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  // Filters
  const [type, setType] = useState('')
  const [status, setStatus] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)

  const hasFilters = type || status || dateFrom || dateTo

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getTransactions({
        type: type || undefined,
        status: status || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        page,
        pageSize: PAGE_SIZE,
        sortBy: 'created_at',
        sortOrder: 'desc',
      })
      setResult(data)
    } catch (err: any) {
      toast.error(err.message || 'Failed to load transactions')
    } finally {
      setLoading(false)
    }
  }, [type, status, dateFrom, dateTo, page])

  useEffect(() => {
    load()
  }, [load])

  // reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [type, status, dateFrom, dateTo])

  async function handleExport() {
    setExporting(true)
    try {
      const csv = await exportTransactionsCsv({
        type: type || undefined,
        status: status || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      })
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `transactions_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Transactions exported')
    } catch (err: any) {
      toast.error(err.message || 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  function clearFilters() {
    setType('')
    setStatus('')
    setDateFrom('')
    setDateTo('')
  }

  const totalPages = result?.totalPages || 1
  const transactions = result?.data || []

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
      {/* Header */}
      <motion.div variants={fadeInUp} className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Transactions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your complete wallet transaction history
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-1"
          >
            <Filter className="h-3.5 w-3.5" />
            Filters
            {hasFilters && (
              <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary-600 text-[10px] text-white">
                !
              </span>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={exporting || loading}
            className="gap-1"
          >
            {exporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            Export CSV
          </Button>
        </div>
      </motion.div>

      {/* Filters */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Type</Label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Status</Label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">From Date</Label>
                  <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">To Date</Label>
                  <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </div>
              </div>
              {hasFilters && (
                <div className="mt-3 flex justify-end">
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-xs">
                    <X className="h-3 w-3" /> Clear Filters
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Transactions List */}
      <motion.div variants={fadeInUp}>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-primary-600" />
          </div>
        ) : transactions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Wallet className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="font-semibold">No transactions found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {hasFilters ? 'Try adjusting your filters' : 'Transactions will appear here once you make deposits or bids'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {result?.total || 0} Transaction{(result?.total || 0) !== 1 ? 's' : ''}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Page {page} of {totalPages}
                </p>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {transactions.map((tx) => (
                  <TransactionRow key={tx.id} tx={tx} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </motion.div>

      {/* Pagination */}
      {totalPages > 1 && (
        <motion.div variants={fadeInUp} className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex gap-1">
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let p: number
              if (totalPages <= 5) {
                p = i + 1
              } else if (page <= 3) {
                p = i + 1
              } else if (page >= totalPages - 2) {
                p = totalPages - 4 + i
              } else {
                p = page - 2 + i
              }
              return (
                <Button
                  key={p}
                  variant={p === page ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setPage(p)}
                >
                  {p}
                </Button>
              )
            })}
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </motion.div>
      )}
    </motion.div>
  )
}

// ── TransactionRow ────────────────────────────────────

function TransactionRow({ tx }: { tx: WalletTransaction }) {
  const credit = isCreditTx(tx.type)

  return (
    <div className="flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-muted/40">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2 ${credit ? 'bg-emerald-50' : 'bg-red-50'}`}>
          {credit ? (
            <ArrowDownRight className="h-4 w-4 text-emerald-600" />
          ) : (
            <ArrowUpRight className="h-4 w-4 text-red-600" />
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">{txTypeLabel(tx.type)}</p>
            <StatusBadge status={tx.status} />
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
            <p className="text-xs text-muted-foreground">
              {new Date(tx.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Asia/Muscat',
              })}
            </p>
            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              {tx.referenceNumber}
            </span>
            {tx.description && (
              <span className="text-xs text-muted-foreground">{tx.description}</span>
            )}
          </div>
        </div>
      </div>

      <div className="text-end">
        <p className={`text-sm font-bold ${credit ? 'text-emerald-600' : 'text-red-600'}`}>
          {credit ? '+' : '-'}{formatOMR(parseFloat(tx.amount))}
        </p>
        {tx.currency && (
          <p className="text-[10px] text-muted-foreground">{tx.currency}</p>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { class: string; label: string }> = {
    completed: { class: 'border-emerald-200 bg-emerald-50 text-emerald-700', label: 'Completed' },
    pending: { class: 'border-amber-200 bg-amber-50 text-amber-700', label: 'Pending' },
    rejected: { class: 'border-red-200 bg-red-50 text-red-700', label: 'Rejected' },
    failed: { class: 'border-red-200 bg-red-50 text-red-700', label: 'Failed' },
  }
  const c = config[status] || config.pending!
  return (
    <Badge variant="outline" className={`text-[10px] ${c.class}`}>
      {c.label}
    </Badge>
  )
}
