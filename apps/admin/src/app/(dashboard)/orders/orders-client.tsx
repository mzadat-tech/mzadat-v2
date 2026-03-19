'use client'

import { useState, useTransition, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  Search,
  Eye,
  Loader2,
  AlertCircle,
  Bell,
  X,
  CreditCard,
  Crown,
  Undo2
} from 'lucide-react'
import type { OrderRow, GetOrdersParams, OrderStats } from '@/lib/actions/orders'
import {
  getOrders,
  getOrderDetails,
  updateOrderPaymentStatus,
  getOrderStats
} from '@/lib/actions/orders'

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

function getPaymentStatusClasses(status: string) {
  if (!status) return 'bg-gray-50 text-gray-700 border-gray-200'
  switch (status.toLowerCase()) {
    case 'paid':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'refunded':
      return 'bg-purple-50 text-purple-700 border-purple-200'
    case 'failed':
    case 'cancelled':
      return 'bg-red-50 text-red-700 border-red-200'
    case 'pending':
    default:
      return 'bg-amber-50 text-amber-700 border-amber-200'
  }
}

// ── Client Component ─────────────────────────────────────────────

export function OrdersClient() {
  const [isPending, startTransition] = useTransition()
  
  const [stats, setStats] = useState<OrderStats | null>(null)
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Modal State
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)

  const loadData = useCallback(() => {
    startTransition(async () => {
      try {
        const [statsData, ordersResult] = await Promise.all([
          getOrderStats(),
          getOrders({
            page,
            pageSize: 20,
            search: searchQuery || undefined,
          })
        ])
        
        setStats(statsData)
        setOrders(ordersResult.items)
        setTotal(ordersResult.total)
        setTotalPages(ordersResult.totalPages)
      } catch (err) {
        toast.error('Failed to load orders data')
        console.error(err)
      }
    })
  }, [page, searchQuery])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    setSearchQuery(searchInput)
  }

  const handleViewDetails = async (id: string) => {
    setIsModalOpen(true)
    setIsLoadingDetails(true)
    try {
      const details = await getOrderDetails(id)
      setSelectedOrder(details)
      loadData()
    } catch (err) {
      toast.error('Failed to load order details')
      setIsModalOpen(false)
    } finally {
      setIsLoadingDetails(false)
    }
  }

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await updateOrderPaymentStatus(id, status)
      toast.success('Payment status updated')
      setSelectedOrder({ ...selectedOrder, paymentStatus: status, status: status === 'refunded' ? 'refunded' : selectedOrder.status })
      loadData()
    } catch (err) {
      toast.error('Failed to update status')
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Orders & Registrations</h1>
        <p className="mt-1 text-[14px] text-gray-500">
          Manage all group registrations, invoices, and deposits.
        </p>
      </div>

      {/* 2. Stats Grid */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-gray-400">Total Registrations</span>
            <ShoppingCart className="h-4 w-4 text-gray-400" />
          </div>
          <p className="mt-1 text-[22px] font-bold tracking-tight text-gray-900">
            {stats?.total ?? 0}
          </p>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-gray-400">Total Amount</span>
            <CreditCard className="h-4 w-4 text-blue-400" />
          </div>
          <p className="mt-1 text-[22px] font-bold tracking-tight text-gray-900">
            {formatCurrency(stats?.totalAmount ?? 0)}
          </p>
        </div>

        <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-emerald-600/70">Paid</span>
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100">
              <span className="text-[10px] font-bold text-emerald-600">✓</span>
            </div>
          </div>
          <p className="mt-1 text-[22px] font-bold tracking-tight text-emerald-600">
            {formatCurrency(stats?.paidAmount ?? 0)}
          </p>
        </div>

        <div className="rounded-xl border border-red-100 bg-red-50/40 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-red-500/80">Pending/Unpaid</span>
            <AlertCircle className="h-4 w-4 text-red-400" />
          </div>
          <p className="mt-1 text-[22px] font-bold tracking-tight text-red-600">
            {formatCurrency(stats?.unpaidAmount ?? 0)}
          </p>
        </div>

        <div className="rounded-xl border border-purple-100 bg-purple-50/40 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-purple-600/70">Refunded</span>
            <Undo2 className="h-4 w-4 text-purple-400" />
          </div>
          <p className="mt-1 text-[22px] font-bold tracking-tight text-purple-600">
            {formatCurrency(stats?.refundedAmount ?? 0)}
          </p>
        </div>
      </div>

      {/* 3. Filters Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearch} className="relative w-full max-w-[360px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-4 text-[13px] outline-none transition-shadow hover:border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
            placeholder="Search orders, customers, or groups..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </form>
      </div>

      {/* 4. Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden relative min-h-[400px]">
        {isPending && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 backdrop-blur-[1px]">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="border-b border-gray-200 bg-gray-50/50 text-xs font-medium text-gray-500">
              <tr>
                <th className="px-5 py-3.5">Order Number</th>
                <th className="px-5 py-3.5">Customer</th>
                <th className="px-5 py-3.5">Group</th>
                <th className="px-5 py-3.5 text-right">Deposit</th>
                <th className="px-5 py-3.5">Payment</th>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-[13px] text-gray-700">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-5 py-3 font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      {order.orderNumber}
                      {order.unreadNotificationCount > 0 && (
                        <span className="flex h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_0_4px_rgba(59,130,246,0.1)]" title={`${order.unreadNotificationCount} unread notifications`} />
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="font-medium text-gray-900">{order.userFirstName} {order.userLastName}</div>
                    <div className="text-[12px] text-gray-500">{order.userEmail}</div>
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    <div className="flex items-center gap-1.5">
                      {order.groupTitle || '—'}
                      {order.isVipFree && <span className="inline-flex items-center rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200 uppercase"><Crown className="w-3 h-3 mr-0.5" /> VIP</span>}
                    </div>
                  </td>
                  <td className="px-5 py-3 font-medium text-gray-900 text-right">
                    {formatCurrency(Number(order.depositAmount))}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider transition-colors ${getPaymentStatusClasses(order.status === 'refunded' ? 'refunded' : order.paymentStatus)}`}>
                      {order.status === 'refunded' ? 'refunded' : order.paymentStatus}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-[12px] text-gray-500">
                    {formatDate(order.createdAt)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => handleViewDetails(order.id)}
                      className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900 inline-flex"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              
              {!isPending && orders.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="rounded-full bg-gray-50 p-3">
                        <ShoppingCart className="h-6 w-6 text-gray-400" />
                      </div>
                      <p className="text-[14px]">No orders found matching criteria.</p>
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

      {/* 6. Order Details Drawer/Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 p-4 backdrop-blur-sm sm:p-6 animate-in fade-in duration-200">
          <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h3 className="text-[16px] font-bold text-gray-900">Order Details</h3>
                <p className="text-[13px] text-gray-500">View and manage registration.</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-full bg-gray-50 p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-gray-50/50 p-6">
              {isLoadingDetails ? (
                <div className="py-20 flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
                  <span className="text-[13px] text-gray-500 font-medium">Loading details...</span>
                </div>
              ) : selectedOrder ? (
                <div className="space-y-6">
                  
                  {/* Summary Header */}
                  <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Order Number</span>
                        <p className="font-bold text-[18px] text-gray-900">{selectedOrder.orderNumber}</p>
                      </div>
                      <div className="text-right space-y-1">
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Date</span>
                        <p className="font-medium text-[14px] text-gray-900">{formatDate(selectedOrder.createdAt)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Customer & Registration Data */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                      <h3 className="text-[14px] font-bold text-gray-900 mb-3 flex items-center gap-2">
                        Customer Info
                      </h3>
                      <div className="space-y-2.5 text-[13px]">
                        <div className="flex justify-between border-b border-gray-50 pb-2">
                          <span className="text-gray-500">Name</span>
                          <span className="font-medium text-gray-900 text-right">{selectedOrder.userFirstName} {selectedOrder.userLastName}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-50 pb-2">
                          <span className="text-gray-500">Email</span>
                          <span className="font-medium text-gray-900 text-right">{selectedOrder.userEmail}</span>
                        </div>
                        <div className="flex justify-between pb-1">
                          <span className="text-gray-500">Phone</span>
                          <span className="font-medium text-gray-900 text-right">{selectedOrder.userPhone || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                      <h3 className="text-[14px] font-bold text-gray-900 mb-3 flex items-center gap-2">
                        Registration Details
                      </h3>
                      <div className="space-y-2.5 text-[13px]">
                        <div className="flex justify-between border-b border-gray-50 pb-2">
                          <span className="text-gray-500">Group</span>
                          <span className="font-medium text-gray-900 text-right">{selectedOrder.groupTitle || '—'}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-50 pb-2">
                          <span className="text-gray-500">Merchant</span>
                          <span className="font-medium text-gray-900 text-right">{selectedOrder.merchantName || '—'}</span>
                        </div>
                        <div className="flex justify-between pb-1">
                          <span className="text-gray-500">Type</span>
                          <span className="font-medium text-gray-900 text-right">
                            {selectedOrder.isVipFree ? <span className="inline-flex items-center rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200 uppercase"><Crown className="w-3 h-3 mr-0.5" /> VIP</span> : 'Standard'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment Summary */}
                  <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-gray-100">
                      <h3 className="text-[14px] font-bold text-gray-900 mb-4">Payment Summary</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between text-[14px]">
                          <span className="text-gray-600">Deposit Amount</span>
                          <span className="font-medium text-gray-900">{formatCurrency(Number(selectedOrder.depositAmount))}</span>
                        </div>
                        {Number(selectedOrder.discountAmount) > 0 && (
                          <div className="flex justify-between text-[14px] text-emerald-600">
                            <span>Discount</span>
                            <span className="font-medium">-{formatCurrency(Number(selectedOrder.discountAmount))}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-[14px]">
                          <span className="text-gray-600">Tax</span>
                          <span className="font-medium text-gray-900">{formatCurrency(Number(selectedOrder.taxAmount))}</span>
                        </div>
                        <div className="border-t border-gray-100 pt-3 flex justify-between font-bold text-[16px] text-gray-900">
                          <span>Total Paid</span>
                          <span>{formatCurrency(Number(selectedOrder.totalAmount))}</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-50 px-5 py-4 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Status</span>
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider transition-colors ${getPaymentStatusClasses(selectedOrder.status === 'refunded' ? 'refunded' : selectedOrder.paymentStatus)}`}>
                          {selectedOrder.status === 'refunded' ? 'refunded' : selectedOrder.paymentStatus}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Method</span>
                        <span className="capitalize text-[13px] font-semibold text-gray-900 flex items-center gap-1.5 justify-end"><CreditCard className="w-4 h-4 text-gray-400"/> {selectedOrder.paymentMethod}</span>
                      </div>
                    </div>
                  </div>

                  {/* Notifications List */}
                  {selectedOrder.notifications && selectedOrder.notifications.length > 0 && (
                    <div className="rounded-xl border border-blue-100 bg-blue-50/30 p-5">
                      <h3 className="text-[14px] font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Bell className="h-4 w-4 text-blue-500" /> Notifications
                      </h3>
                      <div className="space-y-3">
                        {selectedOrder.notifications.map((notif: any) => (
                          <div key={notif.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-[13px]">
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-semibold text-gray-900 leading-tight">{notif.title}</span>
                              <span className="text-[11px] font-medium text-gray-400 shrink-0 mt-0.5">{formatDate(notif.createdAt)}</span>
                            </div>
                            <p className="text-gray-600 leading-relaxed text-[13px]">{notif.body}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              ) : null}
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-3 border-t border-gray-100 bg-white px-6 py-4">
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none"
              >
                Close
              </button>
              {selectedOrder && selectedOrder.status !== 'refunded' && selectedOrder.paymentStatus === 'pending' && (
                <button
                  onClick={() => handleUpdateStatus(selectedOrder.id, 'paid')}
                  className="rounded-xl bg-gray-900 px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-gray-800 focus:outline-none"
                >
                  Mark as Paid
                </button>
              )}
              {selectedOrder && selectedOrder.status !== 'refunded' && selectedOrder.paymentStatus === 'paid' && (
                <button
                  onClick={() => handleUpdateStatus(selectedOrder.id, 'refunded')}
                  className="rounded-xl bg-red-600 px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-red-700 focus:outline-none"
                >
                  Mark as Refunded
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}