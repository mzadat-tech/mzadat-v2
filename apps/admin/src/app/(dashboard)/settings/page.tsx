import { Settings } from 'lucide-react'
import { PagePlaceholder } from '@/components/ui/page-placeholder'

export default function SettingsPage() {
  return (
    <PagePlaceholder
      title="Settings"
      description="Configure platform settings, branding, and system preferences"
      icon={Settings}
    />
  )
}
