'use client'

import { useState, useTransition, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Store,
  Loader2,
  Package,
  Layers,
  ShoppingCart,
  Crown,
  Pencil,
  Save,
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Gavel,
  Tag,
} from 'lucide-react'
import type {
  StoreDetail,
  StoreProductRow,
  StoreGroupRow,
  StoreOrderRow,
} from '@/lib/actions/stores'
import {
  getStoreById,
  getStoreProducts,
  getStoreGroups,
  getStoreOrders,
  updateStore,
  updateStoreStatus,
} from '@/lib/actions/stores'

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

function getStatusClasses(status: string) {
  switch (status) {
    case 'active': return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'inactive': return 'bg-gray-50 text-gray-500 border-gray-200'
    case 'upcoming': return 'bg-blue-50 text-blue-700 border-blue-200'
    case 'closed': return 'bg-gray-50 text-gray-500 border-gray-200'
    case 'cancelled': return 'bg-red-50 text-red-700 border-red-200'
    case 'published': return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'draft': return 'bg-gray-50 text-gray-500 border-gray-200'
    case 'pending': return 'bg-amber-50 text-amber-700 border-amber-200'
    default: return 'bg-gray-50 text-gray-700 border-gray-200'
  }
}

function getPaymentClasses(status: string) {
  switch (status) {
    case 'paid': return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'unpaid': return 'bg-red-50 text-red-700 border-red-200'
    default: return 'bg-amber-50 text-amber-700 border-amber-200'
  }
}

// ── Tabs ─────────────────────────────────────────────────────────

type Tab = 'overview' | 'products' | 'groups' | 'orders'

const tabDefs: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'overview', label: 'Overview', icon: <Store className="h-4 w-4" /> },
  { key: 'products', label: 'Lots', icon: <Package className="h-4 w-4" /> },
  { key: 'groups', label: 'Groups', icon: <Layers className="h-4 w-4" /> },
  { key: 'orders', label: 'Orders', icon: <ShoppingCart className="h-4 w-4" /> },
]

// ── Main Component ───────────────────────────────────────────────

export function StoreDetailClient({ storeId }: { storeId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [store, setStore] = useState<StoreDetail | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<Record<string, string | boolean>>({})

  // Products
  const [products, setProducts] = useState<StoreProductRow[]>([])
  const [productsTotal, setProductsTotal] = useState(0)
  const [productsPage, setProductsPage] = useState(1)
  const [productsTotalPages, setProductsTotalPages] = useState(1)

  // Groups
  const [groups, setGroups] = useState<StoreGroupRow[]>([])
  const [groupsTotal, setGroupsTotal] = useState(0)
  const [groupsPage, setGroupsPage] = useState(1)
  const [groupsTotalPages, setGroupsTotalPages] = useState(1)

  // Orders
  const [orders, setOrders] = useState<StoreOrderRow[]>([])
  const [ordersTotal, setOrdersTotal] = useState(0)
  const [ordersPage, setOrdersPage] = useState(1)
  const [ordersTotalPages, setOrdersTotalPages] = useState(1)

  // Counts for badges
  const [productCountBadge, setProductCountBadge] = useState(0)
  const [groupCountBadge, setGroupCountBadge] = useState(0)
  const [orderCountBadge, setOrderCountBadge] = useState(0)

  const loadStore = useCallback(() => {
    startTransition(async () => {
      try {
        const s = await getStoreById(storeId)
        if (!s) {
          toast.error('Store not found')
          router.push('/stores')
          return
        }
        setStore(s)
      } catch (err) {
        toast.error('Failed to load store')
        console.error(err)
      }
    })
  }, [storeId, router])

  useEffect(() => { loadStore() }, [loadStore])

  // Load counts
  useEffect(() => {
    const loadCounts = async () => {
      try {
        const [p, g, o] = await Promise.all([
          getStoreProducts(storeId, 1, 1),
          getStoreGroups(storeId, 1, 1),
          getStoreOrders(storeId, 1, 1),
        ])
        setProductCountBadge(p.total)
        setGroupCountBadge(g.total)
        setOrderCountBadge(o.total)
      } catch { /* silent */ }
    }
    loadCounts()
  }, [storeId])

  // Tab data loading
  useEffect(() => {
    if (activeTab === 'products') {
      startTransition(async () => {
        const result = await getStoreProducts(storeId, productsPage)
        setProducts(result.items)
        setProductsTotal(result.total)
        setProductsTotalPages(result.totalPages)
        setProductCountBadge(result.total)
      })
    }
  }, [activeTab, productsPage, storeId])

  useEffect(() => {
    if (activeTab === 'groups') {
      startTransition(async () => {
        const result = await getStoreGroups(storeId, groupsPage)
        setGroups(result.items)
        setGroupsTotal(result.total)
        setGroupsTotalPages(result.totalPages)
        setGroupCountBadge(result.total)
      })
    }
  }, [activeTab, groupsPage, storeId])

  useEffect(() => {
    if (activeTab === 'orders') {
      startTransition(async () => {
        const result = await getStoreOrders(storeId, ordersPage)
        setOrders(result.items)
        setOrdersTotal(result.total)
        setOrdersTotalPages(result.totalPages)
        setOrderCountBadge(result.total)
      })
    }
  }, [activeTab, ordersPage, storeId])

  // ── Edit Handlers ─────────────────────────────────────────────

  const startEdit = () => {
    if (!store) return
    setEditForm({
      nameEn: store.nameEn || '',
      nameAr: store.nameAr || '',
      descriptionEn: store.descriptionEn || '',
      descriptionAr: store.descriptionAr || '',
      email: store.email || '',
      phone: store.phone || '',
      address: store.address || '',
      commissionRate: String(store.commissionRate),
      vatRate: String(store.vatRate),
    })
    setIsEditing(true)
  }

  const handleSave = async () => {
    const result = await updateStore(storeId, {
      nameEn: editForm.nameEn as string,
      nameAr: editForm.nameAr as string,
      descriptionEn: editForm.descriptionEn as string,
      descriptionAr: editForm.descriptionAr as string,
      email: editForm.email as string,
      phone: editForm.phone as string,
      address: editForm.address as string,
      commissionRate: parseFloat(editForm.commissionRate as string) || 0,
      vatRate: parseFloat(editForm.vatRate as string) || 5,
    })
    if (result.error) { toast.error(result.error); return }
    toast.success('Store updated')
    setIsEditing(false)
    loadStore()
  }

  const handleStatusChange = async (status: string) => {
    const result = await updateStoreStatus(storeId, status)
    if (result.error) { toast.error(result.error); return }
    toast.success(`Status updated to ${status}`)
    loadStore()
  }

  if (!store) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/stores')}
          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              {store.nameEn || store.slug || 'Unnamed Store'}
            </h1>
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${getStatusClasses(store.status)}`}>
              {store.status}
            </span>
          </div>
          <p className="mt-0.5 text-[13px] text-gray-500">
            /{store.slug} &bull; Owner: {store.ownerName} ({store.ownerCustomId})
          </p>
        </div>
      </div>

      {/* Store Info + Quick Actions */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Store Info */}
        <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <h2 className="text-[15px] font-bold text-gray-900">Store Information</h2>
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
                <EditField label="Name (EN)" value={editForm.nameEn as string} onChange={(v) => setEditForm({ ...editForm, nameEn: v })} />
                <EditField label="Name (AR)" value={editForm.nameAr as string} onChange={(v) => setEditForm({ ...editForm, nameAr: v })} />
                <EditField label="Description (EN)" value={editForm.descriptionEn as string} onChange={(v) => setEditForm({ ...editForm, descriptionEn: v })} />
                <EditField label="Description (AR)" value={editForm.descriptionAr as string} onChange={(v) => setEditForm({ ...editForm, descriptionAr: v })} />
                <EditField label="Email" value={editForm.email as string} onChange={(v) => setEditForm({ ...editForm, email: v })} />
                <EditField label="Phone" value={editForm.phone as string} onChange={(v) => setEditForm({ ...editForm, phone: v })} />
                <EditField label="Address" value={editForm.address as string} onChange={(v) => setEditForm({ ...editForm, address: v })} />
                <EditField label="Commission Rate (%)" value={editForm.commissionRate as string} onChange={(v) => setEditForm({ ...editForm, commissionRate: v })} type="number" />
                <EditField label="VAT Rate (%)" value={editForm.vatRate as string} onChange={(v) => setEditForm({ ...editForm, vatRate: v })} type="number" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-[13px]">
                <InfoRow label="Name (EN)" value={store.nameEn || '—'} />
                <InfoRow label="Name (AR)" value={store.nameAr || '—'} />
                <InfoRow label="Description (EN)" value={store.descriptionEn || '—'} />
                <InfoRow label="Description (AR)" value={store.descriptionAr || '—'} />
                <InfoRow label="Email" value={store.email || '—'} />
                <InfoRow label="Phone" value={store.phone || '—'} />
                <InfoRow label="Address" value={store.address || '—'} />
                <InfoRow label="Slug" value={`/${store.slug}`} />
                <InfoRow label="Created" value={fmtDate(store.createdAt)} />
                <InfoRow label="Updated" value={fmtDate(store.updatedAt)} />
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Commission & VAT */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <span className="text-[12px] font-bold text-gray-400 uppercase tracking-wider">Financial</span>
            <div className="mt-3 space-y-3">
              <div className="flex justify-between text-[13px]">
                <span className="text-gray-500">Commission Rate</span>
                <span className="font-bold text-gray-900">{store.commissionRate}%</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-gray-500">VAT Applicable</span>
                <span className={`font-bold ${store.vatApplicable ? 'text-emerald-600' : 'text-gray-600'}`}>
                  {store.vatApplicable ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-gray-500">VAT Rate</span>
                <span className="font-bold text-gray-900">{store.vatRate}%</span>
              </div>
            </div>
          </div>

          {/* Owner */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <span className="text-[12px] font-bold text-gray-400 uppercase tracking-wider">Owner</span>
            <div className="mt-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-[13px] font-bold text-gray-600 uppercase">
                  {store.ownerName.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-gray-900 text-[13px]">{store.ownerName}</span>
                    {store.ownerIsVip && <Crown className="h-3.5 w-3.5 text-amber-500" />}
                  </div>
                  <div className="text-[12px] text-gray-500">{store.ownerEmail}</div>
                  <div className="text-[11px] text-gray-400 font-mono">{store.ownerCustomId}</div>
                </div>
              </div>
              <button
                onClick={() => router.push(`/users/${store.ownerId}`)}
                className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-1.5 text-[12px] font-medium text-gray-600 hover:bg-gray-50 inline-flex items-center justify-center gap-1.5 transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" /> View Owner Profile
              </button>
            </div>
          </div>

          {/* Status */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <label className="block text-[11px] font-medium text-gray-500 mb-2 uppercase tracking-wider">Store Status</label>
            <select
              value={store.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className={`w-full rounded-xl border px-3 py-2 text-[13px] font-medium cursor-pointer outline-none ${getStatusClasses(store.status)}`}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1">
          {tabDefs.map((tab) => {
            const count =
              tab.key === 'products' ? productCountBadge :
              tab.key === 'groups' ? groupCountBadge :
              tab.key === 'orders' ? orderCountBadge : 0
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

        {activeTab === 'overview' && <OverviewTab store={store} productCount={productCountBadge} groupCount={groupCountBadge} orderCount={orderCountBadge} />}

        {activeTab === 'products' && (
          <DataTable
            empty="No products/lots in this store"
            emptyIcon={<Package className="h-6 w-6 text-gray-400" />}
            total={productsTotal}
            page={productsPage}
            totalPages={productsTotalPages}
            onPageChange={setProductsPage}
            headers={['Lot', 'Category', 'Group', 'Sale Type', 'Status', 'Price', 'Current Bid', 'Bids', 'Created']}
            rows={products.map((p) => [
              <span key="n" className="font-medium text-gray-900 max-w-50 truncate block">{p.nameEn || p.slug}</span>,
              <span key="c" className="text-gray-600">{p.categoryName || '—'}</span>,
              <span key="g" className="text-gray-600">{p.groupName || '—'}</span>,
              <span key="st" className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${p.saleType === 'auction' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                {p.saleType === 'auction' ? <><Gavel className="h-3 w-3 mr-0.5" /> Auction</> : <><Tag className="h-3 w-3 mr-0.5" /> Direct</>}
              </span>,
              <span key="s" className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${getStatusClasses(p.status)}`}>{p.status}</span>,
              <span key="pr" className="font-medium">{fmt(p.price)}</span>,
              <span key="cb" className="font-medium">{p.saleType === 'auction' ? fmt(p.currentBid) : '—'}</span>,
              <span key="bc" className="text-center">{p.bidCount}</span>,
              <span key="d" className="text-[12px] text-gray-500">{fmtShort(p.createdAt)}</span>,
            ])}
          />
        )}

        {activeTab === 'groups' && (
          <DataTable
            empty="No groups in this store"
            emptyIcon={<Layers className="h-6 w-6 text-gray-400" />}
            total={groupsTotal}
            page={groupsPage}
            totalPages={groupsTotalPages}
            onPageChange={setGroupsPage}
            headers={['Group', 'Status', 'Start', 'End', 'Min Deposit', 'Lots', 'Registrations', 'Created']}
            rows={groups.map((g) => [
              <div key="n">
                <span className="font-medium text-gray-900 block">{g.nameEn || '—'}</span>
                {g.nameAr && <span className="text-[11px] text-gray-400 block" dir="rtl">{g.nameAr}</span>}
              </div>,
              <span key="s" className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${getStatusClasses(g.status)}`}>{g.status}</span>,
              <span key="sd" className="text-[12px] text-gray-500">{fmtShort(g.startDate)}</span>,
              <span key="ed" className="text-[12px] text-gray-500">{fmtShort(g.endDate)}</span>,
              <span key="md" className="font-medium">{fmt(g.minDeposit)}</span>,
              <span key="pc" className="text-center font-medium">{g.productCount}</span>,
              <span key="rc" className="text-center font-medium">{g.registrationCount}</span>,
              <span key="d" className="text-[12px] text-gray-500">{fmtShort(g.createdAt)}</span>,
            ])}
          />
        )}

        {activeTab === 'orders' && (
          <DataTable
            empty="No orders for this store"
            emptyIcon={<ShoppingCart className="h-6 w-6 text-gray-400" />}
            total={ordersTotal}
            page={ordersPage}
            totalPages={ordersTotalPages}
            onPageChange={setOrdersPage}
            headers={['Order #', 'Product', 'Buyer', 'Type', 'Status', 'Payment', 'Total', 'Date']}
            rows={orders.map((o) => [
              <span key="n" className="font-mono text-[12px] font-medium text-gray-900">{o.orderNumber}</span>,
              <span key="p" className="max-w-45 truncate block">{o.productName || '—'}</span>,
              <span key="b" className="text-gray-600">{o.buyerName}</span>,
              <span key="t" className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${o.type === 'bid' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-700 border-gray-200'}`}>{o.type}</span>,
              <span key="s" className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${getStatusClasses(o.status)}`}>{o.status}</span>,
              <span key="ps" className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${getPaymentClasses(o.paymentStatus)}`}>{o.paymentStatus}</span>,
              <span key="a" className="font-medium">{fmt(o.totalAmount)}</span>,
              <span key="d" className="text-[12px] text-gray-500">{fmtShort(o.createdAt)}</span>,
            ])}
          />
        )}
      </div>
    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────────

function OverviewTab({ store, productCount, groupCount, orderCount }: { store: StoreDetail; productCount: number; groupCount: number; orderCount: number }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Package className="h-4 w-4 text-blue-400" />
            <span className="text-[12px] font-bold text-gray-400 uppercase tracking-wider">Total Lots</span>
          </div>
          <p className="text-[28px] font-bold tracking-tight text-gray-900">{productCount}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Layers className="h-4 w-4 text-purple-400" />
            <span className="text-[12px] font-bold text-gray-400 uppercase tracking-wider">Total Groups</span>
          </div>
          <p className="text-[28px] font-bold tracking-tight text-gray-900">{groupCount}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingCart className="h-4 w-4 text-emerald-400" />
            <span className="text-[12px] font-bold text-gray-400 uppercase tracking-wider">Total Orders</span>
          </div>
          <p className="text-[28px] font-bold tracking-tight text-gray-900">{orderCount}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Store className="h-4 w-4 text-gray-400" />
            <span className="text-[12px] font-bold text-gray-400 uppercase tracking-wider">Commission</span>
          </div>
          <p className="text-[28px] font-bold tracking-tight text-gray-900">{store.commissionRate}%</p>
        </div>
      </div>

      {store.descriptionEn && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="text-[14px] font-bold text-gray-900 mb-2">Description</h3>
          <p className="text-[13px] text-gray-600 leading-relaxed">{store.descriptionEn}</p>
          {store.descriptionAr && (
            <p className="text-[13px] text-gray-600 leading-relaxed mt-2" dir="rtl">{store.descriptionAr}</p>
          )}
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-gray-50 pb-2">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900 text-right">{value}</span>
    </div>
  )
}

function EditField({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wider">{label}</label>
      <input
        type={type}
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
