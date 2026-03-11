// ═══════════════════════════════════════════
// Mzadat Platform — App-wide Constants
// ═══════════════════════════════════════════

export const APP_NAME = 'Mzadat'
export const APP_DOMAIN = 'mzadat.om'
export const APP_TIMEZONE = 'Asia/Muscat'
export const DEFAULT_LOCALE = 'ar' as const
export const LOCALES = ['en', 'ar'] as const
export type Locale = (typeof LOCALES)[number]

// Currency
export const CURRENCY_CODE = 'OMR'
export const CURRENCY_DECIMALS = 3
export const CURRENCY_SYMBOL = 'OMR'

// Custom ID prefixes
export const ID_PREFIX = {
  CUSTOMER: 'C',
  MERCHANT: 'MC',
  ADMIN: 'A',
  ORDER: 'MZD',
  TICKET: 'TKT',
} as const

// Anti-snipe defaults
export const SNIPE_EXTENSION_SECONDS = 120 // 2 minutes
export const MAX_SNIPE_EXTENSION_MINUTES = 30

// Bid increments
export const DEFAULT_BID_INCREMENT = 1.0

// Deposit
export const DEFAULT_DEPOSIT_TYPE = 'fixed' as const

// Commission
export const DEFAULT_COMMISSION_RATE = 5.0 // 5%
export const DEFAULT_VAT_RATE = 5.0 // 5% Oman VAT

// Pagination
export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100

// Winner payment
export const WINNER_PAYMENT_DAYS = 3 // Business days to pay

// File upload limits
export const MAX_IMAGE_SIZE_MB = 10
export const MAX_DOCUMENT_SIZE_MB = 25
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const
export const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const

// Storage buckets
export const STORAGE_BUCKETS = {
  AVATARS: 'avatars',
  PRODUCTS: 'products',
  STORES: 'stores',
  GROUPS: 'groups',
  CATEGORIES: 'categories',
  BLOGS: 'blogs',
  WATERMARKS: 'watermarks',
  DOCUMENTS: 'documents',
  INVOICES: 'invoices',
  MEDIA: 'media',
} as const
