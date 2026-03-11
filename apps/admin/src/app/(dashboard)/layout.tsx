import type { Metadata } from 'next'
import { Inter, IBM_Plex_Sans_Arabic } from 'next/font/google'
import '../globals.css'
import { requireAdmin } from '@/lib/auth'
import { AppShell } from '@/components/layout/app-shell'

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
  title: 'Mzadat Admin',
  description: 'Mzadat Administration Panel',
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin()

  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${ibmPlexArabic.variable} min-h-screen bg-background font-sans antialiased`}
      >
        <AppShell
          user={{
            fullName: admin.fullName,
            role: admin.role,
          }}
        >
          {children}
        </AppShell>
      </body>
    </html>
  )
}
