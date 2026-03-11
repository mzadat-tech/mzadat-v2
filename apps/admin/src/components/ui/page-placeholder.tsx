import { type LucideIcon } from 'lucide-react'

interface PagePlaceholderProps {
  title: string
  description: string
  icon: LucideIcon
}

export function PagePlaceholder({ title, description, icon: Icon }: PagePlaceholderProps) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[15px] font-semibold tracking-tight text-gray-900">{title}</h1>
        <p className="text-[13px] text-gray-400">{description}</p>
      </div>

      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50/50 py-20">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100">
          <Icon className="h-6 w-6 text-gray-400" />
        </div>
        <h3 className="mt-4 text-[14px] font-medium text-gray-700">Coming Soon</h3>
        <p className="mt-1 max-w-sm text-center text-[13px] text-gray-400">
          This section is under development. Full functionality will be available soon.
        </p>
      </div>
    </div>
  )
}
