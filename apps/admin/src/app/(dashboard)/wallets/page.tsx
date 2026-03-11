import { Wallet } from 'lucide-react'
import { PagePlaceholder } from '@/components/ui/page-placeholder'

export default function WalletsPage() {
  return (
    <PagePlaceholder
      title="Wallets"
      description="View and manage user wallet balances and adjustments"
      icon={Wallet}
    />
  )
}
