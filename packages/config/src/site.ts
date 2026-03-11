// ═══════════════════════════════════════════
// Mzadat Platform — Static Site Configuration
// ═══════════════════════════════════════════
// Replaces Payload CMS globals (SiteSettings, Header, Footer)
// Edit this file to update site-wide settings, header, and footer.
// For dynamic content (blogs, widgets, menus), use the API.

export const siteConfig = {
  siteName: 'Mzadat',
  siteNameAr: 'مزادات',
  siteDescription:
    `Oman's leading online auction platform for vehicles, equipment, and more.`,
    siteDescriptionAr:
    'منصة المزادات الإلكترونية الرائدة في سلطنة عمان للمركبات والمعدات والمزيد.',
  logo: '/logo/logo-dark.png',
  logoDark: '/logo/logo-light.png',
  favicon: '/favicon.ico',

  contact: {
    email: 'info@mzadat.om',
    phone: '+968 2400 0000',
    whatsapp: '+96824000000',
    address: 'Muscat, Sultanate of Oman',
    mapEmbedUrl: '',
  },

  socialLinks: {
    facebook: 'https://facebook.com/mzadat',
    twitter: 'https://twitter.com/mzadat',
    instagram: 'https://instagram.com/mzadat',
    linkedin: '',
    youtube: '',
    tiktok: '',
  },

  platform: {
    defaultCurrency: 'OMR',
    timezone: 'Asia/Muscat',
    maintenanceMode: false,
  },

  seo: {
    metaTitle: 'Mzadat — Online Auction Platform',
    metaDescription:
      `Oman's leading online auction platform for vehicles, equipment, and more.`,
    metaDescriptionAr:
      'منصة المزادات الإلكترونية الرائدة في سلطنة عمان للمركبات والمعدات والمزيد.',
    ogImage: '/images/og-image.png',
    googleAnalyticsId: '',
  },
} as const

export const headerConfig = {
  announcementBar: {
    enabled: false,
    text: '',
    textAr: '',
    link: '',
    backgroundColor: '#1e40af',
  },
  ctaButton: {
    enabled: true,
    label: 'Register',
    labelAr: 'تسجيل',
    url: '/register',
  },
} as const

export const footerConfig = {
  description:
    `Oman's leading online auction platform. Discover vehicles, equipment, and more at competitive prices.`,
  descriptionAr:
    'منصة المزادات الإلكترونية الرائدة في سلطنة عمان. اكتشف المركبات والمعدات والمزيد بأسعار تنافسية.',
  copyright: `© ${new Date().getFullYear()} Mzadat. All rights reserved.`,
  copyrightAr: `© ${new Date().getFullYear()} مزادات. جميع الحقوق محفوظة.`,
  bottomLinks: [
    { label: 'Terms & Conditions', labelAr: 'الشروط والأحكام', url: '/terms' },
    { label: 'Privacy Policy', labelAr: 'سياسة الخصوصية', url: '/privacy' },
  ],
  appDownload: {
    appStoreUrl: '',
    playStoreUrl: '',
  },
} as const

// ─── Type exports ───
export type SiteConfig = typeof siteConfig
export type HeaderConfig = typeof headerConfig
export type FooterConfig = typeof footerConfig
