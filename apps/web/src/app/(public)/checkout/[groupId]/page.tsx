import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { DEFAULT_LOCALE, getDirection } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/server'
import { CheckoutClient } from './checkout-client'

const locale = DEFAULT_LOCALE
const direction = getDirection(locale)

interface Props {
  params: Promise<{ groupId: string }>
}

export const metadata: Metadata = {
  title: locale === 'ar' ? 'تسجيل في المزاد | مزادات' : 'Auction Registration | Mzadat',
}

export default async function CheckoutPage({ params }: Props) {
  const { groupId } = await params

  // Require authentication
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user) {
    redirect(`/auth/login?redirect=/checkout/${encodeURIComponent(groupId)}`)
  }

  return (
    <CheckoutClient
      groupId={groupId}
      locale={locale}
      direction={direction}
    />
  )
}
