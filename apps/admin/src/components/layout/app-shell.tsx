'use client'

import { useState } from 'react'
import { cn } from '@mzadat/ui'
import { Sidebar } from './sidebar'
import { Header } from './header'
import { Toaster } from 'sonner'
import { BreadcrumbProvider } from './breadcrumb-context'

interface AppShellProps {
  children: React.ReactNode
  user: { fullName: string; role: string }
}

export function AppShell({ children, user }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <BreadcrumbProvider>
      <div className="min-h-screen bg-white">
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed(!collapsed)}
          user={user}
        />
        <div
          className={cn(
            'transition-[margin-left] duration-200',
            collapsed ? 'ml-14' : 'ml-60'
          )}
        >
          <Header onMenuToggle={() => setCollapsed(!collapsed)} />
          <main className="px-6 py-5">{children}</main>
        </div>
        <Toaster position="bottom-right" richColors closeButton />
      </div>
    </BreadcrumbProvider>
  )
}
