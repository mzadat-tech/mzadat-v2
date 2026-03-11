import { MapPin } from 'lucide-react'
import { PagePlaceholder } from '@/components/ui/page-placeholder'

export default function LocationsPage() {
  return (
    <PagePlaceholder
      title="Locations"
      description="Manage countries, states, and cities for user addresses and shipping"
      icon={MapPin}
    />
  )
}
