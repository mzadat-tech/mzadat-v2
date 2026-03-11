'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@mzadat/ui'
import { sidebarNav, type NavGroup } from '@/lib/navigation'
import { ChevronLeft, LogOut } from 'lucide-react'
import { signOut } from '@/lib/actions/auth'
import { APP_NAME } from '@mzadat/config'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  user: { fullName: string; role: string }
}

export function Sidebar({ collapsed, onToggle, user }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-30 flex flex-col border-r border-gray-200 bg-gray-50/80 transition-[width] duration-200',
        collapsed ? 'w-[56px]' : 'w-[240px]'
      )}
    >
      {/* Header */}
      <div className="flex h-14 items-center border-b border-gray-200 px-3">
        {!collapsed ? (
          <Link href="/" className="flex items-center gap-2.5 justify-center w-full h-full">
            <Image src="/logo-dark.png" alt={APP_NAME} width={120} height={54} className="h-full w-full object-contain" />
          </Link>
        ) : (
          <Link href="/" className="mx-auto">
            <Image src="/logo-dark.png" alt={APP_NAME} width={24} height={24} className="h-6 w-6 object-contain" />
          </Link>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {sidebarNav.map((group) => (
          <NavGroupSection key={group.label} group={group} pathname={pathname} collapsed={collapsed} />
        ))}
      </nav>

      {/* Footer — User + Collapse */}
      <div className="border-t border-gray-200 p-2">
        {!collapsed ? (
          <div className="flex items-center gap-2 rounded px-2 py-1.5">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[10px] font-semibold text-brand-700">
              {user.fullName.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-medium text-gray-900">{user.fullName}</p>
              <p className="truncate text-[10px] text-gray-500 capitalize">{user.role.replace('_', ' ')}</p>
            </div>
            <form action={signOut}>
              <button
                type="submit"
                className="flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
                title="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        ) : (
          <form action={signOut}>
            <button
              type="submit"
              className="mx-auto flex h-7 w-7 items-center justify-center rounded text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </form>
        )}

        {/* Collapse toggle */}
        {/* <button
          onClick={onToggle}
          className="mt-1 flex w-full items-center justify-center rounded py-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft className={cn('h-3.5 w-3.5 transition-transform', collapsed && 'rotate-180')} />
        </button> */}
      </div>
    </aside>
  )
}

function NavGroupSection({
  group,
  pathname,
  collapsed,
}: {
  group: NavGroup
  pathname: string
  collapsed: boolean
}) {
  return (
    <div className="mb-4">
      {!collapsed && (
        <p className="mb-1 px-2 text-[10px] font-medium uppercase tracking-wider text-gray-400">
          {group.label}
        </p>
      )}
      <ul className="space-y-px">
        {group.items.map((item) => {
          const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
          const Icon = item.icon
          const linkClasses = cn(
            'flex items-center gap-2 rounded px-2 py-1.5 text-[13px] font-medium transition-colors',
            isActive
              ? 'bg-brand-50 text-brand-600'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
            collapsed && 'justify-center px-0'
          )
          const iconEl = <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-brand-600' : 'text-gray-400')} />

          return (
            <li key={item.href}>
              {item.external ? (
                <a
                  href={item.href}
                  className={linkClasses}
                  title={collapsed ? item.label : undefined}
                >
                  {iconEl}
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </a>
              ) : (
                <Link
                  href={item.href}
                  className={linkClasses}
                  title={collapsed ? item.label : undefined}
                >
                  {iconEl}
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
