'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion'
import {
  Menu,
  X,
  ChevronDown,
  Gavel,
  Store,
  Phone,
  User,
  LogIn,
  LogOut,
  Clock,
  LayoutDashboard,
  Wallet,
  Trophy,
  CreditCard,
  Bell,
  CheckCheck,
  Info,
} from 'lucide-react'
import { Button } from '@mzadat/ui'
import { Avatar, AvatarFallback, AvatarImage } from '@mzadat/ui/components/avatar'
import { cn, formatOMR } from '@mzadat/ui/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { User as SupabaseUser } from '@supabase/supabase-js'

interface NavItem {
  label: string
  href: string
  icon?: React.ReactNode
  children?: NavItem[]
}

interface HeaderProps {
  locale: string
  direction: 'rtl' | 'ltr'
  translations: {
    home: string
    auctions: string
    liveAuctions: string
    groups: string
    shops: string
    blog: string
    contact: string
    login: string
    register: string
    search: string
    appName: string
  }
  logoUrl?: string
  announcement?: {
    enabled?: boolean
    text?: string
    link?: string
    backgroundColor?: string
  }
}

export function Header({ locale, direction, translations: t, logoUrl, announcement }: HeaderProps) {
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [currentTime, setCurrentTime] = useState('')
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>()
  const [walletBalance, setWalletBalance] = useState<number>(0)
  const { scrollY } = useScroll()

  useMotionValueEvent(scrollY, 'change', (latest) => {
    setScrolled(latest > 20)
  })

  // Fetch wallet balance from profile
  async function fetchWalletBalance(userId: string) {
    const supabase = createClient()
    const { data } = await supabase
      .from('profiles')
      .select('wallet_balance')
      .eq('id', userId)
      .single()
    if (data) setWalletBalance(Number(data.wallet_balance || 0))
  }

  // Auth state
  useEffect(() => {
    const supabase = createClient()

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAvatarUrl(session?.user?.user_metadata?.avatar_url)
      if (session?.user) fetchWalletBalance(session.user.id)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setAvatarUrl(session?.user?.user_metadata?.avatar_url)
      if (session?.user) fetchWalletBalance(session.user.id)
      else setWalletBalance(0)
    })

    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    setUserMenuOpen(false)
    setMobileOpen(false)
    router.push('/')
    router.refresh()
  }

  const isAr = locale === 'ar'
  const userFirstName = user?.user_metadata?.first_name || ''
  const userLastName = user?.user_metadata?.last_name || ''
  const userFullName = [userFirstName, userLastName].filter(Boolean).join(' ') || user?.email?.split('@')[0] || ''
  const userInitials = user
    ? `${(userFirstName[0] || user.email?.[0] || '').toUpperCase()}${(userLastName[0] || '').toUpperCase()}`
    : ''

  // Color-code wallet balance: green (>= 500), amber (100-499), red (< 100)
  const walletColor = walletBalance >= 500
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
    : walletBalance >= 100
      ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
      : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'

  // Real-time clock (Oman timezone)
  useEffect(() => {
    function updateClock() {
      const now = new Date()
      const formatter = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-OM' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Muscat',
        hour12: true,
      })
      setCurrentTime(formatter.format(now))
    }
    updateClock()
    const interval = setInterval(updateClock, 30000)
    return () => clearInterval(interval)
  }, [locale])

  const navItems: NavItem[] = [
    { label: t.home, href: '/' },
    // {
    //   label: t.auctions,
    //   href: '/auctions',
    //   icon: <Gavel className="h-4 w-4" />,
    //   children: [
    //     { label: t.liveAuctions, href: '/auctions/live' },
    //     { label: t.groups, href: '/auctions/groups' },
    //   ],
    // },
    { label: t.shops, href: '/shops', icon: <Store className="h-4 w-4" /> },
    // { label: t.blog, href: '/blog', icon: <BookOpen className="h-4 w-4" /> },
    { label: t.contact, href: '/contact', icon: <Phone className="h-4 w-4" /> },
  ]

  return (
    <>
      {/* Announcement Bar */}
      <AnimatePresence>
        {announcement?.enabled && announcement.text && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
            style={{ backgroundColor: announcement.backgroundColor || '#082236' }}
          >
            <div className="mx-auto flex max-w-7xl items-center justify-center px-4 py-2 text-sm text-white">
              {announcement.link ? (
                <Link href={announcement.link} className="hover:underline">
                  {announcement.text}
                </Link>
              ) : (
                <span>{announcement.text}</span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Header */}
      <motion.header
        className={cn(
          'sticky top-0 z-50 w-full transition-all duration-300',
          scrolled
            ? 'border-b border-border/50 bg-white/80 shadow-sm backdrop-blur-xl'
            : 'bg-white',
        )}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4 lg:h-[72px]">
            {/* Logo */}
            <Link href="/" className="flex shrink-0 items-center gap-2">
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt={t.appName}
                  width={200}
                  height={56}
                  className="h-14 w-auto"
                  priority
                />
              ) : (
                <span className="text-2xl font-bold text-primary-900">
                  {t.appName}
                </span>
              )}
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden items-center gap-1 lg:flex">
              {navItems.map((item) => (
                <NavLink key={item.href} item={item} direction={direction} />
              ))}
            </nav>

            {/* Right Section */}
            <div className="flex items-center gap-2">
              {/* Clock */}
              {currentTime && (
                <div className="hidden items-center gap-1.5 text-sm text-muted-foreground lg:flex">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="tabular-nums">{currentTime}</span>
                </div>
              )}

              {/* Separator */}
              <div className="hidden h-5 w-px bg-border lg:block" />

              {/* Language Switch */}
              <LanguageDropdown locale={locale} direction={direction} />

              {/* Notifications (desktop, logged-in only) */}
              {user && (
                <NotificationCenter userId={user.id} locale={locale} direction={direction} />
              )}

              {/* Auth Section */}
              {user ? (
                <div className="hidden items-center gap-2 lg:flex">
                  {/* Wallet Balance Tag */}
                  <Link
                    href="/dashboard/wallet"
                    className={cn(
                      'flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold tabular-nums transition-colors',
                      walletColor,
                    )}
                  >
                    <Wallet className="h-3.5 w-3.5" />
                    {formatOMR(walletBalance)}
                  </Link>

                  {/* Dashboard */}
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/dashboard" className="gap-1.5">
                      <LayoutDashboard className="h-4 w-4" />
                      {isAr ? 'لوحة التحكم' : 'Dashboard'}
                    </Link>
                  </Button>

                  {/* User Avatar Menu */}
                  <div
                    className="relative"
                    onMouseEnter={() => setUserMenuOpen(true)}
                    onMouseLeave={() => setUserMenuOpen(false)}
                  >
                    <button
                      className="flex items-center gap-2 rounded-full py-0.5 pe-2.5 ps-0.5 transition-colors hover:bg-muted"
                      onClick={() => setUserMenuOpen(!userMenuOpen)}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={avatarUrl} alt={userFullName} />
                        <AvatarFallback className="bg-primary-100 text-xs text-primary-700">
                          {userInitials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-foreground">{userFirstName || user?.email?.split('@')[0]}</span>
                      <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', userMenuOpen && 'rotate-180')} />
                    </button>

                    <AnimatePresence>
                      {userMenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.96 }}
                          transition={{ duration: 0.15 }}
                          className={cn(
                            'absolute top-full z-50 mt-2 w-48 overflow-hidden rounded-xl border border-border bg-white p-1 shadow-lg',
                            direction === 'rtl' ? 'left-0' : 'right-0',
                          )}
                        >
                          {/* User info header */}
                          <div className="border-b border-border px-3 py-2.5 mb-1">
                            <p className="text-sm font-semibold text-foreground truncate">{userFullName}</p>
                            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                          </div>
                          <Link
                            href="/dashboard/profile"
                            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            <User className="h-4 w-4" />
                            {isAr ? 'الملف الشخصي' : 'Profile'}
                          </Link>
                          <Link
                            href="/dashboard/bids"
                            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            <Gavel className="h-4 w-4" />
                            {isAr ? 'مزايداتي' : 'My Bids'}
                          </Link>
                          <Link
                            href="/dashboard/won"
                            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            <Trophy className="h-4 w-4" />
                            {isAr ? 'مزاداتي الفائزة' : 'Won Auctions'}
                          </Link>
                          <Link
                            href="/dashboard/deposits"
                            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            <CreditCard className="h-4 w-4" />
                            {isAr ? 'التأمينات' : 'Deposits'}
                          </Link>
                          <div className="my-1 h-px bg-border" />
                          <button
                            onClick={handleSignOut}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
                          >
                            <LogOut className="h-4 w-4" />
                            {isAr ? 'تسجيل الخروج' : 'Sign Out'}
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              ) : (
                <div className="hidden items-center gap-2 lg:flex">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/auth/login" className="gap-1.5">
                      <LogIn className="h-4 w-4" />
                      {t.login}
                    </Link>
                  </Button>
                  <Button size="sm" asChild className="bg-primary-700 hover:bg-primary-800">
                    <Link href="/auth/register">
                      {t.register}
                    </Link>
                  </Button>
                </div>
              )}

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted lg:hidden"
                aria-label="Toggle menu"
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden border-t border-border bg-white lg:hidden"
            >
              <div className="mx-auto max-w-7xl space-y-1 px-4 py-4">
                {navItems.map((item) => (
                  <div key={item.href}>
                    <Link
                      href={item.href}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                      onClick={() => setMobileOpen(false)}
                    >
                      {item.icon}
                      {item.label}
                    </Link>
                    {item.children?.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className="flex items-center gap-3 rounded-lg py-2 ps-10 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        onClick={() => setMobileOpen(false)}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                ))}

                <div className="border-t border-border pt-3">
                  {/* Language + Notifications row (mobile) */}
                  <div className="mb-3 flex items-center gap-2 px-1">
                    <div className="flex-1">
                      <LanguageDropdown locale={locale} direction={direction} fullWidth />
                    </div>
                    {user && (
                      <NotificationCenter userId={user.id} locale={locale} direction={direction} />
                    )}
                  </div>

                  {user ? (
                    <div className="space-y-1">
                      {/* Wallet Balance Tag - mobile */}
                      <Link
                        href="/dashboard/wallet"
                        className={cn(
                          'mx-3 mb-2 flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold tabular-nums transition-colors',
                          walletColor,
                        )}
                        onClick={() => setMobileOpen(false)}
                      >
                        <Wallet className="h-4 w-4" />
                        {formatOMR(walletBalance)}
                      </Link>
                      <Link
                        href="/dashboard"
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                        onClick={() => setMobileOpen(false)}
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        {isAr ? 'لوحة التحكم' : 'Dashboard'}
                      </Link>
                      <Link
                        href="/dashboard/bids"
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                        onClick={() => setMobileOpen(false)}
                      >
                        <Gavel className="h-4 w-4" />
                        {isAr ? 'مزايداتي' : 'My Bids'}
                      </Link>
                      <Link
                        href="/dashboard/profile"
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                        onClick={() => setMobileOpen(false)}
                      >
                        <User className="h-4 w-4" />
                        {isAr ? 'الملف الشخصي' : 'Profile'}
                      </Link>
                      <button
                        onClick={handleSignOut}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                      >
                        <LogOut className="h-4 w-4" />
                        {isAr ? 'تسجيل الخروج' : 'Sign Out'}
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" asChild>
                        <Link href="/auth/login">{t.login}</Link>
                      </Button>
                      <Button size="sm" className="flex-1 bg-primary-700" asChild>
                        <Link href="/auth/register">{t.register}</Link>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>
    </>
  )
}

function NavLink({ item, direction }: { item: NavItem; direction: string }) {
  const [open, setOpen] = useState(false)

  if (!item.children) {
    return (
      <Link
        href={item.href}
        className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
      >
        {item.label}
      </Link>
    )
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
        onClick={() => setOpen(!open)}
      >
        {item.label}
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className={cn(
              'absolute top-full z-50 mt-1 min-w-[200px] overflow-hidden rounded-xl border border-border bg-white p-1 shadow-lg',
              direction === 'rtl' ? 'right-0' : 'left-0',
            )}
          >
            {item.children.map((child) => (
              <Link
                key={child.href}
                href={child.href}
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
                onClick={() => setOpen(false)}
              >
                {child.icon}
                {child.label}
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
// ─── Language Dropdown ────────────────────────────────────────────────────────

const LANGUAGES = [
  { code: 'ar', label: 'العربية', flag: '🇴🇲', short: 'AR' },
  { code: 'en', label: 'English', flag: '🇬🇧', short: 'EN' },
]

function LanguageDropdown({
  locale,
  direction,
  fullWidth,
}: {
  locale: string
  direction: string
  fullWidth?: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = LANGUAGES.find((l) => l.code === locale) ?? LANGUAGES[1]

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className={cn('relative', fullWidth && 'w-full')}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground',
          fullWidth && 'w-full justify-between',
        )}
      >
        <span className="flex items-center gap-1.5">
          <span className="text-base leading-none">{current.flag}</span>
          <span>{current.short}</span>
        </span>
        <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.13 }}
            className={cn(
              'absolute top-full z-50 mt-1.5 w-36 overflow-hidden rounded-xl border border-border bg-white p-1 shadow-lg',
              direction === 'rtl' ? 'left-0' : 'right-0',
              fullWidth && 'right-0 left-0 w-full',
            )}
          >
            {LANGUAGES.map((lang) => (
              <Link
                key={lang.code}
                href={`?lang=${lang.code}`}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted',
                  lang.code === locale ? 'font-semibold text-primary-700 bg-primary-50' : 'text-foreground/80',
                )}
              >
                <span className="text-base leading-none">{lang.flag}</span>
                <span>{lang.label}</span>
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Notification Center ──────────────────────────────────────────────────────

interface NotifRow {
  id: string
  type: string
  title: Record<string, string>
  body: Record<string, string>
  isRead: boolean
  createdAt: string
}

const NOTIF_ICONS: Record<string, React.ReactNode> = {
  outbid: <Gavel className="h-4 w-4 text-amber-500" />,
  auction_won: <Trophy className="h-4 w-4 text-emerald-600" />,
  auction_lost: <Clock className="h-4 w-4 text-gray-500" />,
  auction_start: <Gavel className="h-4 w-4 text-green-500" />,
  auction_end: <Clock className="h-4 w-4 text-gray-500" />,
  auction_extended: <Clock className="h-4 w-4 text-amber-500" />,
  inspection_start: <Info className="h-4 w-4 text-blue-500" />,
  inspection_end: <Info className="h-4 w-4 text-gray-500" />,
  wallet_deposit_approved: <Wallet className="h-4 w-4 text-emerald-500" />,
  wallet_deposit_rejected: <Wallet className="h-4 w-4 text-red-500" />,
  wallet_credited: <Wallet className="h-4 w-4 text-green-500" />,
  wallet_debited: <Wallet className="h-4 w-4 text-orange-500" />,
  deposit_refund: <CreditCard className="h-4 w-4 text-blue-500" />,
  registration_confirmed: <CheckCheck className="h-4 w-4 text-emerald-500" />,
  payment_reminder: <CreditCard className="h-4 w-4 text-amber-500" />,
  reserve_not_met: <Info className="h-4 w-4 text-gray-500" />,
  // Legacy mappings
  winner: <Trophy className="h-4 w-4 text-emerald-600" />,
  deposit: <Wallet className="h-4 w-4 text-blue-500" />,
  system: <Info className="h-4 w-4 text-primary-500" />,
}

function NotificationCenter({
  userId,
  locale,
  direction,
}: {
  userId: string
  locale: string
  direction: string
}) {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotifRow[]>([])
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter((n) => !n.isRead).length

  async function fetchNotifs() {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('notifications')
      .select('id, type, title, body, is_read, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)
    if (data) {
      setNotifications(
        data.map((n: {id:string;type:string;title:Record<string,string>;body:Record<string,string>;is_read:boolean;created_at:string}) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          body: n.body,
          isRead: n.is_read,
          createdAt: n.created_at,
        }))
      )
    }
    setLoading(false)
  }

  async function markAllRead() {
    const supabase = createClient()
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
  }

  async function markOneRead(id: string) {
    const supabase = createClient()
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    )
  }

  // Fetch on mount + real-time subscription
  useEffect(() => {
    fetchNotifs()
    const supabase = createClient()
    const channel = supabase
      .channel('notifs-' + userId)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => fetchNotifs()
      )
      .subscribe()

    // Also refresh when a foreground FCM message arrives
    const onFcm = () => fetchNotifs()
    window.addEventListener('fcm-notification', onFcm)

    const onOpenBell = () => setOpen(true)
    window.addEventListener('open-notification-bell', onOpenBell)

    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener('fcm-notification', onFcm)
      window.removeEventListener('open-notification-bell', onOpenBell)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const isAr = locale === 'ar'

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return isAr ? 'الآن' : 'just now'
    if (mins < 60) return isAr ? `منذ ${mins}د` : `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return isAr ? `منذ ${hrs}س` : `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    return isAr ? `منذ ${days}ي` : `${days}d ago`
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label={isAr ? 'الإشعارات' : 'Notifications'}
      >
        <Bell className="h-4.5 w-4.5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className={cn(
              'absolute top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-white shadow-xl',
              direction === 'rtl' ? 'left-0' : 'right-0',
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="text-sm font-semibold text-foreground">
                {isAr ? 'الإشعارات' : 'Notifications'}
                {unreadCount > 0 && (
                  <span className="ms-2 rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-bold text-red-600">
                    {unreadCount}
                  </span>
                )}
              </h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 transition-colors"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  {isAr ? 'قراءة الكل' : 'Mark all read'}
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-border">
              {loading ? (
                <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                  {isAr ? 'جاري التحميل...' : 'Loading...'}
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                  <Bell className="h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">
                    {isAr ? 'لا توجد إشعارات' : 'No notifications yet'}
                  </p>
                </div>
              ) : (
                notifications.map((n) => {
                  const title = (n.title as Record<string, string>)[locale] ?? (n.title as Record<string, string>)['en'] ?? ''
                  const body = (n.body as Record<string, string>)[locale] ?? (n.body as Record<string, string>)['en'] ?? ''
                  return (
                    <button
                      key={n.id}
                      onClick={() => markOneRead(n.id)}
                      className={cn(
                        'flex w-full items-start gap-3 px-4 py-3 text-start transition-colors hover:bg-muted',
                        !n.isRead && 'bg-primary-50/40',
                      )}
                    >
                      <span className="mt-0.5 shrink-0 rounded-full bg-white p-1.5 shadow-sm ring-1 ring-border">
                        {NOTIF_ICONS[n.type] ?? <Bell className="h-4 w-4 text-muted-foreground" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-foreground">{title}</span>
                        <span className="block line-clamp-2 text-xs text-muted-foreground">{body}</span>
                        <span className="mt-1 block text-xs text-muted-foreground/60">{timeAgo(n.createdAt)}</span>
                      </span>
                      {!n.isRead && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary-500" />
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}