import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getProductBySlug } from '@/lib/data'
import { DEFAULT_LOCALE, getDirection } from '@/lib/i18n'
import { LotPageClient } from './lot-page-client'
import { createClient } from '@/lib/supabase/server'

// Always fetch fresh data — this page shows live bid prices and recent bids.
export const dynamic = 'force-dynamic'

const locale = DEFAULT_LOCALE
const direction = getDirection(locale)

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const product = await getProductBySlug(slug, locale).catch(() => null)

  if (!product) return { title: 'Not Found' }

  return {
    title: `${product.seoTitle || product.name} | Mzadat`,
    description: product.seoDescription || product.description,
    openGraph: {
      title: product.seoTitle || product.name,
      description: product.seoDescription || product.description,
      images: product.images[0] ? [{ url: product.images[0] }] : [],
    },
  }
}

export default async function LotPage({ params }: Props) {
  const { slug } = await params
  const product = await getProductBySlug(slug, locale).catch(() => null)

  if (!product) notFound()

  // Get current user session for bid history masking
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const currentUserId = session?.user?.id || null

  // Check user role for admin visibility
  let isAdmin = false
  if (currentUserId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentUserId)
      .single()
    isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'
  }

  return (
    <LotPageClient
      product={product}
      locale={locale}
      direction={direction}
      currentUserId={currentUserId}
      isAdmin={isAdmin}
    />
  )
}
