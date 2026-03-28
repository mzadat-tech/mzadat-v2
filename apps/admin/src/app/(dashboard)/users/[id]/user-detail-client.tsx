'use client'

import { useState, useTransition, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Crown,
  Loader2,
  Mail,
  MailCheck,
  MailWarning,
  Phone,
  MapPin,
  Building2,
  Wallet,
  Gavel,
  ShoppingCart,
  ArrowLeftRight,
  TicketCheck,
  Star,
  StarOff,
  User,
  Shield,
  Pencil,
  Save,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import type {
  UserDetail,
  UserBidRow,
  UserOrderRow,
  UserTransactionRow,
  UserRegistrationRow,
} from '@/lib/actions/users'
import {
  getUserById,
  getUserBids,
  getUserOrders,
  getUserTransactions,
  getUserRegistrations,
  updateUser,
  toggleUserVip,
  toggleEmailVerified,
  updateUserStatus,
  updateUserRole,
} from '@/lib/actions/users'

// ── Helpers ──────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat('en-OM', { style: 'currency', currency: 'OMR' }).format(n)
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function fmtShort(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function getRoleClasses(role: string) {
  switch (role) {
    case 'super_admin': return 'bg-red-50 text-red-700 border-red-200'
    case 'admin': return 'bg-purple-50 text-purple-700 border-purple-200'
    case 'merchant': return 'bg-blue-50 text-blue-700 border-blue-200'
    default: return 'bg-gray-50 text-gray-700 border-gray-200'
  }
}

function getStatusClasses(status: string) {
  switch (status) {
    case 'active': return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'suspended': return 'bg-red-50 text-red-700 border-red-200'
    case 'inactive': return 'bg-gray-50 text-gray-500 border-gray-200'
    case 'pending_verification': return 'bg-amber-50 text-amber-700 border-amber-200'
    default: return 'bg-gray-50 text-gray-700 border-gray-200'
  }
}

function getPaymentClasses(status: string) {
  switch (status) {
    case 'paid': return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'unpaid': return 'bg-red-50 text-red-700 border-red-200'
    case 'refunded': return 'bg-purple-50 text-purple-700 border-purple-200'
    default: return 'bg-amber-50 text-amber-700 border-amber-200'
  }
}

function getTxTypeClasses(type: string) {
  if (['deposit', 'return', 'refund', 'release'].includes(type)) return 'text-emerald-700 bg-emerald-50'
  if (['withdraw', 'bid', 'purchase', 'hold', 'fee', 'commission'].includes(type)) return 'text-red-700 bg-red-50'
  return 'text-gray-700 bg-gray-50'
}

// ── Tabs ─────────────────────────────────────────────────────────

type Tab = 'overview' | 'bids' | 'orders' | 'transactions' | 'registrations'

const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'overview', label: 'Overview', icon: <User className="h-4 w-4" /> },
  { key: 'bids', label: 'Bids', icon: <Gavel className="h-4 w-4" /> },
  { key: 'orders', label: 'Orders', icon: <ShoppingCart className="h-4 w-4" /> },
  { key: 'transactions', label: 'Transactions', icon: <ArrowLeftRight className="h-4 w-4" /> },
  { key: 'registrations', label: 'Registrations', icon: <TicketCheck className="h-4 w-4" /> },
]

// ── Main Component ───────────────────────────────────────────────

export function UserDetailClient({ userId }: { userId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [user, setUser] = useState<UserDetail | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<Record<string, string>>({})

  // Sub-tab data
  const [bids, setBids] = useState<UserBidRow[]>([])
  const [bidsTotal, setBidsTotal] = useState(0)
  const [bidsPage, setBidsPage] = useState(1)
  const [bidsTotalPages, setBidsTotalPages] = useState(1)

  const [orders, setOrders] = useState<UserOrderRow[]>([])
  const [ordersTotal, setOrdersTotal] = useState(0)
  const [ordersPage, setOrdersPage] = useState(1)
  const [ordersTotalPages, setOrdersTotalPages] = useState(1)

  const [transactions, setTransactions] = useState<UserTransactionRow[]>([])
  const [txTotal, setTxTotal] = useState(0)
  const [txPage, setTxPage] = useState(1)
  const [txTotalPages, setTxTotalPages] = useState(1)

  const [registrations, setRegistrations] = useState<UserRegistrationRow[]>([])
  const [regTotal, setRegTotal] = useState(0)
  const [regPage, setRegPage] = useState(1)
  const [regTotalPages, setRegTotalPages] = useState(1)

  // Counts for tab badges
  const [bidCountTotal, setBidCountTotal] = useState(0)
  const [orderCountTotal, setOrderCountTotal] = useState(0)
  const [txCountTotal, setTxCountTotal] = useState(0)
  const [regCountTotal, setRegCountTotal] = useState(0)

  const loadUser = useCallback(() => {
    startTransition(async () => {
      try {
        const u = await getUserById(userId)
        if (!u) {
          toast.error('User not found')
          router.push('/users')
          return
        }
        setUser(u)
      } catch (err) {
        toast.error('Failed to load user')
        console.error(err)
      }
    })
  }, [userId, router])

  // Load initial counts for badges
  useEffect(() => {
    const loadCounts = async () => {
      try {
        const [b, o, t, r] = await Promise.all([
          getUserBids(userId, 1, 1),
          getUserOrders(userId, 1, 1),
          getUserTransactions(userId, 1, 1),
          getUserRegistrations(userId, 1, 1),
        ])
        setBidCountTotal(b.total)
        setOrderCountTotal(o.total)
        setTxCountTotal(t.total)
        setRegCountTotal(r.total)
      } catch { /* silent */ }
    }
    loadCounts()
  }, [userId])

  useEffect(() => { loadUser() }, [loadUser])

  // Load tab data on tab change
  useEffect(() => {
    if (activeTab === 'bids') {
      startTransition(async () => {
        const result = await getUserBids(userId, bidsPage)
        setBids(result.items)
        setBidsTotal(result.total)
        setBidsTotalPages(result.totalPages)
        setBidCountTotal(result.total)
      })
    }
  }, [activeTab, bidsPage, userId])

  useEffect(() => {
    if (activeTab === 'orders') {
      startTransition(async () => {
        const result = await getUserOrders(userId, ordersPage)
        setOrders(result.items)
        setOrdersTotal(result.total)
        setOrdersTotalPages(result.totalPages)
        setOrderCountTotal(result.total)
      })
    }
  }, [activeTab, ordersPage, userId])

  useEffect(() => {
    if (activeTab === 'transactions') {
      startTransition(async () => {
        const result = await getUserTransactions(userId, txPage)
        setTransactions(result.items)
        setTxTotal(result.total)
        setTxTotalPages(result.totalPages)
        setTxCountTotal(result.total)
      })
    }
  }, [activeTab, txPage, userId])

  useEffect(() => {
    if (activeTab === 'registrations') {
      startTransition(async () => {
        const result = await getUserRegistrations(userId, regPage)
        setRegistrations(result.items)
        setRegTotal(result.total)
        setRegTotalPages(result.totalPages)
        setRegCountTotal(result.total)
      })
    }
  }, [activeTab, regPage, userId])

  // ── Handlers ─────────────────────────────────────────────────

  const startEdit = () => {
    if (!user) return
    setEditForm({
      firstName: user.firstName,
      lastName: user.lastName,
      firstNameAr: user.firstNameAr || '',
      lastNameAr: user.lastNameAr || '',
      phone: user.phone || '',
      address: user.address || '',
      zipCode: user.zipCode || '',
      individualId: user.individualId || '',
      companyName: user.companyName || '',
      companyId: user.companyId || '',
    })
    setIsEditing(true)
  }

  const handleSave = async () => {
    const result = await updateUser(userId, editForm)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success('User updated')
    setIsEditing(false)
    loadUser()
  }

  const handleToggleVip = async () => {
    if (!user) return
    await toggleUserVip(userId, !user.isVip)
    toast.success(user.isVip ? 'VIP removed' : 'Upgraded to VIP')
    loadUser()
  }

  const handleToggleEmail = async () => {
    if (!user) return
    await toggleEmailVerified(userId, !user.emailVerified)
    toast.success(user.emailVerified ? 'Email marked unverified' : 'Email marked verified')
    loadUser()
  }

  const handleStatusChange = async (status: string) => {
    const result = await updateUserStatus(userId, status)
    if (result.error) { toast.error(result.error); return }
    toast.success(`Status updated to ${status}`)
    loadUser()
  }

  const handleRoleChange = async (role: string) => {
    const result = await updateUserRole(userId, role)
    if (result.error) { toast.error(result.error); return }
    toast.success(`Role updated to ${role}`)
    loadUser()
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header + Back */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/users')}
          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              {user.firstName} {user.lastName}
            </h1>
            {user.isVip && (
              <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200 uppercase">
                <Crown className="w-3 h-3 mr-0.5" /> VIP
              </span>
            )}
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${getRoleClasses(user.role)}`}>
              {user.role === 'super_admin' ? 'super admin' : user.role}
            </span>
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${getStatusClasses(user.status)}`}>
              {user.status.replace('_', ' ')}
            </span>
          </div>
          <p className="mt-0.5 text-[13px] text-gray-500">{user.customId} &bull; {user.email}</p>
        </div>
      </div>

      {/* Profile Card + Quick Actions */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Profile Info */}
        <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <h2 className="text-[15px] font-bold text-gray-900">Profile Information</h2>
            {isEditing ? (
              <div className="flex gap-2">
                <button onClick={() => setIsEditing(false)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-[12px] font-medium text-gray-600 hover:bg-gray-50 inline-flex items-center gap-1">
                  <X className="h-3.5 w-3.5" /> Cancel
                </button>
                <button onClick={handleSave} className="rounded-lg bg-gray-900 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-gray-800 inline-flex items-center gap-1">
                  <Save className="h-3.5 w-3.5" /> Save
                </button>
              </div>
            ) : (
              <button onClick={startEdit} className="rounded-lg border border-gray-200 px-3 py-1.5 text-[12px] font-medium text-gray-600 hover:bg-gray-50 inline-flex items-center gap-1">
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
            )}
          </div>
          <div className="p-6">
            {isEditing ? (
              <div className="grid grid-cols-2 gap-4">
                <EditField label="First Name" value={editForm.firstName} onChange={(v) => setEditForm({ ...editForm, firstName: v })} />
                <EditField label="Last Name" value={editForm.lastName} onChange={(v) => setEditForm({ ...editForm, lastName: v })} />
                <EditField label="First Name (AR)" value={editForm.firstNameAr} onChange={(v) => setEditForm({ ...editForm, firstNameAr: v })} />
                <EditField label="Last Name (AR)" value={editForm.lastNameAr} onChange={(v) => setEditForm({ ...editForm, lastNameAr: v })} />
                <EditField label="Phone" value={editForm.phone} onChange={(v) => setEditForm({ ...editForm, phone: v })} />
                <EditField label="Address" value={editForm.address} onChange={(v) => setEditForm({ ...editForm, address: v })} />
                <EditField label="Zip Code" value={editForm.zipCode} onChange={(v) => setEditForm({ ...editForm, zipCode: v })} />
                <EditField label="National/Civil ID" value={editForm.individualId} onChange={(v) => setEditForm({ ...editForm, individualId: v })} />
                <EditField label="Company Name" value={editForm.companyName} onChange={(v) => setEditForm({ ...editForm, companyName: v })} />
                <EditField label="Company ID (CR)" value={editForm.companyId} onChange={(v) => setEditForm({ ...editForm, companyId: v })} />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-[13px]">
                <InfoRow label="Full Name" value={`${user.firstName} ${user.lastName}`} />
                <InfoRow label="Arabic Name" value={user.firstNameAr && user.lastNameAr ? `${user.firstNameAr} ${user.lastNameAr}` : '—'} />
                <InfoRow label="Email" value={user.email} icon={<Mail className="h-3.5 w-3.5 text-gray-400" />} />
                <InfoRow label="Phone" value={user.phone || '—'} icon={<Phone className="h-3.5 w-3.5 text-gray-400" />} />
                <InfoRow label="Registration Type" value={user.registerAs} />
                <InfoRow label="Location" value={[user.cityName, user.stateName, user.countryName].filter(Boolean).join(', ') || '—'} icon={<MapPin className="h-3.5 w-3.5 text-gray-400" />} />
                <InfoRow label="Address" value={user.address || '—'} />
                <InfoRow label="Zip Code" value={user.zipCode || '—'} />
                {user.registerAs === 'company' && (
                  <>
                    <InfoRow label="Company" value={user.companyName || '—'} icon={<Building2 className="h-3.5 w-3.5 text-gray-400" />} />
                    <InfoRow label="Company ID" value={user.companyId || '—'} />
                  </>
                )}
                <InfoRow label="National/Civil ID" value={user.individualId || '—'} />
                {user.corporateDomainName && (
                  <InfoRow label="Corporate Domain" value={user.corporateDomainName} />
                )}
                <InfoRow label="Joined" value={fmtDate(user.createdAt)} />
                <InfoRow label="Updated" value={fmtDate(user.updatedAt)} />
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions Sidebar */}
        <div className="space-y-4">
          {/* Wallet */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Wallet className="h-4 w-4 text-gray-400" />
              <span className="text-[12px] font-bold text-gray-400 uppercase tracking-wider">Wallet Balance</span>
            </div>
            <p className="text-[28px] font-bold tracking-tight text-gray-900">
              {fmt(user.walletBalance)}
            </p>
          </div>

          {/* Quick Actions */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
            <span className="text-[12px] font-bold text-gray-400 uppercase tracking-wider">Quick Actions</span>

            {/* VIP Toggle */}
            <button
              onClick={handleToggleVip}
              className={`w-full rounded-xl border px-4 py-2.5 text-[13px] font-medium transition-colors flex items-center gap-2 ${
                user.isVip
                  ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {user.isVip ? <StarOff className="h-4 w-4" /> : <Star className="h-4 w-4" />}
              {user.isVip ? 'Remove VIP Status' : 'Upgrade to VIP'}
            </button>

            {/* Email Verified Toggle */}
            <button
              onClick={handleToggleEmail}
              className={`w-full rounded-xl border px-4 py-2.5 text-[13px] font-medium transition-colors flex items-center gap-2 ${
                user.emailVerified
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  : 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
              }`}
            >
              {user.emailVerified ? <MailCheck className="h-4 w-4" /> : <MailWarning className="h-4 w-4" />}
              {user.emailVerified ? 'Email Verified ✓' : 'Mark Email Verified'}
            </button>

            {/* Status */}
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wider">Status</label>
              <select
                value={user.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className={`w-full rounded-xl border px-3 py-2 text-[13px] font-medium cursor-pointer outline-none ${getStatusClasses(user.status)}`}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
                <option value="pending_verification">Pending Verification</option>
              </select>
            </div>

            {/* Role */}
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wider">Role</label>
              <select
                value={user.role}
                onChange={(e) => handleRoleChange(e.target.value)}
                className={`w-full rounded-xl border px-3 py-2 text-[13px] font-medium cursor-pointer outline-none ${getRoleClasses(user.role)}`}
              >
                <option value="customer">Customer</option>
                <option value="merchant">Merchant</option>
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1">
          {tabs.map((tab) => {
            const count =
              tab.key === 'bids' ? bidCountTotal :
              tab.key === 'orders' ? orderCountTotal :
              tab.key === 'transactions' ? txCountTotal :
              tab.key === 'registrations' ? regCountTotal : 0
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.icon}
                {tab.label}
                {count > 0 && tab.key !== 'overview' && (
                  <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-600">{count}</span>
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="relative min-h-75">
        {isPending && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 backdrop-blur-[1px]">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        )}

        {activeTab === 'overview' && <OverviewTab user={user} />}
        {activeTab === 'bids' && (
          <DataTable
            empty="No bids found"
            emptyIcon={<Gavel className="h-6 w-6 text-gray-400" />}
            total={bidsTotal}
            page={bidsPage}
            totalPages={bidsTotalPages}
            onPageChange={setBidsPage}
            headers={['Lot', 'Amount', 'Winning', 'Status', 'Date']}
            rows={bids.map((b) => [
              <span key="name" className="font-medium text-gray-900 max-w-55 truncate block">{b.productName || '—'}</span>,
              <span key="amt" className="font-medium">{fmt(b.amount)}</span>,
              b.isWinning
                ? <span key="w" className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700 uppercase">Winner</span>
                : <span key="w" className="text-gray-400">—</span>,
              <span key="s" className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${getStatusClasses(b.productStatus || 'draft')}`}>{b.productStatus || '—'}</span>,
              <span key="d" className="text-[12px] text-gray-500">{fmtDate(b.createdAt)}</span>,
            ])}
          />
        )}
        {activeTab === 'orders' && (
          <DataTable
            empty="No orders found"
            emptyIcon={<ShoppingCart className="h-6 w-6 text-gray-400" />}
            total={ordersTotal}
            page={ordersPage}
            totalPages={ordersTotalPages}
            onPageChange={setOrdersPage}
            headers={['Order #', 'Product', 'Group', 'Type', 'Status', 'Payment', 'Total', 'Date']}
            rows={orders.map((o) => [
              <span key="n" className="font-mono text-[12px] font-medium text-gray-900">{o.orderNumber}</span>,
              <span key="p" className="max-w-45 truncate block">{o.productName || '—'}</span>,
              <span key="g" className="text-gray-600">{o.groupName || '—'}</span>,
              <span key="t" className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${o.type === 'bid' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-700 border-gray-200'}`}>{o.type}</span>,
              <span key="s" className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${getStatusClasses(o.status)}`}>{o.status}</span>,
              <span key="ps" className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${getPaymentClasses(o.paymentStatus)}`}>{o.paymentStatus}</span>,
              <span key="a" className="font-medium">{fmt(o.totalAmount)}</span>,
              <span key="d" className="text-[12px] text-gray-500">{fmtShort(o.createdAt)}</span>,
            ])}
          />
        )}
        {activeTab === 'transactions' && (
          <DataTable
            empty="No transactions found"
            emptyIcon={<ArrowLeftRight className="h-6 w-6 text-gray-400" />}
            total={txTotal}
            page={txPage}
            totalPages={txTotalPages}
            onPageChange={setTxPage}
            headers={['Type', 'Amount', 'Balance After', 'Status', 'Description', 'Date']}
            rows={transactions.map((tx) => [
              <span key="t" className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getTxTypeClasses(tx.type)}`}>{tx.type.replace(/_/g, ' ')}</span>,
              <span key="a" className={`font-medium ${['deposit', 'return', 'refund', 'release'].includes(tx.type) ? 'text-emerald-700' : 'text-red-700'}`}>
                {['deposit', 'return', 'refund', 'release'].includes(tx.type) ? '+' : '-'}{fmt(Math.abs(tx.amount))}
              </span>,
              <span key="b" className="font-medium">{fmt(tx.balanceAfter)}</span>,
              <span key="s" className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${getStatusClasses(tx.status === 'completed' ? 'active' : tx.status === 'rejected' ? 'suspended' : 'pending_verification')}`}>{tx.status}</span>,
              <span key="desc" className="text-gray-600 max-w-50 truncate block">{tx.description || '—'}</span>,
              <span key="d" className="text-[12px] text-gray-500">{fmtDate(tx.createdAt)}</span>,
            ])}
          />
        )}
        {activeTab === 'registrations' && (
          <DataTable
            empty="No registrations found"
            emptyIcon={<TicketCheck className="h-6 w-6 text-gray-400" />}
            total={regTotal}
            page={regPage}
            totalPages={regTotalPages}
            onPageChange={setRegPage}
            headers={['Order #', 'Group', 'Deposit', 'Total', 'Payment', 'Status', 'VIP', 'Date']}
            rows={registrations.map((r) => [
              <span key="n" className="font-mono text-[12px] font-medium text-gray-900">{r.orderNumber}</span>,
              <span key="g" className="text-gray-600">{r.groupName || '—'}</span>,
              <span key="d" className="font-medium">{fmt(r.depositAmount)}</span>,
              <span key="t" className="font-medium">{fmt(r.totalAmount)}</span>,
              <span key="ps" className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${getPaymentClasses(r.paymentStatus)}`}>{r.paymentStatus}</span>,
              <span key="s" className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${getStatusClasses(r.status === 'active' ? 'active' : r.status === 'refunded' ? 'suspended' : 'inactive')}`}>{r.status}</span>,
              r.isVipFree
                ? <span key="v" className="inline-flex items-center rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200 uppercase"><Crown className="w-3 h-3 mr-0.5" /> Free</span>
                : <span key="v" className="text-gray-400">—</span>,
              <span key="dt" className="text-[12px] text-gray-500">{fmtShort(r.createdAt)}</span>,
            ])}
          />
        )}
      </div>
    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────────

function OverviewTab({ user }: { user: UserDetail }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-[14px] font-bold text-gray-900 mb-4">Account Summary</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl bg-gray-50 p-4">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Email Verified</span>
          <p className={`mt-1 text-[16px] font-bold ${user.emailVerified ? 'text-emerald-600' : 'text-red-600'}`}>
            {user.emailVerified ? 'Yes ✓' : 'No ✗'}
          </p>
        </div>
        <div className="rounded-xl bg-gray-50 p-4">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">VIP Status</span>
          <p className={`mt-1 text-[16px] font-bold ${user.isVip ? 'text-amber-600' : 'text-gray-600'}`}>
            {user.isVip ? 'VIP ★' : 'Standard'}
          </p>
        </div>
        <div className="rounded-xl bg-gray-50 p-4">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Wallet</span>
          <p className="mt-1 text-[16px] font-bold text-gray-900">{fmt(user.walletBalance)}</p>
        </div>
        <div className="rounded-xl bg-gray-50 p-4">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Registration</span>
          <p className="mt-1 text-[16px] font-bold text-gray-900 capitalize">{user.registerAs}</p>
        </div>
      </div>

      {/* Legacy Migration Note */}
      {!user.emailVerified && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
          <div className="flex items-start gap-3">
            <MailWarning className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-[13px] font-semibold text-amber-800">Legacy Migration: Email Unverified</p>
              <p className="text-[12px] text-amber-700 mt-1">
                This user may have been migrated from the legacy system. Their email needs to be re-verified in our system.
                When migrating legacy users to Supabase auth, ensure they go through the email verification flow.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex justify-between border-b border-gray-50 pb-2">
      <span className="text-gray-500 flex items-center gap-1.5">{icon}{label}</span>
      <span className="font-medium text-gray-900 text-right">{value}</span>
    </div>
  )
}

function EditField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wider">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
      />
    </div>
  )
}

function DataTable({
  headers,
  rows,
  empty,
  emptyIcon,
  total,
  page,
  totalPages,
  onPageChange,
}: {
  headers: string[]
  rows: React.ReactNode[][]
  empty: string
  emptyIcon: React.ReactNode
  total: number
  page: number
  totalPages: number
  onPageChange: (p: number) => void
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="border-b border-gray-200 bg-gray-50/50 text-xs font-medium text-gray-500">
            <tr>
              {headers.map((h) => (
                <th key={h} className="px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-[13px] text-gray-700">
            {rows.map((cells, i) => (
              <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                {cells.map((cell, j) => (
                  <td key={j} className="px-4 py-3">{cell}</td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={headers.length} className="px-6 py-16 text-center text-gray-400">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="rounded-full bg-gray-50 p-3">{emptyIcon}</div>
                    <p className="text-[14px]">{empty}</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2.5">
          <span className="text-[12px] text-gray-400">
            Page {page} of {totalPages} &bull; {total} total
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
              const p =
                totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page >= totalPages - 3 ? totalPages - 6 + i : page - 3 + i
              return (
                <button
                  key={p}
                  onClick={() => onPageChange(p)}
                  className={`h-6 min-w-6 rounded px-1.5 text-[12px] font-medium transition-colors ${
                    p === page ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {p}
                </button>
              )
            })}
            <button
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
