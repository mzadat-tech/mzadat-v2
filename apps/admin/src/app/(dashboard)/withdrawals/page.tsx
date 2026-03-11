import { Wallet } from 'lucide-react'
import { PagePlaceholder } from '@/components/ui/page-placeholder'

export default function WithdrawalsPage() {
  return (
    <PagePlaceholder
      title="Withdrawals"
      description="Review and process withdrawal requests from merchants and users"
      icon={Wallet}
    />
  )
}
