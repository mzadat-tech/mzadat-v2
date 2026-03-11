import type { Metadata } from 'next'
import { AuctionsPageClient } from './auctions-client'
import { getLiveAuctions, getUpcomingAuctions } from '@/lib/data'
import { getCategories } from '@/lib/cms'
import { DEFAULT_LOCALE, getDirection } from '@/lib/i18n'

const locale = DEFAULT_LOCALE
const direction = getDirection(locale)

export const metadata: Metadata = {
  title: locale === 'ar' ? 'المزادات' : 'Auctions',
  description:
    locale === 'ar'
      ? 'تصفح جميع المزادات المتاحة والمباشرة على منصة مزادات'
      : 'Browse all available and live auctions on Mzadat platform',
}

export default async function AuctionsPage() {
  const [liveAuctions, upcomingAuctions, categories] = await Promise.all([
    getLiveAuctions(locale, 20).catch(() => []),
    getUpcomingAuctions(locale, 12).catch(() => []),
    getCategories(locale).catch(() => []),
  ])

  return (
    <AuctionsPageClient
      liveAuctions={liveAuctions}
      upcomingAuctions={upcomingAuctions}
      categories={categories}
      locale={locale}
      direction={direction}
    />
  )
}
