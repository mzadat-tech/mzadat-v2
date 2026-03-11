import { Users } from 'lucide-react'
import { PagePlaceholder } from '@/components/ui/page-placeholder'

export default function UsersPage() {
  return (
    <PagePlaceholder
      title="All Users"
      description="Manage customers, merchants, and admin accounts"
      icon={Users}
    />
  )
}
