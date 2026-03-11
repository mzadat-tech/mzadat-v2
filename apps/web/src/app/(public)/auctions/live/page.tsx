import type { Metadata } from 'next'
import { getLiveAuctions } from '@/lib/data'
import { getCategories } from '@/lib/cms'
import { AuctionsPageClient } from '../auctions-client'
import { DEFAULT_LOCALE, getDirection } from '@/lib/i18n'

const locale = DEFAULT_LOCALE
const direction = getDirection(locale)

export const metadata: Metadata = {
  title: locale === 'ar' ? 'المزادات المباشرة' : 'Live Auctions',
}

export default async function LiveAuctionsPage() {
  const [liveAuctions, categories] = await Promise.all([
    getLiveAuctions(locale, 50).catch(() => []),
    getCategories(locale).catch(() => []),
  ])

  return (
    <AuctionsPageClient
      liveAuctions={liveAuctions}
      upcomingAuctions={[]}
      categories={categories}
      locale={locale}
      direction={direction}
    />
  )
}
