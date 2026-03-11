import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merge Tailwind CSS classes with clsx */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number as OMR currency
 * Shows decimals only when the amount has a fractional part.
 * @example formatOMR(1000) → "1,000 OMR"
 * @example formatOMR(1234.5) → "1,234.500 OMR"
 */
export function formatOMR(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  const hasDecimals = num % 1 !== 0
  return `${num.toLocaleString('en-US', {
    minimumFractionDigits: hasDecimals ? 3 : 0,
    maximumFractionDigits: hasDecimals ? 3 : 0,
  })} OMR`
}

/**
 * Get bilingual value from a JSONB field
 * @example getLocalizedValue({en: "Hello", ar: "مرحبا"}, "ar") → "مرحبا"
 */
export function getLocalizedValue(
  data: Record<string, string> | null | undefined,
  locale: 'en' | 'ar' = 'en',
): string {
  if (!data) return ''
  return data[locale] ?? data['en'] ?? ''
}
