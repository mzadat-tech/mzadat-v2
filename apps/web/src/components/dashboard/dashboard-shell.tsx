'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  User,
  Gavel,
  Trophy,
  Wallet,
  CreditCard,
  ArrowDownUp,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Bell,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@mzadat/ui/components/avatar'
import { Badge } from '@mzadat/ui/components/badge'
import { Button } from '@mzadat/ui'
import { cn, formatOMR } from '@mzadat/ui/lib/utils'
import { createClient } from '@/lib/supabase/client'

interface DashboardUser {
  id: string
  email: string
  firstName: string
  lastName: string
  avatarUrl?: string
  role: string
  walletBalance: number
}

interface DashboardShellProps {
  children: React.ReactNode
  user: DashboardUser
  locale: string
  direction: 'rtl' | 'ltr'
}

export function DashboardShell({ children, user, locale, direction }: DashboardShellProps) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const isAr = locale === 'ar'

  const navItems = [
    { icon: LayoutDashboard, label: isAr ? 'لوحة التحكم' : 'Dashboard', href: '/dashboard' },
    { icon: User, label: isAr ? 'الملف الشخصي' : 'Profile', href: '/dashboard/profile' },
    { icon: Gavel, label: isAr ? 'مزايداتي' : 'My Bids', href: '/dashboard/bids' },
    { icon: Trophy, label: isAr ? 'المزادات الفائزة' : 'Won Auctions', href: '/dashboard/won' },
    { icon: Wallet, label: isAr ? 'المحفظة' : 'Wallet', href: '/dashboard/wallet' },
    { icon: CreditCard, label: isAr ? 'التأمينات' : 'Deposits', href: '/dashboard/deposits' },
    { icon: ArrowDownUp, label: isAr ? 'المعاملات' : 'Transactions', href: '/dashboard/transactions' },
  ]

  const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 border-e border-border bg-white lg:block">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center border-b border-border px-5">
            <Link href="/" className="text-xl font-bold text-primary-900">
              {isAr ? 'مزادات' : 'Mzadat'}
            </Link>
          </div>

          {/* User Info */}
          <div className="border-b border-border p-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.avatarUrl} alt={user.firstName} />
                <AvatarFallback className="bg-primary-100 text-sm text-primary-700">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {user.firstName} {user.lastName}
                </p>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <div className="mt-3 rounded-lg bg-primary-50 px-3 py-2">
              <p className="text-[10px] font-medium uppercase tracking-wider text-primary-600">
                {isAr ? 'الرصيد' : 'Balance'}
              </p>
              <p className="text-lg font-bold text-primary-800">
                {formatOMR(user.walletBalance)}
              </p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* Logout */}
          <div className="border-t border-border p-3">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              {isAr ? 'تسجيل الخروج' : 'Sign Out'}
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            />
            <motion.aside
              initial={{ x: direction === 'rtl' ? '100%' : '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: direction === 'rtl' ? '100%' : '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={cn(
                'fixed top-0 z-50 h-full w-72 border-e border-border bg-white shadow-xl lg:hidden',
                direction === 'rtl' ? 'right-0' : 'left-0',
              )}
            >
              <div className="flex h-16 items-center justify-between border-b border-border px-5">
                <span className="text-xl font-bold text-primary-900">
                  {isAr ? 'مزادات' : 'Mzadat'}
                </span>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Mobile User Info */}
              <div className="border-b border-border p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.avatarUrl} alt={user.firstName} />
                    <AvatarFallback className="bg-primary-100 text-sm text-primary-700">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold">{user.firstName} {user.lastName}</p>
                    <p className="text-xs text-muted-foreground">{formatOMR(user.walletBalance)}</p>
                  </div>
                </div>
              </div>

              <nav className="space-y-0.5 p-3">
                {navItems.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </Link>
                  )
                })}
              </nav>

              <div className="border-t border-border p-3">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  {isAr ? 'تسجيل الخروج' : 'Sign Out'}
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-white px-4 lg:px-8">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -end-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent-500 text-[9px] font-bold text-white">
                3
              </span>
            </Button>
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
              {isAr ? 'العودة للموقع' : 'Back to Site'}
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
