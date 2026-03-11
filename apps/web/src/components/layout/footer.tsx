import Link from 'next/link'
import Image from 'next/image'
import {
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react'
import type { SiteConfig, FooterConfig } from '@mzadat/config'

interface FooterProps {
  locale: string
  direction: 'rtl' | 'ltr'
  translations: {
    appName: string
    home: string
    auctions: string
    liveAuctions: string
    shops: string
    blog: string
    contact: string
  }
  settings?: SiteConfig | null
  footer?: FooterConfig | null
  logoUrl?: string
}

export function Footer({
  locale,
  direction,
  translations: t,
  settings,
  footer,
  logoUrl,
}: FooterProps) {
  const currentYear = new Date().getFullYear()

  const quickLinks = [
    { label: t.home, href: '/' },
    { label: t.auctions, href: '/auctions' },
    { label: t.liveAuctions, href: '/auctions/live' },
    { label: t.shops, href: '/shops' },
    { label: t.blog, href: '/blog' },
    { label: t.contact, href: '/contact' },
  ]

  const socialLinks = [
    { icon: Facebook, href: settings?.socialLinks?.facebook, label: 'Facebook' },
    { icon: Twitter, href: settings?.socialLinks?.twitter, label: 'Twitter' },
    { icon: Instagram, href: settings?.socialLinks?.instagram, label: 'Instagram' },
    { icon: Linkedin, href: settings?.socialLinks?.linkedin, label: 'LinkedIn' },
    { icon: Youtube, href: settings?.socialLinks?.youtube, label: 'YouTube' },
  ].filter((s) => s.href)

  return (
    <footer className="border-t border-border bg-primary-900 text-white">
      {/* Main Footer */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand Column */}
          <div className="space-y-4 lg:col-span-1">
            <Link href="/" className="inline-block">
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt={t.appName}
                  width={280}
                  height={80}
                  className="h-20 w-auto"
                />
              ) : (
                <span className="text-2xl font-bold">{t.appName}</span>
              )}
            </Link>
            {(footer?.description || settings?.siteDescription) && (
              <p className="text-sm leading-relaxed text-white/70">
                {locale === 'ar'
                  ? (footer?.descriptionAr || settings?.siteDescriptionAr)
                  : (footer?.description || settings?.siteDescription)}
              </p>
            )}

            {/* Social Links */}
            {socialLinks.length > 0 && (
              <div className="flex gap-2 pt-2">
                {socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href={social.href!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
                    aria-label={social.label}
                  >
                    <social.icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/50">
              {locale === 'ar' ? 'روابط سريعة' : 'Quick Links'}
            </h4>
            <ul className="space-y-2.5">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/70 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Bottom Links as a column */}
          {footer?.bottomLinks && footer.bottomLinks.length > 0 && (
            <div>
              <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/50">
                {locale === 'ar' ? 'صفحات' : 'Pages'}
              </h4>
              <ul className="space-y-2.5">
                {footer.bottomLinks.map((link, j) => (
                  <li key={j}>
                    <Link
                      href={link.url}
                      className="text-sm text-white/70 transition-colors hover:text-white"
                    >
                      {locale === 'ar' ? link.labelAr : link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Contact Info */}
          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/50">
              {locale === 'ar' ? 'تواصل معنا' : 'Contact Us'}
            </h4>
            <ul className="space-y-3">
              {settings?.contact?.phone && (
                <li className="flex items-center gap-2.5 text-sm text-white/70">
                  <Phone className="h-4 w-4 shrink-0 text-primary-400" />
                  <a
                    href={`tel:${settings.contact.phone}`}
                    className="transition-colors hover:text-white"
                    dir="ltr"
                  >
                    {settings.contact.phone}
                  </a>
                </li>
              )}
              {settings?.contact?.email && (
                <li className="flex items-center gap-2.5 text-sm text-white/70">
                  <Mail className="h-4 w-4 shrink-0 text-primary-400" />
                  <a
                    href={`mailto:${settings.contact.email}`}
                    className="transition-colors hover:text-white"
                  >
                    {settings.contact.email}
                  </a>
                </li>
              )}
              {settings?.contact?.address && (
                <li className="flex items-start gap-2.5 text-sm text-white/70">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-400" />
                  <span>{settings.contact.address}</span>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-4 sm:flex-row sm:px-6 lg:px-8">
          <p className="text-xs text-white/50">
            {locale === 'ar'
              ? (footer?.copyrightAr || `جميع الحقوق محفوظة © ${t.appName} ${currentYear}`)
              : (footer?.copyright || `© ${currentYear} ${t.appName}. All rights reserved.`)}
          </p>
          {footer?.bottomLinks && (
            <div className="flex gap-4">
              {footer.bottomLinks.map((link, i) => (
                <Link
                  key={i}
                  href={link.url}
                  className="text-xs text-white/50 transition-colors hover:text-white/80"
                >
                  {locale === 'ar' ? link.labelAr : link.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </footer>
  )
}
