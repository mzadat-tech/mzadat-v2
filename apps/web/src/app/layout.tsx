import type { Metadata } from 'next'
import { Inter, IBM_Plex_Sans_Arabic } from 'next/font/google'
import { Providers } from '@/components/providers'
import { GoogleOneTap } from '@/components/auth/google-one-tap'
import { RefreshOnFocus } from '@/components/refresh-on-focus'
import './globals.css'

export const dynamic = 'force-dynamic'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-arabic',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Mzadat — Online Auction Platform',
    template: '%s | Mzadat',
  },
  description: 'Mzadat — The leading online auction and bidding marketplace in the Sultanate of Oman',
  keywords: ['auction', 'bidding', 'Oman', 'mzadat', 'online auction', 'مزادات', 'عمان'],
  metadataBase: new URL(process.env.NEXT_PUBLIC_WEB_URL ?? 'https://mzadat.om'),
  openGraph: {
    type: 'website',
    locale: 'ar_OM',
    alternateLocale: 'en_US',
    siteName: 'Mzadat',
  },
  twitter: {
    card: 'summary_large_image',
  },
  robots: {
    index: true,
    follow: true,
  },
}

// Default locale — can be extended with middleware-based i18n later
import { FirebaseAnalytics } from '@/components/firebase-analytics'
import { FcmPush } from '@/components/fcm-push'
import { DEFAULT_LOCALE, getDirection } from '@/lib/i18n'
const locale = DEFAULT_LOCALE
const direction = getDirection(locale)

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={locale} dir={direction} suppressHydrationWarning>
      <body
        className={`${inter.variable} ${ibmPlexArabic.variable} min-h-screen bg-background font-sans antialiased`}
      >
        <Providers locale={locale} direction={direction}>
          {children}
        </Providers>
        <GoogleOneTap />
        <RefreshOnFocus />
        <FirebaseAnalytics />
        <FcmPush />
      </body>
    </html>
  )
}
