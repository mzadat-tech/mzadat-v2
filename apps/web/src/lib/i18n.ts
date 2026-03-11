import arTranslations from '@/i18n/ar.json'
import enTranslations from '@/i18n/en.json'

export type Locale = 'ar' | 'en'
export const DEFAULT_LOCALE: Locale = 'en'
export const LOCALES: Locale[] = ['en', 'ar']

const translations = {
  ar: arTranslations.ar,
  en: enTranslations.en,
}

type TranslationKeys = typeof translations.en

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split('.')
  let current: unknown = obj
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = (current as Record<string, unknown>)[key]
    } else {
      return path
    }
  }
  return typeof current === 'string' ? current : path
}

export function getTranslations(locale: Locale) {
  const t = translations[locale] || translations[DEFAULT_LOCALE]

  return function translate(key: string): string {
    return getNestedValue(t as unknown as Record<string, unknown>, key)
  }
}

export function getDirection(locale: Locale): 'rtl' | 'ltr' {
  return locale === 'ar' ? 'rtl' : 'ltr'
}

export function getLocalizedValue<T extends { en?: string; ar?: string }>(
  data: T | null | undefined,
  locale: Locale,
): string {
  if (!data) return ''
  return (locale === 'ar' ? data.ar : data.en) || data.en || data.ar || ''
}
