import { Banknote } from 'lucide-react'
import { PagePlaceholder } from '@/components/ui/page-placeholder'

export default function DepositsPage() {
  return (
    <PagePlaceholder
      title="Deposits"
      description="Review and approve bank deposit requests from users"
      icon={Banknote}
    />
  )
}
