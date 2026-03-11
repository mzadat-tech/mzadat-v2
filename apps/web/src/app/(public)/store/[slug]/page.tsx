import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getStoreBySlug } from '@/lib/data'
import { DEFAULT_LOCALE, getDirection } from '@/lib/i18n'
import { StorePageClient } from './store-client'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ tab?: string; group?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const store = await getStoreBySlug(slug, DEFAULT_LOCALE)
  if (!store) return { title: 'Not Found' }
  return {
    title: `${store.name} | Mzadat`,
    description: store.description || `Browse auctions from ${store.name}`,
    openGraph: {
      title: `${store.name} — Mzadat`,
      description: store.description || `Browse auctions from ${store.name}`,
      images: store.bannerUrl ? [{ url: store.bannerUrl }] : [],
    },
  }
}

export default async function StorePage({ params, searchParams }: Props) {
  const { slug } = await params
  const sp = await searchParams

  const locale = DEFAULT_LOCALE
  const direction = getDirection(locale)
  const tab = (sp.tab === 'past' ? 'past' : 'live') as 'live' | 'past'
  const groupId = sp.group || undefined

  const store = await getStoreBySlug(slug, locale, tab, groupId)

  if (!store) notFound()

  return (
    <StorePageClient
      store={store}
      locale={locale}
      direction={direction}
      initialTab={tab}
      initialGroupId={groupId}
    />
  )
}
