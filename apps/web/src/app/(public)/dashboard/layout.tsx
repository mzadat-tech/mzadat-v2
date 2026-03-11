import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardSidebar, DashboardMobileNav } from '@/components/dashboard/dashboard-sidebar'
import { DEFAULT_LOCALE, getDirection } from '@/lib/i18n'

const locale = DEFAULT_LOCALE
const direction = getDirection(locale)

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user) {
    redirect('/auth/login')
  }

  const user = session.user

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name_en, first_name_ar, last_name_en, last_name_ar, avatar_url, role, wallet_balance')
    .eq('id', user.id)
    .single()

  const dashboardUser = {
    id: user.id,
    email: user.email || '',
    firstName: profile?.first_name_en || profile?.first_name_ar || '',
    lastName: profile?.last_name_en || profile?.last_name_ar || '',
    avatarUrl: profile?.avatar_url || undefined,
    role: profile?.role || 'customer',
    walletBalance: Number(profile?.wallet_balance || 0),
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-theme(spacing.16)-theme(spacing.16))] max-h-[calc(100vh-theme(spacing.16)-theme(spacing.16))] max-w-7xl flex-col overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
      <DashboardMobileNav locale={locale} />
      <div className="flex flex-1 gap-8">
        <DashboardSidebar
          user={dashboardUser}
          locale={locale}
          direction={direction}
        />
        <div className="min-w-0 flex-1">
          {children}
        </div>
      </div>
    </div>
  )
}
