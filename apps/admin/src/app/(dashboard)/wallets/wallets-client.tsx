'use client'

import { useState, useTransition, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import {
  Wallet,
  Banknote,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  Clock,
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  Building2,
  ChevronLeft,
  ChevronRight,
  Search,
  DollarSign,
} from 'lucide-react'
import type { WalletSummary, BankAccountRow, BankAccountFormData } from '@/lib/actions/wallet'
import {
  getWalletSummary,
  getBankAccounts,
  createBankAccount,
  updateBankAccount,
  deleteBankAccount,
  getWalletUsers,
  createAdjustment,
} from '@/lib/actions/wallet'

// ── Helpers ──────────────────────────────────────────────────────

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-OM', { style: 'currency', currency: 'OMR' }).format(n)
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded border px-1.5 py-0.5 text-[11px] font-medium capitalize ${
        status === 'active'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
          : 'border-gray-200 bg-gray-50 text-gray-500'
      }`}
    >
      {status}
    </span>
  )
}

// ── Summary Cards ────────────────────────────────────────────────

function SummaryCards({ summary, loading }: { summary: WalletSummary | null; loading: boolean }) {
  const cards = [
    {
      label: 'Total Balance',
      value: summary ? formatCurrency(summary.totalBalance) : '—',
      icon: Wallet,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      label: 'Total Deposits',
      value: summary ? formatCurrency(summary.totalDeposits) : '—',
      icon: ArrowDownRight,
      color: 'text-emerald-600 bg-emerald-50',
    },
    {
      label: 'Total Withdrawals',
      value: summary ? formatCurrency(summary.totalWithdrawals) : '—',
      icon: ArrowUpRight,
      color: 'text-red-600 bg-red-50',
    },
    {
      label: 'Pending Deposits',
      value: summary?.pendingDeposits?.toString() ?? '—',
      icon: Clock,
      color: 'text-amber-600 bg-amber-50',
    },
    {
      label: 'Pending Withdrawals',
      value: summary?.pendingWithdrawals?.toString() ?? '—',
      icon: Clock,
      color: 'text-orange-600 bg-orange-50',
    },
    {
      label: 'Active Wallets',
      value: summary?.totalUsers?.toString() ?? '—',
      icon: Users,
      color: 'text-violet-600 bg-violet-50',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((c) => (
        <div key={c.label} className="rounded-lg border border-gray-200 bg-white p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-gray-400">{c.label}</span>
            <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${c.color}`}>
              <c.icon className="h-3.5 w-3.5" />
            </div>
          </div>
          {loading ? (
            <div className="mt-2 h-6 w-20 animate-pulse rounded bg-gray-100" />
          ) : (
            <div className="mt-1.5 text-[16px] font-semibold text-gray-900">{c.value}</div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Bank Account Modal ───────────────────────────────────────────

interface BankAccountModalProps {
  editing: BankAccountRow | null
  onClose: () => void
  onSuccess: () => void
}

function BankAccountModal({ editing, onClose, onSuccess }: BankAccountModalProps) {
  const [form, setForm] = useState<BankAccountFormData>(() =>
    editing
      ? {
          bankNameEn: editing.bankName?.en || '',
          bankNameAr: editing.bankName?.ar || '',
          accountName: editing.accountName,
          accountNumber: editing.accountNumber,
          iban: editing.iban,
          swiftCode: editing.swiftCode || '',
          branch: editing.branch || '',
          currency: editing.currency || 'OMR',
          sortOrder: editing.sortOrder,
          status: editing.status,
        }
      : {
          bankNameEn: '',
          bankNameAr: '',
          accountName: '',
          accountNumber: '',
          iban: '',
          swiftCode: '',
          branch: '',
          currency: 'OMR',
          sortOrder: 0,
          status: 'active',
        },
  )
  const [isPending, startTransition] = useTransition()
  const firstRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    firstRef.current?.focus()
  }, [])

  const set =
    (key: keyof BankAccountFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((p) => ({ ...p, [key]: key === 'sortOrder' ? Number(e.target.value) : e.target.value }))
    }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.bankNameEn || !form.accountName || !form.accountNumber || !form.iban) {
      toast.error('Please fill all required fields')
      return
    }
    startTransition(async () => {
      const result = editing
        ? await updateBankAccount(editing.id, form)
        : await createBankAccount(form)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(editing ? 'Bank account updated' : 'Bank account created')
        onSuccess()
      }
    })
  }

  const inputClass =
    'w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] text-gray-700 placeholder-gray-400 focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-300'
  const labelClass = 'block text-[13px] font-medium text-gray-700 mb-1'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-[2px]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
          <h2 className="text-[14px] font-semibold text-gray-900">
            {editing ? 'Edit Bank Account' : 'Add Bank Account'}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="max-h-[65vh] overflow-y-auto px-5 py-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Bank Name (EN) *</label>
                <input ref={firstRef} value={form.bankNameEn} onChange={set('bankNameEn')} className={inputClass} placeholder="Bank Muscat" />
              </div>
              <div>
                <label className={labelClass}>Bank Name (AR)</label>
                <input value={form.bankNameAr} onChange={set('bankNameAr')} className={inputClass} placeholder="بنك مسقط" dir="rtl" />
              </div>
            </div>
            <div>
              <label className={labelClass}>Account Name *</label>
              <input value={form.accountName} onChange={set('accountName')} className={inputClass} placeholder="Mzadat LLC" />
            </div>
            <div>
              <label className={labelClass}>Account Number *</label>
              <input value={form.accountNumber} onChange={set('accountNumber')} className={inputClass} placeholder="0123456789" />
            </div>
            <div>
              <label className={labelClass}>IBAN *</label>
              <input value={form.iban} onChange={set('iban')} className={inputClass} placeholder="OM12BMSC0123456789" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>SWIFT Code</label>
                <input value={form.swiftCode} onChange={set('swiftCode')} className={inputClass} placeholder="BMSCOMAN" />
              </div>
              <div>
                <label className={labelClass}>Branch</label>
                <input value={form.branch} onChange={set('branch')} className={inputClass} placeholder="Main Branch" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>Currency</label>
                <input value={form.currency} onChange={set('currency')} className={inputClass} placeholder="OMR" />
              </div>
              <div>
                <label className={labelClass}>Sort Order</label>
                <input type="number" value={form.sortOrder} onChange={set('sortOrder')} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Status</label>
                <select value={form.status} onChange={set('status')} className={inputClass}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[13px] font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {editing ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Adjustment Modal ─────────────────────────────────────────────

interface AdjustmentModalProps {
  onClose: () => void
  onSuccess: () => void
}

function AdjustmentModal({ onClose, onSuccess }: AdjustmentModalProps) {
  const [userId, setUserId] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [isCredit, setIsCredit] = useState(true)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (!userId || !amt || amt <= 0 || !description) {
      toast.error('Please fill all fields with valid values')
      return
    }
    startTransition(async () => {
      const result = await createAdjustment({ userId, amount: amt, description, isCredit })
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(`Adjustment of ${formatCurrency(amt)} ${isCredit ? 'credited' : 'debited'}`)
        onSuccess()
      }
    })
  }

  const inputClass =
    'w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] text-gray-700 placeholder-gray-400 focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-300'
  const labelClass = 'block text-[13px] font-medium text-gray-700 mb-1'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-[2px]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
          <h2 className="text-[14px] font-semibold text-gray-900">Manual Adjustment</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-5 py-4 space-y-3">
            <div>
              <label className={labelClass}>User ID *</label>
              <input
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className={inputClass}
                placeholder="Enter user UUID"
              />
            </div>
            <div>
              <label className={labelClass}>Type *</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsCredit(true)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-[13px] font-medium ${
                    isCredit
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                      : 'border-gray-200 bg-white text-gray-600'
                  }`}
                >
                  Credit (Add)
                </button>
                <button
                  type="button"
                  onClick={() => setIsCredit(false)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-[13px] font-medium ${
                    !isCredit
                      ? 'border-red-300 bg-red-50 text-red-700'
                      : 'border-gray-200 bg-white text-gray-600'
                  }`}
                >
                  Debit (Subtract)
                </button>
              </div>
            </div>
            <div>
              <label className={labelClass}>Amount (OMR) *</label>
              <input
                type="number"
                step="0.001"
                min="0.001"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={inputClass}
                placeholder="0.000"
              />
            </div>
            <div>
              <label className={labelClass}>Description *</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={`${inputClass} resize-none`}
                rows={3}
                placeholder="Reason for adjustment..."
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[13px] font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Apply Adjustment
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Delete Confirm Modal ─────────────────────────────────────────

function DeleteConfirmModal({
  bankName,
  onConfirm,
  onClose,
}: {
  bankName: string
  onConfirm: () => void
  onClose: () => void
}) {
  const [isPending, startTransition] = useTransition()

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-[2px]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-5 shadow-xl">
        <h3 className="text-[14px] font-semibold text-gray-900">Delete Bank Account</h3>
        <p className="mt-2 text-[13px] text-gray-500">
          Are you sure you want to delete <strong>{bankName}</strong>? This action cannot be undone.
        </p>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-[13px] font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              startTransition(async () => {
                onConfirm()
              })
            }}
            disabled={isPending}
            className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────

type Tab = 'overview' | 'bank-accounts' | 'users'

export function WalletsClient() {
  const [tab, setTab] = useState<Tab>('overview')
  const [summary, setSummary] = useState<WalletSummary | null>(null)
  const [bankAccounts, setBankAccounts] = useState<BankAccountRow[]>([])
  const [walletUsers, setWalletUsers] = useState<any[]>([])
  const [userTotal, setUserTotal] = useState(0)
  const [userSearch, setUserSearch] = useState('')
  const [userPage, setUserPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [showBankModal, setShowBankModal] = useState(false)
  const [editingBank, setEditingBank] = useState<BankAccountRow | null>(null)
  const [deletingBank, setDeletingBank] = useState<BankAccountRow | null>(null)
  const [showAdjustment, setShowAdjustment] = useState(false)

  const userPageSize = 20
  const userTotalPages = Math.ceil(userTotal / userPageSize)

  const fetchSummary = useCallback(async () => {
    try {
      const s = await getWalletSummary()
      setSummary(s)
    } catch {
      // Ignore if RPC unavailable
    }
  }, [])

  const fetchBankAccounts = useCallback(async () => {
    try {
      const accounts = await getBankAccounts()
      setBankAccounts(accounts)
    } catch {
      toast.error('Failed to load bank accounts')
    }
  }, [])

  const fetchUsers = useCallback(async () => {
    try {
      const result = await getWalletUsers({ search: userSearch || undefined, page: userPage, pageSize: userPageSize })
      setWalletUsers(result.data)
      setUserTotal(result.total)
    } catch {
      toast.error('Failed to load wallet users')
    }
  }, [userSearch, userPage])

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchSummary(), fetchBankAccounts()]).finally(() => setLoading(false))
  }, [fetchSummary, fetchBankAccounts])

  useEffect(() => {
    if (tab === 'users') fetchUsers()
  }, [tab, fetchUsers])

  const handleBankModalSuccess = () => {
    setShowBankModal(false)
    setEditingBank(null)
    fetchBankAccounts()
  }

  const handleDeleteBank = async () => {
    if (!deletingBank) return
    const result = await deleteBankAccount(deletingBank.id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Bank account deleted')
      fetchBankAccounts()
    }
    setDeletingBank(null)
  }

  const handleAdjustmentSuccess = () => {
    setShowAdjustment(false)
    fetchSummary()
    if (tab === 'users') fetchUsers()
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[15px] font-semibold tracking-tight text-gray-900">Wallets</h1>
          <p className="text-[13px] text-gray-400">
            Manage user wallets, bank accounts, and adjustments
          </p>
        </div>
        <button
          onClick={() => setShowAdjustment(true)}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-blue-700"
        >
          <DollarSign className="h-3.5 w-3.5" />
          Manual Adjustment
        </button>
      </div>

      {/* Summary Cards */}
      <SummaryCards summary={summary} loading={loading} />

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        {([
          { key: 'overview' as Tab, label: 'Bank Accounts' },
          { key: 'users' as Tab, label: 'Wallet Users' },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-[13px] font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Bank Accounts Tab */}
      {tab === 'overview' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-gray-700">
              Platform Bank Accounts ({bankAccounts.length})
            </span>
            <button
              onClick={() => {
                setEditingBank(null)
                setShowBankModal(true)
              }}
              className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-gray-800"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Account
            </button>
          </div>

          {bankAccounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50/50 py-12">
              <Building2 className="h-6 w-6 text-gray-300" />
              <p className="mt-2 text-[13px] text-gray-400">No bank accounts configured yet</p>
            </div>
          ) : (
            <div className="rounded-lg border border-gray-200 bg-white">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-4 py-2.5 text-left text-[12px] font-medium text-gray-400">Bank</th>
                    <th className="px-4 py-2.5 text-left text-[12px] font-medium text-gray-400">Account</th>
                    <th className="px-4 py-2.5 text-left text-[12px] font-medium text-gray-400">IBAN</th>
                    <th className="px-4 py-2.5 text-left text-[12px] font-medium text-gray-400">SWIFT</th>
                    <th className="px-4 py-2.5 text-left text-[12px] font-medium text-gray-400">Status</th>
                    <th className="px-4 py-2.5 text-right text-[12px] font-medium text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bankAccounts.map((ba) => (
                    <tr key={ba.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-gray-900">
                          {ba.bankName?.en || '—'}
                        </div>
                        {ba.bankName?.ar && (
                          <div className="text-[11px] text-gray-400" dir="rtl">{ba.bankName.ar}</div>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="text-gray-700">{ba.accountName}</div>
                        <div className="text-[11px] text-gray-400">{ba.accountNumber}</div>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[12px] text-gray-600">{ba.iban}</td>
                      <td className="px-4 py-2.5 font-mono text-[12px] text-gray-500">{ba.swiftCode || '—'}</td>
                      <td className="px-4 py-2.5">
                        <StatusBadge status={ba.status} />
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setEditingBank(ba)
                              setShowBankModal(true)
                            }}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
                            title="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingBank(ba)}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Wallet Users Tab */}
      {tab === 'users' && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => {
                  setUserSearch(e.target.value)
                  setUserPage(1)
                }}
                placeholder="Search by email, name, or ID..."
                className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-[13px] text-gray-700 placeholder-gray-400 focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
              />
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white">
            {walletUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Users className="h-5 w-5 text-gray-300" />
                <p className="mt-2 text-[13px] text-gray-400">No wallet users found</p>
              </div>
            ) : (
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-4 py-2.5 text-left text-[12px] font-medium text-gray-400">User</th>
                    <th className="px-4 py-2.5 text-left text-[12px] font-medium text-gray-400">Email</th>
                    <th className="px-4 py-2.5 text-left text-[12px] font-medium text-gray-400">Role</th>
                    <th className="px-4 py-2.5 text-right text-[12px] font-medium text-gray-400">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {walletUsers.map((u: any) => (
                    <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-gray-900">
                          {u.firstName} {u.lastName}
                        </div>
                        <div className="text-[11px] text-gray-400">{u.customId}</div>
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">{u.email}</td>
                      <td className="px-4 py-2.5">
                        <StatusBadge status={u.isVip ? 'VIP' : u.role} />
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium text-gray-900">
                        {formatCurrency(u.walletBalance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {userTotalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2.5">
                <span className="text-[12px] text-gray-400">
                  Page {userPage} of {userTotalPages} · {userTotal} users
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                    disabled={userPage <= 1}
                    className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setUserPage((p) => Math.min(userTotalPages, p + 1))}
                    disabled={userPage >= userTotalPages}
                    className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {(showBankModal || editingBank) && (
        <BankAccountModal
          editing={editingBank}
          onClose={() => {
            setShowBankModal(false)
            setEditingBank(null)
          }}
          onSuccess={handleBankModalSuccess}
        />
      )}

      {deletingBank && (
        <DeleteConfirmModal
          bankName={deletingBank.bankName?.en || 'this account'}
          onConfirm={handleDeleteBank}
          onClose={() => setDeletingBank(null)}
        />
      )}

      {showAdjustment && (
        <AdjustmentModal
          onClose={() => setShowAdjustment(false)}
          onSuccess={handleAdjustmentSuccess}
        />
      )}
    </div>
  )
}
