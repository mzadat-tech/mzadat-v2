'use client'

import { useState, useTransition, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Users,
  ChevronLeft,
  ChevronRight,
  Search,
  Eye,
  Loader2,
  Crown,
  Shield,
  ShieldCheck,
  Store,
  UserX,
  MailWarning,
  Mail,
  MailCheck,
  Star,
  StarOff,
} from 'lucide-react'
import type { UserRow, UserStats, GetUsersParams } from '@/lib/actions/users'
import { getUsers, getUserStats, toggleUserVip, toggleEmailVerified, updateUserStatus } from '@/lib/actions/users'

// ── Helpers ──────────────────────────────────────────────────────

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-OM', { style: 'currency', currency: 'OMR' }).format(n)
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function getRoleClasses(role: string) {
  switch (role) {
    case 'super_admin':
      return 'bg-red-50 text-red-700 border-red-200'
    case 'admin':
      return 'bg-purple-50 text-purple-700 border-purple-200'
    case 'merchant':
      return 'bg-blue-50 text-blue-700 border-blue-200'
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200'
  }
}

function getStatusClasses(status: string) {
  switch (status) {
    case 'active':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'suspended':
      return 'bg-red-50 text-red-700 border-red-200'
    case 'inactive':
      return 'bg-gray-50 text-gray-500 border-gray-200'
    case 'pending_verification':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200'
  }
}

// ── Client Component ─────────────────────────────────────────────

export function UsersClient() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [stats, setStats] = useState<UserStats | null>(null)
  const [users, setUsers] = useState<UserRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Filters
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [vipFilter, setVipFilter] = useState('all')
  const [emailVerifiedFilter, setEmailVerifiedFilter] = useState('all')

  const loadData = useCallback(() => {
    startTransition(async () => {
      try {
        const params: GetUsersParams = {
          page,
          pageSize: 25,
          search: searchQuery || undefined,
          role: roleFilter !== 'all' ? roleFilter : undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          isVip: vipFilter !== 'all' ? vipFilter : undefined,
          emailVerified: emailVerifiedFilter !== 'all' ? emailVerifiedFilter : undefined,
        }
        const [statsData, usersResult] = await Promise.all([
          getUserStats(),
          getUsers(params),
        ])
        setStats(statsData)
        setUsers(usersResult.items)
        setTotal(usersResult.total)
        setTotalPages(usersResult.totalPages)
      } catch (err) {
        toast.error('Failed to load users')
        console.error(err)
      }
    })
  }, [page, searchQuery, roleFilter, statusFilter, vipFilter, emailVerifiedFilter])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    setSearchQuery(searchInput)
  }

  const handleToggleVip = async (userId: string, currentVip: boolean) => {
    try {
      await toggleUserVip(userId, !currentVip)
      toast.success(currentVip ? 'VIP status removed' : 'User upgraded to VIP')
      loadData()
    } catch {
      toast.error('Failed to update VIP status')
    }
  }

  const handleToggleEmailVerified = async (userId: string, currentVerified: boolean) => {
    try {
      await toggleEmailVerified(userId, !currentVerified)
      toast.success(currentVerified ? 'Email marked as unverified' : 'Email marked as verified')
      loadData()
    } catch {
      toast.error('Failed to update email verification')
    }
  }

  const handleStatusChange = async (userId: string, newStatus: string) => {
    try {
      const result = await updateUserStatus(userId, newStatus)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(`User status updated to ${newStatus}`)
      loadData()
    } catch {
      toast.error('Failed to update status')
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Users</h1>
        <p className="mt-1 text-[14px] text-gray-500">
          Manage all customers, merchants, and admin accounts.
        </p>
      </div>

      {/* 2. Stats Grid */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
        <StatCard label="Total Users" value={stats?.total ?? 0} icon={<Users className="h-4 w-4 text-gray-400" />} />
        <StatCard label="Active" value={stats?.active ?? 0} icon={<ShieldCheck className="h-4 w-4 text-emerald-400" />} variant="emerald" />
        <StatCard label="Suspended" value={stats?.suspended ?? 0} icon={<UserX className="h-4 w-4 text-red-400" />} variant="red" />
        <StatCard label="VIP" value={stats?.vip ?? 0} icon={<Crown className="h-4 w-4 text-amber-400" />} variant="amber" />
        <StatCard label="Merchants" value={stats?.merchants ?? 0} icon={<Store className="h-4 w-4 text-blue-400" />} variant="blue" />
        <StatCard label="Pending" value={stats?.pendingVerification ?? 0} icon={<MailWarning className="h-4 w-4 text-orange-400" />} variant="orange" />
        <StatCard label="Unverified Email" value={stats?.unverifiedEmail ?? 0} icon={<Mail className="h-4 w-4 text-rose-400" />} variant="rose" />
      </div>

      {/* 3. Filters Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearch} className="relative w-full max-w-90">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-4 text-[13px] outline-none transition-shadow hover:border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
            placeholder="Search name, email, phone, ID..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </form>

        <div className="flex items-center gap-2">
          <FilterSelect
            value={roleFilter}
            onChange={(v) => { setRoleFilter(v); setPage(1) }}
            options={[
              { value: 'all', label: 'All Roles' },
              { value: 'customer', label: 'Customer' },
              { value: 'merchant', label: 'Merchant' },
              { value: 'admin', label: 'Admin' },
              { value: 'super_admin', label: 'Super Admin' },
            ]}
          />
          <FilterSelect
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); setPage(1) }}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
              { value: 'suspended', label: 'Suspended' },
              { value: 'pending_verification', label: 'Pending' },
            ]}
          />
          <FilterSelect
            value={vipFilter}
            onChange={(v) => { setVipFilter(v); setPage(1) }}
            options={[
              { value: 'all', label: 'All VIP' },
              { value: 'true', label: 'VIP Only' },
              { value: 'false', label: 'Non-VIP' },
            ]}
          />
          <FilterSelect
            value={emailVerifiedFilter}
            onChange={(v) => { setEmailVerifiedFilter(v); setPage(1) }}
            options={[
              { value: 'all', label: 'Email Status' },
              { value: 'true', label: 'Verified' },
              { value: 'false', label: 'Unverified' },
            ]}
          />
        </div>
      </div>

      {/* 4. Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden relative min-h-100">
        {isPending && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 backdrop-blur-[1px]">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="border-b border-gray-200 bg-gray-50/50 text-xs font-medium text-gray-500">
              <tr>
                <th className="px-4 py-3.5">User</th>
                <th className="px-4 py-3.5">ID</th>
                <th className="px-4 py-3.5">Role</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-center">VIP</th>
                <th className="px-4 py-3.5 text-center">Email</th>
                <th className="px-4 py-3.5 text-right">Wallet</th>
                <th className="px-4 py-3.5 text-center">Bids</th>
                <th className="px-4 py-3.5 text-center">Orders</th>
                <th className="px-4 py-3.5">Joined</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-[13px] text-gray-700">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-[12px] font-bold text-gray-600 uppercase shrink-0">
                        {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-gray-900 truncate">{user.firstName} {user.lastName}</span>
                          {user.isVip && <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                        </div>
                        <div className="text-[12px] text-gray-500 truncate">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-[12px] text-gray-500">{user.customId}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${getRoleClasses(user.role)}`}>
                      {user.role === 'super_admin' ? 'super' : user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={user.status}
                      onChange={(e) => handleStatusChange(user.id, e.target.value)}
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider cursor-pointer outline-none ${getStatusClasses(user.status)}`}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="suspended">Suspended</option>
                      <option value="pending_verification">Pending</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggleVip(user.id, user.isVip)}
                      className={`rounded-lg p-1.5 transition-colors ${
                        user.isVip
                          ? 'text-amber-500 hover:bg-amber-50'
                          : 'text-gray-300 hover:bg-gray-100 hover:text-gray-500'
                      }`}
                      title={user.isVip ? 'Remove VIP' : 'Make VIP'}
                    >
                      {user.isVip ? <Star className="h-4 w-4 fill-current" /> : <StarOff className="h-4 w-4" />}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggleEmailVerified(user.id, user.emailVerified)}
                      className={`rounded-lg p-1.5 transition-colors ${
                        user.emailVerified
                          ? 'text-emerald-500 hover:bg-emerald-50'
                          : 'text-red-400 hover:bg-red-50'
                      }`}
                      title={user.emailVerified ? 'Mark as unverified' : 'Mark as verified'}
                    >
                      {user.emailVerified ? <MailCheck className="h-4 w-4" /> : <MailWarning className="h-4 w-4" />}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    {formatCurrency(user.walletBalance)}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">{user.bidCount}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{user.orderCount}</td>
                  <td className="px-4 py-3 text-[12px] text-gray-500">{formatDate(user.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => router.push(`/users/${user.id}`)}
                      className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900 inline-flex"
                      title="View profile"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}

              {!isPending && users.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-6 py-16 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="rounded-full bg-gray-50 p-3">
                        <Users className="h-6 w-6 text-gray-400" />
                      </div>
                      <p className="text-[14px]">No users found matching criteria.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 5. Pagination */}
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
    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────────

function StatCard({ label, value, icon, variant }: { label: string; value: number; icon: React.ReactNode; variant?: string }) {
  const border = variant ? `border-${variant}-100` : 'border-gray-100'
  const bg = variant ? `bg-${variant}-50/40` : 'bg-white'
  return (
    <div className={`rounded-xl border ${border} ${bg} p-4 shadow-sm`}>
      <div className="flex items-center justify-between">
        <span className="text-[12px] text-gray-400">{label}</span>
        {icon}
      </div>
      <p className="mt-1 text-[22px] font-bold tracking-tight text-gray-900">{value}</p>
    </div>
  )
}

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-700 outline-none transition-shadow hover:border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}
