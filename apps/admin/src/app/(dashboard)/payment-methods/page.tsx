import { CreditCard } from 'lucide-react'
import { PagePlaceholder } from '@/components/ui/page-placeholder'

export default function PaymentMethodsPage() {
  return (
    <PagePlaceholder
      title="Payment Methods"
      description="Configure payment gateways and supported payment methods"
      icon={CreditCard}
    />
  )
}
