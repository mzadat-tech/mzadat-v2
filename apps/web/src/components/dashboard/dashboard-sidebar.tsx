'use client'

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
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@mzadat/ui/components/avatar'
import { Button } from '@mzadat/ui'
import { cn, formatOMR } from '@mzadat/ui/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

interface DashboardUser {
  id: string
  email: string
  firstName: string
  lastName: string
  avatarUrl?: string
  role: string
  walletBalance: number
}

interface DashboardSidebarProps {
  user: DashboardUser
  locale: string
  direction: 'rtl' | 'ltr'
}

const navItems = (isAr: boolean) => [
  { icon: LayoutDashboard, label: isAr ? 'لوحة التحكم' : 'Overview', href: '/dashboard' },
  { icon: User, label: isAr ? 'الملف الشخصي' : 'Profile', href: '/dashboard/profile' },
  { icon: Gavel, label: isAr ? 'مزايداتي' : 'My Bids', href: '/dashboard/bids' },
  { icon: Trophy, label: isAr ? 'المزادات الفائزة' : 'Won Auctions', href: '/dashboard/won' },
  { icon: Wallet, label: isAr ? 'المحفظة' : 'Wallet', href: '/dashboard/wallet' },
  { icon: CreditCard, label: isAr ? 'التأمينات' : 'Deposits', href: '/dashboard/deposits' },
  { icon: ArrowDownUp, label: isAr ? 'المعاملات' : 'Transactions', href: '/dashboard/transactions' },
]

export function DashboardSidebar({ user, locale, direction }: DashboardSidebarProps) {
  const pathname = usePathname()
  const isAr = locale === 'ar'
  const items = navItems(isAr)
  const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <aside className="hidden w-60 shrink-0 lg:block">
      <div className="sticky top-20 space-y-4">
        {/* User card */}
        <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
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
        <nav className="rounded-xl border border-border bg-white shadow-sm">
          <div className="space-y-0.5 p-2">
            {items.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))
              const isExactDashboard = item.href === '/dashboard' && pathname === '/dashboard'
              const active = isExactDashboard || isActive
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              )
            })}
          </div>
          <div className="border-t border-border p-2">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              {isAr ? 'تسجيل الخروج' : 'Sign Out'}
            </button>
          </div>
        </nav>
      </div>
    </aside>
  )
}

/** Mobile dashboard nav — rendered as a horizontal scrollable strip */
export function DashboardMobileNav({ locale }: { locale: string }) {
  const pathname = usePathname()
  const isAr = locale === 'ar'
  const items = navItems(isAr)

  return (
    <div className="mb-4 -mx-4 overflow-x-auto border-b border-border bg-white px-4 lg:hidden">
      <nav className="flex gap-1 py-2">
        {items.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))
          const isExactDashboard = item.href === '/dashboard' && pathname === '/dashboard'
          const active = isExactDashboard || isActive
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                active
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
