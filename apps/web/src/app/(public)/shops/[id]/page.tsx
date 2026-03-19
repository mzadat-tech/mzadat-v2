import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Store, MapPin, Mail, Phone, Calendar, Gavel, ArrowRight, ArrowLeft, Clock } from 'lucide-react'
import { Card, CardContent } from '@mzadat/ui/components/card'
import { Badge } from '@mzadat/ui/components/badge'
import { Button } from '@mzadat/ui'
import { AnimatedSection, StaggerGrid, StaggerItem } from '@/lib/motion'

const API_BASE = process.env.API_URL || 'http://localhost:8080/api'

interface ApiStoreDetail {
  id: string
  slug: string
  name: string
  description: string
  logoUrl: string | null
  bannerUrl: string | null
  location: string
  status: string
  isFeatured: boolean
  createdAt: string
  productCount: number
  products: Array<{
    id: string
    slug: string
    name: string
    featureImage: string | null
    currentBid: string
    price: string
    bidCount: number
    startDate: string | null
    endDate: string | null
    status: string
    createdAt: string
  }>
}

async function getStore(id: string, locale = 'ar'): Promise<ApiStoreDetail | null> {
  try {
    const res = await fetch(`${API_BASE}/stores/${id}?locale=${locale}`, {
      cache: 'no-store',
    })
    if (!res.ok) return null
    const json = await res.json()
    return json.data
  } catch {
    return null
  }
}

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const store = await getStore(id)
  if (!store) return { title: 'Not Found' }
  return { title: `${store.name} | مزادات` }
}

export default async function ShopDetailPage({ params }: Props) {
  const { id } = await params
  const isAr = false

  const store = await getStore(id)

  if (!store) notFound()

  return (
    <div className="min-h-screen">
      {/* Store Header */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-900 to-primary-700 py-16">
        <div className="container mx-auto px-4">
          <AnimatedSection>
            {/* Breadcrumb */}
            <div className="mb-8 flex items-center gap-2 text-sm text-white/60">
              <Link href="/" className="hover:text-white">{isAr ? 'الرئيسية' : 'Home'}</Link>
              <span>/</span>
              <Link href="/shops" className="hover:text-white">{isAr ? 'المتاجر' : 'Shops'}</Link>
              <span>/</span>
              <span className="text-white">{store.name}</span>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-white/20 bg-white shadow-xl">
                {store.logoUrl ? (
                  <Image
                    src={store.logoUrl}
                    alt={store.name}
                    width={56}
                    height={56}
                    className="rounded-xl object-contain"
                  />
                ) : (
                  <Store className="h-10 w-10 text-primary-600" />
                )}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">{store.name}</h1>
                {store.location && (
                  <p className="mt-1 flex items-center gap-1.5 text-white/80">
                    <MapPin className="h-4 w-4" />
                    {store.location}
                  </p>
                )}
                <div className="mt-2 flex items-center gap-3 text-sm text-white/60">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {isAr ? 'عضو منذ' : 'Member since'}{' '}
                    {new Date(store.createdAt).toLocaleDateString(isAr ? 'ar-OM' : 'en-US', {
                      year: 'numeric',
                      month: 'long',
                    })}
                  </span>
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Store Products */}
      <section className="container mx-auto px-4 py-12">
        <AnimatedSection className="mb-8">
          <h2 className="text-2xl font-bold text-foreground">
            {isAr ? 'المنتجات المعروضة' : 'Listed Products'}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {store.products.length} {isAr ? 'منتج' : 'products'}
          </p>
        </AnimatedSection>

        {store.products.length === 0 ? (
          <AnimatedSection className="py-16 text-center">
            <Gavel className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <h3 className="font-semibold">{isAr ? 'لا توجد منتجات حالياً' : 'No products yet'}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {isAr ? 'سيتم إضافة منتجات قريباً' : 'Products will be added soon'}
            </p>
          </AnimatedSection>
        ) : (
          <StaggerGrid className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {store.products.map((product) => (
              <StaggerItem key={product.id}>
                <Link href={`/auctions/${product.slug}`}>
                  <Card className="group overflow-hidden transition-all hover:shadow-lg">
                    <div className="flex h-48 items-center justify-center bg-muted">
                      {product.featureImage ? (
                        <Image
                          src={product.featureImage}
                          alt={product.name}
                          width={400}
                          height={192}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Gavel className="h-8 w-8 text-muted-foreground/30" />
                      )}
                    </div>
                    <CardContent className="p-4">
                      <h3 className="line-clamp-2 font-semibold text-foreground transition-colors group-hover:text-primary-600">
                        {product.name}
                      </h3>
                      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(product.createdAt).toLocaleDateString(isAr ? 'ar-OM' : 'en-US')}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </StaggerItem>
            ))}
          </StaggerGrid>
        )}

        {/* Back */}
        <AnimatedSection className="mt-12">
          <Link href="/shops">
            <Button variant="outline" className="gap-2">
              {isAr ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
              {isAr ? 'العودة إلى المتاجر' : 'Back to Shops'}
            </Button>
          </Link>
        </AnimatedSection>
      </section>
    </div>
  )
}
