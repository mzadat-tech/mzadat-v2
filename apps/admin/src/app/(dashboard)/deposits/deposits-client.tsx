'use client'

import { useState, useTransition, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Banknote,
  Check,
  X,
  Loader2,
  Eye,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Crown,
} from 'lucide-react'
import type { DepositRow } from '@/lib/actions/wallet'
import { getDeposits, approveDeposit, rejectDeposit } from '@/lib/actions/wallet'

// ── Helpers ──────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'border-amber-200 bg-amber-50 text-amber-600',
    completed: 'border-emerald-200 bg-emerald-50 text-emerald-600',
    rejected: 'border-red-200 bg-red-50 text-red-600',
    cancelled: 'border-gray-200 bg-gray-50 text-gray-500',
  }
  return (
    <span
      className={`inline-flex rounded border px-1.5 py-0.5 text-[11px] font-medium capitalize ${
        styles[status] ?? 'border-gray-200 bg-gray-50 text-gray-500'
      }`}
    >
      {status}
    </span>
  )
}

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

// ── Skeleton ─────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex gap-4 px-4 py-3">
          <div className="h-4 w-24 animate-pulse rounded bg-gray-100" />
          <div className="h-4 w-32 animate-pulse rounded bg-gray-100" />
          <div className="h-4 w-20 animate-pulse rounded bg-gray-100" />
          <div className="h-4 w-16 animate-pulse rounded bg-gray-100" />
          <div className="h-4 w-16 animate-pulse rounded bg-gray-100" />
        </div>
      ))}
    </div>
  )
}

// ── Detail / Review Modal ────────────────────────────────────────

interface ReviewModalProps {
  deposit: DepositRow
  onClose: () => void
  onSuccess: () => void
}

function ReviewModal({ deposit, onClose, onSuccess }: ReviewModalProps) {
  const [notes, setNotes] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleApprove = () => {
    startTransition(async () => {
      const result = await approveDeposit(deposit.id, notes || undefined)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(`Deposit of ${formatCurrency(deposit.amount)} approved`)
        onSuccess()
      }
    })
  }

  const handleReject = () => {
    if (!notes.trim()) {
      toast.error('Please provide a reason for rejection')
      return
    }
    startTransition(async () => {
      const result = await rejectDeposit(deposit.id, notes)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Deposit rejected')
        onSuccess()
      }
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-[2px]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
          <h2 className="text-[14px] font-semibold text-gray-900">Review Deposit</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4 space-y-4">
          {/* User Info */}
          <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-3 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-medium text-gray-900">
                {deposit.userFirstName} {deposit.userLastName}
              </span>
              {deposit.userIsVip && (
                <Crown className="h-3.5 w-3.5 text-amber-500" />
              )}
            </div>
            <div className="text-[12px] text-gray-500">{deposit.userEmail}</div>
            <div className="text-[12px] text-gray-400">ID: {deposit.userCustomId}</div>
          </div>

          {/* Amount */}
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-gray-500">Amount</span>
            <span className="text-[15px] font-semibold text-gray-900">
              {formatCurrency(deposit.amount)}
            </span>
          </div>

          {/* Bank */}
          {deposit.bankName && (
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-gray-500">Bank</span>
              <span className="text-[13px] text-gray-700">{deposit.bankName}</span>
            </div>
          )}

          {/* Reference */}
          {deposit.referenceNumber && (
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-gray-500">Reference</span>
              <span className="text-[13px] font-mono text-gray-700">{deposit.referenceNumber}</span>
            </div>
          )}

          {/* Tx Reference */}
          {deposit.txReferenceNumber && (
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-gray-500">Tx Ref</span>
              <span className="text-[13px] font-mono text-gray-700">{deposit.txReferenceNumber}</span>
            </div>
          )}

          {/* Date */}
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-gray-500">Submitted</span>
            <span className="text-[13px] text-gray-700">{formatDate(deposit.createdAt)}</span>
          </div>

          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-gray-500">Status</span>
            <StatusBadge status={deposit.status} />
          </div>

          {/* Proof Document */}
          {deposit.proofDocumentUrl && (
            <div className="space-y-2">
              <span className="text-[13px] text-gray-500">Proof Document</span>
              <a
                href={deposit.proofDocumentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-[13px] text-blue-600 hover:bg-blue-100"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                View Proof
              </a>
            </div>
          )}

          {/* Admin notes (shown if already reviewed) */}
          {deposit.adminNotes && deposit.status !== 'pending' && (
            <div className="space-y-1">
              <span className="text-[13px] text-gray-500">Admin Notes</span>
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-2 text-[13px] text-gray-700">
                {deposit.adminNotes}
              </div>
            </div>
          )}

          {/* Notes input (only for pending) */}
          {deposit.status === 'pending' && (
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-gray-700">
                Admin Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes (required for rejection)..."
                rows={3}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] text-gray-700 placeholder-gray-400 focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        {deposit.status === 'pending' && (
          <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-3">
            <button
              onClick={handleReject}
              disabled={isPending}
              className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-[13px] font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <X className="h-3.5 w-3.5" />
              )}
              Reject
            </button>
            <button
              onClick={handleApprove}
              disabled={isPending}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              Approve
            </button>
          </div>
        )}

        {deposit.status !== 'pending' && (
          <div className="flex items-center justify-end border-t border-gray-100 px-5 py-3">
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[13px] font-medium text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────

export function DepositsClient() {
  const [deposits, setDeposits] = useState<DepositRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('pending')
  const [page, setPage] = useState(1)
  const [reviewing, setReviewing] = useState<DepositRow | null>(null)

  const pageSize = 20
  const totalPages = Math.ceil(total / pageSize)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getDeposits({ status: statusFilter, page, pageSize })
      setDeposits(result.data)
      setTotal(result.total)
    } catch {
      toast.error('Failed to load deposits')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, page])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleFilterChange = (status: string) => {
    setStatusFilter(status)
    setPage(1)
  }

  const handleReviewSuccess = () => {
    setReviewing(null)
    fetchData()
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[15px] font-semibold tracking-tight text-gray-900">Deposits</h1>
          <p className="text-[13px] text-gray-400">
            Review and approve bank deposit requests from users
          </p>
        </div>
        <div className="flex items-center gap-2 text-[13px] text-gray-500">
          {total > 0 && `${total} deposit${total !== 1 ? 's' : ''}`}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        {['pending', 'completed', 'rejected', 'all'].map((s) => (
          <button
            key={s}
            onClick={() => handleFilterChange(s)}
            className={`rounded-lg px-3 py-1.5 text-[13px] font-medium capitalize transition-colors ${
              statusFilter === s
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-gray-200 bg-white">
        {loading ? (
          <TableSkeleton />
        ) : deposits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
              <Banknote className="h-5 w-5 text-gray-400" />
            </div>
            <p className="mt-3 text-[13px] text-gray-500">No deposits found</p>
          </div>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-2.5 text-left text-[12px] font-medium text-gray-400">User</th>
                <th className="px-4 py-2.5 text-left text-[12px] font-medium text-gray-400">Amount</th>
                <th className="px-4 py-2.5 text-left text-[12px] font-medium text-gray-400">Bank</th>
                <th className="px-4 py-2.5 text-left text-[12px] font-medium text-gray-400">Reference</th>
                <th className="px-4 py-2.5 text-left text-[12px] font-medium text-gray-400">Status</th>
                <th className="px-4 py-2.5 text-left text-[12px] font-medium text-gray-400">Date</th>
                <th className="px-4 py-2.5 text-right text-[12px] font-medium text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {deposits.map((dep) => (
                <tr key={dep.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-gray-900">
                            {dep.userFirstName} {dep.userLastName}
                          </span>
                          {dep.userIsVip && <Crown className="h-3 w-3 text-amber-500" />}
                        </div>
                        <div className="text-[11px] text-gray-400">{dep.userCustomId}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 font-medium text-gray-900">
                    {formatCurrency(dep.amount)}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">{dep.bankName || '—'}</td>
                  <td className="px-4 py-2.5 font-mono text-[12px] text-gray-500">
                    {dep.referenceNumber || '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={dep.status} />
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">{formatDate(dep.createdAt)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => setReviewing(dep)}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      title="Review"
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

      {/* Review Modal */}
      {reviewing && (
        <ReviewModal
          deposit={reviewing}
          onClose={() => setReviewing(null)}
          onSuccess={handleReviewSuccess}
        />
      )}
    </div>
  )
}
