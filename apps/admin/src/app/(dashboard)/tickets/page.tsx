import { TicketCheck } from 'lucide-react'
import { PagePlaceholder } from '@/components/ui/page-placeholder'

export default function TicketsPage() {
  return (
    <PagePlaceholder
      title="Tickets"
      description="Manage support tickets and customer inquiries"
      icon={TicketCheck}
    />
  )
}
