import { StoreDetailClient } from './store-detail-client'

export const metadata = { title: 'Store Details | Mzadat Admin' }

export default async function StoreDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <StoreDetailClient storeId={id} />
}
