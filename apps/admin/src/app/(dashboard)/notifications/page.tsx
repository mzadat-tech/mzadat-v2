import { Bell } from 'lucide-react'
import { PagePlaceholder } from '@/components/ui/page-placeholder'

export default function NotificationsPage() {
  return (
    <PagePlaceholder
      title="Notifications"
      description="Send and manage push notifications to users"
      icon={Bell}
    />
  )
}
