import { Store } from 'lucide-react'
import { PagePlaceholder } from '@/components/ui/page-placeholder'

export default function StoresPage() {
  return (
    <PagePlaceholder
      title="Stores"
      description="Manage merchant stores, their products, and commission settings"
      icon={Store}
    />
  )
}
