'use client'

import { useState, useTransition, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  ArrowLeftRight,
  Download,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  ExternalLink,
  Loader2,
} from 'lucide-react'
import type { TransactionRow } from '@/lib/actions/wallet'
import { getTransactions, exportTransactionsCsv } from '@/lib/actions/wallet'

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

function TypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    deposit: 'border-emerald-200 bg-emerald-50 text-emerald-600',
    withdraw: 'border-red-200 bg-red-50 text-red-600',
    bid: 'border-blue-200 bg-blue-50 text-blue-600',
    purchase: 'border-violet-200 bg-violet-50 text-violet-600',
    sale: 'border-teal-200 bg-teal-50 text-teal-600',
    refund: 'border-amber-200 bg-amber-50 text-amber-600',
    commission: 'border-orange-200 bg-orange-50 text-orange-600',
    admin_adjustment: 'border-pink-200 bg-pink-50 text-pink-600',
    hold: 'border-yellow-200 bg-yellow-50 text-yellow-700',
    release: 'border-cyan-200 bg-cyan-50 text-cyan-600',
    fee: 'border-gray-200 bg-gray-50 text-gray-600',
    payout: 'border-indigo-200 bg-indigo-50 text-indigo-600',
  }
  const label = type.replace(/_/g, ' ')
  return (
    <span
      className={`inline-flex rounded border px-1.5 py-0.5 text-[11px] font-medium capitalize ${
        styles[type] ?? 'border-gray-200 bg-gray-50 text-gray-500'
      }`}
    >
      {label}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'border-amber-200 bg-amber-50 text-amber-600',
    completed: 'border-emerald-200 bg-emerald-50 text-emerald-600',
    rejected: 'border-red-200 bg-red-50 text-red-600',
    cancelled: 'border-gray-200 bg-gray-50 text-gray-500',
    on_hold: 'border-yellow-200 bg-yellow-50 text-yellow-700',
  }
  return (
    <span
      className={`inline-flex rounded border px-1.5 py-0.5 text-[11px] font-medium capitalize ${
        styles[status] ?? 'border-gray-200 bg-gray-50 text-gray-500'
      }`}
    >
      {status.replace(/_/g, ' ')}
    </span>
  )
}

// ── Skeleton ─────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex gap-4 px-4 py-3">
          <div className="h-4 w-28 animate-pulse rounded bg-gray-100" />
          <div className="h-4 w-32 animate-pulse rounded bg-gray-100" />
          <div className="h-4 w-16 animate-pulse rounded bg-gray-100" />
          <div className="h-4 w-16 animate-pulse rounded bg-gray-100" />
          <div className="h-4 w-20 animate-pulse rounded bg-gray-100" />
        </div>
      ))}
    </div>
  )
}

// ── Detail Modal ─────────────────────────────────────────────────

function DetailModal({
  tx,
  onClose,
}: {
  tx: TransactionRow
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-[2px]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
          <h2 className="text-[14px] font-semibold text-gray-900">Transaction Details</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-5 py-4 space-y-3">
          <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-3 space-y-1">
            <div className="text-[13px] font-medium text-gray-900">
              {tx.userFirstName} {tx.userLastName}
            </div>
            <div className="text-[12px] text-gray-500">{tx.userEmail}</div>
            <div className="text-[12px] text-gray-400">ID: {tx.userCustomId}</div>
          </div>

          {[
            ['Reference', tx.referenceNumber],
            ['Type', null, <TypeBadge key="t" type={tx.type} />],
            ['Status', null, <StatusBadge key="s" status={tx.status} />],
            ['Amount', formatCurrency(tx.amount)],
            ...(tx.adminCommission ? [['Commission', formatCurrency(tx.adminCommission)]] : []),
            ...(tx.taxAmount ? [['Tax', formatCurrency(tx.taxAmount)]] : []),
            ...(tx.totalAmount !== tx.amount ? [['Total', formatCurrency(tx.totalAmount)]] : []),
            ['Currency', tx.currency],
            ...(tx.paymentMethod ? [['Payment Method', tx.paymentMethod]] : []),
            ...(tx.transactionId ? [['Transaction ID', tx.transactionId]] : []),
            ...(tx.orderId ? [['Order ID', tx.orderId]] : []),
            ['Date', formatDate(tx.createdAt)],
            ...(tx.description ? [['Description', tx.description]] : []),
          ].map((row, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-[13px] text-gray-500">{row[0]}</span>
              {row[2] ? (
                row[2]
              ) : (
                <span className="text-[13px] font-mono text-gray-700">{row[1]}</span>
              )}
            </div>
          ))}

          {tx.proofDocumentUrl && (
            <a
              href={tx.proofDocumentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-[13px] text-blue-600 hover:bg-blue-100"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View Proof Document
            </a>
          )}
        </div>

        <div className="flex items-center justify-end border-t border-gray-100 px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[13px] font-medium text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────

const TX_TYPES = [
  'all',
  'deposit',
  'withdraw',
  'bid',
  'purchase',
  'sale',
  'refund',
  'commission',
  'admin_adjustment',
  'hold',
  'release',
  'fee',
  'payout',
]

const TX_STATUSES = ['all', 'pending', 'completed', 'rejected', 'cancelled', 'on_hold']

export function TransactionsClient() {
  const [transactions, setTransactions] = useState<TransactionRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [viewing, setViewing] = useState<TransactionRow | null>(null)
  const [exporting, startExport] = useTransition()

  const pageSize = 25
  const totalPages = Math.ceil(total / pageSize)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getTransactions({
        type: typeFilter !== 'all' ? typeFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        page,
        pageSize,
      })
      setTransactions(result.data)
      setTotal(result.total)
    } catch {
      toast.error('Failed to load transactions')
    } finally {
      setLoading(false)
    }
  }, [typeFilter, statusFilter, page])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleExport = () => {
    startExport(async () => {
      try {
        const csv = await exportTransactionsCsv({
          type: typeFilter !== 'all' ? typeFilter : undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
        })
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`
        a.click()
        URL.revokeObjectURL(url)
        toast.success('CSV exported')
      } catch {
        toast.error('Failed to export')
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[15px] font-semibold tracking-tight text-gray-900">Transactions</h1>
          <p className="text-[13px] text-gray-400">
            View all wallet transactions across the platform
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[13px] font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {exporting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[12px] text-gray-400">Type:</span>
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value)
              setPage(1)
            }}
            className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-[13px] text-gray-700 focus:border-blue-300 focus:outline-none"
          >
            {TX_TYPES.map((t) => (
              <option key={t} value={t}>
                {t === 'all' ? 'All Types' : t.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[12px] text-gray-400">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setPage(1)
            }}
            className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-[13px] text-gray-700 focus:border-blue-300 focus:outline-none"
          >
            {TX_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === 'all' ? 'All Statuses' : s.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>

        {total > 0 && (
          <span className="text-[12px] text-gray-400">
            {total} transaction{total !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-gray-200 bg-white">
        {loading ? (
          <TableSkeleton />
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
              <ArrowLeftRight className="h-5 w-5 text-gray-400" />
            </div>
            <p className="mt-3 text-[13px] text-gray-500">No transactions found</p>
          </div>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-2.5 text-left text-[12px] font-medium text-gray-400">Reference</th>
                <th className="px-4 py-2.5 text-left text-[12px] font-medium text-gray-400">User</th>
                <th className="px-4 py-2.5 text-left text-[12px] font-medium text-gray-400">Type</th>
                <th className="px-4 py-2.5 text-left text-[12px] font-medium text-gray-400">Status</th>
                <th className="px-4 py-2.5 text-right text-[12px] font-medium text-gray-400">Amount</th>
                <th className="px-4 py-2.5 text-left text-[12px] font-medium text-gray-400">Date</th>
                <th className="px-4 py-2.5 text-right text-[12px] font-medium text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-2.5 font-mono text-[12px] text-gray-600">
                    {tx.referenceNumber || tx.id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-gray-900">
                      {tx.userFirstName} {tx.userLastName}
                    </div>
                    <div className="text-[11px] text-gray-400">{tx.userCustomId}</div>
                  </td>
                  <td className="px-4 py-2.5">
                    <TypeBadge type={tx.type} />
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={tx.status} />
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium text-gray-900">
                    {formatCurrency(tx.amount)}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">{formatDate(tx.createdAt)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => setViewing(tx)}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2.5">
            <span className="text-[12px] text-gray-400">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
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
      {viewing && (
        <DetailModal tx={viewing} onClose={() => setViewing(null)} />
      )}
    </div>
  )
}
