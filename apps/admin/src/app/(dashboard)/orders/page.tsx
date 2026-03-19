import { OrdersClient } from './orders-client'

export const metadata = {
  title: 'Orders | Mzadat Admin',
  description: 'Manage all group registrations and orders',
}

export default function OrdersPage() {
  return <OrdersClient />
}
