'use client'

import { usePathname } from 'next/navigation'
import { Bell, Search, Menu } from 'lucide-react'
import { sidebarNav } from '@/lib/navigation'
import { useBreadcrumbOverride } from './breadcrumb-context'

interface HeaderProps {
  onMenuToggle: () => void
}

export function Header({ onMenuToggle }: HeaderProps) {
  const pathname = usePathname()
  const { override } = useBreadcrumbOverride()
  const breadcrumbs = override ?? getBreadcrumbs(pathname)

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-gray-200 bg-white/80 px-4 backdrop-blur-sm">
      {/* Left: Menu + Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="flex h-7 w-7 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors lg:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>
        <nav className="flex items-center gap-1.5 text-[13px]">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-gray-300">/</span>}
              <span className={i === breadcrumbs.length - 1 ? 'font-medium text-gray-900' : 'text-gray-500'}>
                {crumb}
              </span>
            </span>
          ))}
        </nav>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-0.5">
        <button className="flex h-7 w-7 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
          <Search className="h-4 w-4" />
        </button>
        <button className="relative flex h-7 w-7 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-brand-600" />
        </button>
      </div>
    </header>
  )
}

function getBreadcrumbs(pathname: string): string[] {
  if (pathname === '/') return ['Dashboard']

  // Find matching nav item
  for (const group of sidebarNav) {
    for (const item of group.items) {
      if (item.href !== '/' && pathname.startsWith(item.href)) {
        const segments = pathname
          .replace(item.href, '')
          .split('/')
          .filter(Boolean)
          .map((s) => s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' '))

        return [item.label, ...segments]
      }
    }
  }

  // Fallback: derive from path segments
  return pathname
    .split('/')
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' '))
}
