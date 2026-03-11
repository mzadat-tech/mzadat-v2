import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { getSiteSettings, getHeader, getFooter } from '@/lib/cms'
import { DEFAULT_LOCALE, getDirection } from '@/lib/i18n'

const locale = DEFAULT_LOCALE
const direction = getDirection(locale)

const translations = {
  ar: {
    home: 'الرئيسية',
    auctions: 'المزادات',
    liveAuctions: 'المزادات المباشرة',
    groups: 'المجموعات',
    shops: 'المتاجر',
    blog: 'المدونة',
    contact: 'اتصل بنا',
    login: 'تسجيل الدخول',
    register: 'تسجيل',
    search: 'بحث...',
    appName: 'مزادات',
  },
  en: {
    home: 'Home',
    auctions: 'Auctions',
    liveAuctions: 'Live Auctions',
    groups: 'Groups',
    shops: 'Shops',
    blog: 'Blog',
    contact: 'Contact',
    login: 'Sign In',
    register: 'Register',
    search: 'Search...',
    appName: 'Mzadat',
  },
}

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  // Static config — no async calls, no Payload latency
  const settings = getSiteSettings()
  const header = getHeader()
  const footer = getFooter()

  const t = translations[locale]
  const logoUrl = settings.logo || undefined
  const logoDarkUrl = settings.logoDark || undefined

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        locale={locale}
        direction={direction}
        translations={t}
        logoUrl={logoUrl}
        announcement={header.announcementBar}
      />
      <main className="flex-1">{children}</main>
      <Footer
        locale={locale}
        direction={direction}
        translations={t}
        settings={settings}
        footer={footer}
        logoUrl={logoDarkUrl}
      />
    </div>
  )
}
