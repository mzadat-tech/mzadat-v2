import { FileText } from 'lucide-react'
import { PagePlaceholder } from '@/components/ui/page-placeholder'

export default function AuditLogPage() {
  return (
    <PagePlaceholder
      title="Audit Log"
      description="Track all admin actions and system changes"
      icon={FileText}
    />
  )
}
