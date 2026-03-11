import { formatDistanceToNow } from 'date-fns'

interface Order {
  id: string
  orderNumber: string
  totalAmount: unknown
  status: string
  createdAt: Date
  user: { firstName: string; lastName: string } | null
  product: { name: unknown } | null
}

export function RecentOrders({ orders, currency }: { orders: Order[]; currency: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <h2 className="text-[13px] font-semibold text-gray-900">Recent Orders</h2>
        <span className="text-[11px] text-gray-400">{orders.length} latest</span>
      </div>
      {orders.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-gray-400">No orders yet</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-2 text-left text-[12px] font-medium text-gray-400">Order</th>
                <th className="px-4 py-2 text-left text-[12px] font-medium text-gray-400">Customer</th>
                <th className="px-4 py-2 text-left text-[12px] font-medium text-gray-400">Product</th>
                <th className="px-4 py-2 text-right text-[12px] font-medium text-gray-400">Amount</th>
                <th className="px-4 py-2 text-center text-[12px] font-medium text-gray-400">Status</th>
                <th className="px-4 py-2 text-right text-[12px] font-medium text-gray-400">Time</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-2.5 font-medium text-gray-900">{order.orderNumber}</td>
                  <td className="px-4 py-2.5 text-gray-600">
                    {order.user ? `${order.user.firstName} ${order.user.lastName}` : '—'}
                  </td>
                  <td className="max-w-[180px] truncate px-4 py-2.5 text-gray-600">
                    {(order.product?.name as Record<string, string>)?.en || '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium text-gray-900">
                    {currency} {Number(order.totalAmount).toFixed(3)}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <OrderStatus status={order.status} />
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-400">
                    {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function OrderStatus({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-600 border-amber-200',
    processing: 'bg-blue-50 text-blue-600 border-blue-200',
    confirmed: 'bg-brand-50 text-brand-600 border-brand-200',
    completed: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    cancelled: 'bg-red-50 text-red-600 border-red-200',
    refunded: 'bg-gray-50 text-gray-500 border-gray-200',
  }

  return (
    <span
      className={`inline-flex rounded border px-1.5 py-0.5 text-[11px] font-medium capitalize ${styles[status] || 'bg-gray-50 text-gray-500 border-gray-200'}`}
    >
      {status}
    </span>
  )
}
