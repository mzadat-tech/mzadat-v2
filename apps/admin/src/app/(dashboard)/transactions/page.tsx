import { ArrowLeftRight } from 'lucide-react'
import { PagePlaceholder } from '@/components/ui/page-placeholder'

export default function TransactionsPage() {
  return (
    <PagePlaceholder
      title="Transactions"
      description="View all wallet transactions — deposits, bids, purchases, refunds, and commissions"
      icon={ArrowLeftRight}
    />
  )
}
