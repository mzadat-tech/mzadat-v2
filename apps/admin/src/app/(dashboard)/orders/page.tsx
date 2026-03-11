import { ShoppingCart } from 'lucide-react'
import { PagePlaceholder } from '@/components/ui/page-placeholder'

export default function OrdersPage() {
  return (
    <PagePlaceholder
      title="Orders"
      description="View and manage all orders, invoices, and receipts"
      icon={ShoppingCart}
    />
  )
}
