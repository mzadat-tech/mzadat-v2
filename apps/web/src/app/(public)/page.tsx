import { HeroBanner } from '@/components/home/hero-banner'
import { BrowseAuctions } from '@/components/home/browse-auctions'
import { LiveLotsSection } from '@/components/home/live-lots-section'
import { FeaturedMerchants } from '@/components/home/featured-merchants'
import { AboutMzadat } from '@/components/home/about-mzadat'
import { HowItWorks } from '@/components/home/how-it-works'
import { AuctionCategories } from '@/components/home/auction-categories'
import { FAQSection } from '@/components/home/faq-section'
import { ContactCTA } from '@/components/home/contact-cta'
import {
  getLiveAuctions,
  getUpcomingAuctions,
  getAuctionGroups,
  getDirectSaleProducts,
  getFeaturedStores,
  getStats,
} from '@/lib/data'
import { DEFAULT_LOCALE, getDirection } from '@/lib/i18n'

const locale = DEFAULT_LOCALE
const direction = getDirection(locale)

export default async function HomePage() {
  // Fetch all homepage data in parallel
  const [
    allGroups,
    liveAuctions,
    upcomingAuctions,
    directSaleProducts,
    merchants,
    stats,
  ] = await Promise.all([
    getAuctionGroups(locale).catch(() => []),
    getLiveAuctions(locale, 8).catch(() => []),
    getUpcomingAuctions(locale, 8).catch(() => []),
    getDirectSaleProducts(locale, 8).catch(() => []),
    getFeaturedStores(locale, 12).catch(() => []),
    getStats().catch(() => ({ totalAuctions: 0, totalBids: 0, totalUsers: 0 })),
  ])

  // Split groups by status for browse tabs
  const liveGroups = allGroups.filter(
    (g) => g.status === 'active' || g.status === 'upcoming'
  )
  const completedGroups = allGroups.filter((g) => g.status === 'closed')

  // Combine live + upcoming lots for the lots section
  const allLots = [...liveAuctions, ...upcomingAuctions].slice(0, 8)

  return (
    <>
      {/* 1. Hero Banner */}
      <HeroBanner locale={locale} direction={direction} />

      {/* 2. Browse Auctions — tabbed section with pills */}
      <BrowseAuctions
        liveGroups={liveGroups}
        directSaleProducts={directSaleProducts}
        completedGroups={completedGroups}
        locale={locale}
        direction={direction}
      />

      {/* 3. Live Auction Lots — 4×2 grid */}
      <LiveLotsSection
        lots={allLots}
        locale={locale}
        direction={direction}
      />

      {/* 4. Featured Merchants — carousel */}
      <FeaturedMerchants merchants={merchants} locale={locale} direction={direction} />

      {/* 5. About Mzadat + Stats */}
      <AboutMzadat locale={locale} stats={stats} />

      {/* 6. How It Works — step-by-step guide (light bg) */}
      <HowItWorks locale={locale} />

      {/* 7. Auction Categories — SEO-rich category grid */}
      <AuctionCategories locale={locale} />

      {/* 8. FAQs — with JSON-LD structured data */}
      <FAQSection locale={locale} />

      {/* 9. Contact CTA — contact methods + call-to-action */}
      <ContactCTA locale={locale} direction={direction} />
    </>
  )
}
