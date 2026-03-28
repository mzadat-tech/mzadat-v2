'use client'

import { useState, useTransition, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Store,
  ChevronLeft,
  ChevronRight,
  Search,
  Eye,
  Loader2,
  Plus,
  Package,
  Layers,
  Trash2,
  X,
} from 'lucide-react'
import type { StoreRow, StoreStats, GetStoresParams } from '@/lib/actions/stores'
import {
  getStores,
  getStoreStats,
  updateStoreStatus,
  createStore,
  deleteStore,
  getMerchantDropdown,
} from '@/lib/actions/stores'

// ── Helpers ──────────────────────────────────────────────────────

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function getStatusClasses(status: string) {
  switch (status) {
    case 'active': return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'inactive': return 'bg-gray-50 text-gray-500 border-gray-200'
    default: return 'bg-gray-50 text-gray-700 border-gray-200'
  }
}

// ── Client Component ─────────────────────────────────────────────

export function StoresClient() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [stats, setStats] = useState<StoreStats | null>(null)
  const [stores, setStores] = useState<StoreRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Filters
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [merchants, setMerchants] = useState<{ id: string; name: string; email: string; customId: string }[]>([])
  const [createForm, setCreateForm] = useState({
    ownerId: '',
    slug: '',
    nameEn: '',
    nameAr: '',
    descriptionEn: '',
    descriptionAr: '',
    email: '',
    phone: '',
    address: '',
    commissionRate: '0',
    vatApplicable: false,
    vatRate: '5',
  })

  const loadData = useCallback(() => {
    startTransition(async () => {
      try {
        const params: GetStoresParams = {
          page,
          pageSize: 25,
          search: searchQuery || undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
        }
        const [statsData, storesResult] = await Promise.all([
          getStoreStats(),
          getStores(params),
        ])
        setStats(statsData)
        setStores(storesResult.items)
        setTotal(storesResult.total)
        setTotalPages(storesResult.totalPages)
      } catch (err) {
        toast.error('Failed to load stores')
        console.error(err)
      }
    })
  }, [page, searchQuery, statusFilter])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    setSearchQuery(searchInput)
  }

  const handleStatusChange = async (storeId: string, newStatus: string) => {
    try {
      const result = await updateStoreStatus(storeId, newStatus)
      if (result.error) { toast.error(result.error); return }
      toast.success(`Store status updated to ${newStatus}`)
      loadData()
    } catch {
      toast.error('Failed to update status')
    }
  }

  const handleDelete = async (storeId: string, storeName: string) => {
    if (!confirm(`Delete store "${storeName}"? This cannot be undone.`)) return
    try {
      const result = await deleteStore(storeId)
      if (result.error) { toast.error(result.error); return }
      toast.success('Store deleted')
      loadData()
    } catch {
      toast.error('Failed to delete store')
    }
  }

  const openCreateModal = async () => {
    try {
      const m = await getMerchantDropdown()
      setMerchants(m)
      setIsCreateOpen(true)
    } catch {
      toast.error('Failed to load merchants')
    }
  }

  const handleCreate = async () => {
    if (!createForm.ownerId || !createForm.slug || !createForm.nameEn) {
      toast.error('Owner, slug, and English name are required')
      return
    }
    try {
      const result = await createStore({
        ownerId: createForm.ownerId,
        slug: createForm.slug,
        nameEn: createForm.nameEn,
        nameAr: createForm.nameAr,
        descriptionEn: createForm.descriptionEn,
        descriptionAr: createForm.descriptionAr,
        email: createForm.email,
        phone: createForm.phone,
        address: createForm.address,
        commissionRate: parseFloat(createForm.commissionRate) || 0,
        vatApplicable: createForm.vatApplicable,
        vatRate: parseFloat(createForm.vatRate) || 5,
      })
      if (result.error) { toast.error(result.error); return }
      toast.success('Store created')
      setIsCreateOpen(false)
      setCreateForm({ ownerId: '', slug: '', nameEn: '', nameAr: '', descriptionEn: '', descriptionAr: '', email: '', phone: '', address: '', commissionRate: '0', vatApplicable: false, vatRate: '5' })
      loadData()
    } catch {
      toast.error('Failed to create store')
    }
  }

  const autoSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Stores</h1>
          <p className="mt-1 text-[14px] text-gray-500">
            Manage merchant stores, products, and commission settings.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="rounded-xl bg-gray-900 px-4 py-2 text-[13px] font-medium text-white hover:bg-gray-800 inline-flex items-center gap-2 transition-colors"
        >
          <Plus className="h-4 w-4" /> New Store
        </button>
      </div>

      {/* 2. Stats Grid */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Total Stores" value={stats?.total ?? 0} icon={<Store className="h-4 w-4 text-gray-400" />} />
        <StatCard label="Active" value={stats?.active ?? 0} icon={<Store className="h-4 w-4 text-emerald-400" />} variant="emerald" />
        <StatCard label="Inactive" value={stats?.inactive ?? 0} icon={<Store className="h-4 w-4 text-gray-400" />} />
        <StatCard label="Total Products" value={stats?.totalProducts ?? 0} icon={<Package className="h-4 w-4 text-blue-400" />} variant="blue" />
        <StatCard label="Total Groups" value={stats?.totalGroups ?? 0} icon={<Layers className="h-4 w-4 text-purple-400" />} variant="purple" />
        <StatCard label="Active Groups" value={stats?.activeGroups ?? 0} icon={<Layers className="h-4 w-4 text-amber-400" />} variant="amber" />
      </div>

      {/* 3. Filters Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearch} className="relative w-full max-w-90">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-4 text-[13px] outline-none transition-shadow hover:border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
            placeholder="Search store name, slug, owner..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </form>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-700 outline-none transition-shadow hover:border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
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
                <th className="px-4 py-3.5">Store</th>
                <th className="px-4 py-3.5">Owner</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-center">Products</th>
                <th className="px-4 py-3.5 text-center">Groups</th>
                <th className="px-4 py-3.5 text-center">Active Groups</th>
                <th className="px-4 py-3.5 text-right">Commission</th>
                <th className="px-4 py-3.5">Created</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-[13px] text-gray-700">
              {stores.map((store) => (
                <tr key={store.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium text-gray-900">{store.nameEn || store.slug}</div>
                      {store.nameAr && <div className="text-[12px] text-gray-400" dir="rtl">{store.nameAr}</div>}
                      <div className="text-[11px] text-gray-400 font-mono">/{store.slug}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{store.ownerName}</div>
                    <div className="text-[12px] text-gray-500">{store.ownerEmail}</div>
                    <div className="text-[11px] text-gray-400 font-mono">{store.ownerCustomId}</div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={store.status}
                      onChange={(e) => handleStatusChange(store.id, e.target.value)}
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider cursor-pointer outline-none ${getStatusClasses(store.status)}`}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-medium text-gray-900">{store.productCount}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-medium text-gray-900">{store.groupCount}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {store.activeGroupCount > 0 ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        {store.activeGroupCount} Live
                      </span>
                    ) : (
                      <span className="text-gray-400">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    {store.commissionRate}%
                  </td>
                  <td className="px-4 py-3 text-[12px] text-gray-500">{formatDate(store.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => router.push(`/stores/${store.id}`)}
                        className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900 inline-flex"
                        title="View details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(store.id, store.nameEn || store.slug)}
                        className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 inline-flex"
                        title="Delete store"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!isPending && stores.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-16 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="rounded-full bg-gray-50 p-3">
                        <Store className="h-6 w-6 text-gray-400" />
                      </div>
                      <p className="text-[14px]">No stores found.</p>
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
                      p === page ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'
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

      {/* 6. Create Store Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/20 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h3 className="text-[16px] font-bold text-gray-900">Create New Store</h3>
                <p className="text-[13px] text-gray-500">Add a new merchant store.</p>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="rounded-full bg-gray-50 p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Owner */}
              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wider">Owner (Merchant) *</label>
                <select
                  value={createForm.ownerId}
                  onChange={(e) => setCreateForm({ ...createForm, ownerId: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                >
                  <option value="">Select a merchant...</option>
                  {merchants.map((m) => (
                    <option key={m.id} value={m.id}>{m.name} ({m.customId}) — {m.email}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label="Store Name (EN) *"
                  value={createForm.nameEn}
                  onChange={(v) => {
                    setCreateForm({ ...createForm, nameEn: v, slug: createForm.slug || autoSlug(v) })
                  }}
                />
                <FormField
                  label="Store Name (AR)"
                  value={createForm.nameAr}
                  onChange={(v) => setCreateForm({ ...createForm, nameAr: v })}
                />
              </div>

              <FormField
                label="Slug *"
                value={createForm.slug}
                onChange={(v) => setCreateForm({ ...createForm, slug: v })}
                hint="URL-friendly identifier (auto-generated from name)"
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label="Description (EN)"
                  value={createForm.descriptionEn}
                  onChange={(v) => setCreateForm({ ...createForm, descriptionEn: v })}
                />
                <FormField
                  label="Description (AR)"
                  value={createForm.descriptionAr}
                  onChange={(v) => setCreateForm({ ...createForm, descriptionAr: v })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Email" value={createForm.email} onChange={(v) => setCreateForm({ ...createForm, email: v })} />
                <FormField label="Phone" value={createForm.phone} onChange={(v) => setCreateForm({ ...createForm, phone: v })} />
              </div>

              <FormField label="Address" value={createForm.address} onChange={(v) => setCreateForm({ ...createForm, address: v })} />

              <div className="grid grid-cols-3 gap-4">
                <FormField label="Commission Rate (%)" value={createForm.commissionRate} onChange={(v) => setCreateForm({ ...createForm, commissionRate: v })} type="number" />
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wider">VAT Applicable</label>
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      checked={createForm.vatApplicable}
                      onChange={(e) => setCreateForm({ ...createForm, vatApplicable: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span className="text-[13px] text-gray-700">Yes</span>
                  </div>
                </div>
                <FormField label="VAT Rate (%)" value={createForm.vatRate} onChange={(v) => setCreateForm({ ...createForm, vatRate: v })} type="number" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-gray-100 bg-white px-6 py-4">
              <button
                onClick={() => setIsCreateOpen(false)}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-[13px] font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="rounded-xl bg-gray-900 px-4 py-2 text-[13px] font-medium text-white hover:bg-gray-800"
              >
                Create Store
              </button>
            </div>
          </div>
        </div>
      )}
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

function FormField({
  label,
  value,
  onChange,
  hint,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  hint?: string
  type?: string
}) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wider">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
      />
      {hint && <p className="mt-1 text-[11px] text-gray-400">{hint}</p>}
    </div>
  )
}
