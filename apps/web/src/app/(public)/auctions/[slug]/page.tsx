import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getProductBySlug } from '@/lib/data'
import { AuctionDetailClient } from './auction-detail-client'
import { DEFAULT_LOCALE, getDirection } from '@/lib/i18n'

const locale = DEFAULT_LOCALE
const direction = getDirection(locale)

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const product = await getProductBySlug(slug, locale).catch(() => null)

  if (!product) {
    return { title: 'Not Found' }
  }

  return {
    title: product.seoTitle || product.name,
    description: product.seoDescription || product.description,
  }
}

export default async function AuctionDetailPage({ params }: Props) {
  const { slug } = await params
  const product = await getProductBySlug(slug, locale).catch(() => null)

  if (!product) {
    notFound()
  }

  return (
    <AuctionDetailClient
      product={product}
      locale={locale}
      direction={direction}
    />
  )
}
