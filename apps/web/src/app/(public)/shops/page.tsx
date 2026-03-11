import Link from 'next/link'
import Image from 'next/image'
import { Store, MapPin, Star, ShoppingBag, Search, Gavel } from 'lucide-react'
import { Card, CardContent } from '@mzadat/ui/components/card'
import { Badge } from '@mzadat/ui/components/badge'
import { AnimatedSection, StaggerGrid, StaggerItem } from '@/lib/motion'
import { getFeaturedStores } from '@/lib/data'

export const metadata = {
  title: 'المتاجر | مزادات',
  description: 'تصفح المتاجر المعتمدة على منصة مزادات',
}

export default async function ShopsPage() {
  const isAr = false
  const stores = await getFeaturedStores().catch(() => [])

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 py-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.1),transparent_50%)]" />
        <div className="container mx-auto px-4 text-center">
          <AnimatedSection>
            <Badge className="mb-4 border-white/20 bg-white/10 text-white">
              <Store className="me-1.5 h-3 w-3" />
              {isAr ? 'المتاجر المعتمدة' : 'Verified Shops'}
            </Badge>
            <h1 className="text-4xl font-bold text-white md:text-5xl">
              {isAr ? 'المتاجر' : 'Shops'}
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
              {isAr
                ? 'تصفح المتاجر المعتمدة واكتشف مزاداتهم الحصرية'
                : 'Browse verified shops and discover their exclusive auctions'}
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Shops Grid */}
      <section className="container mx-auto px-4 py-16">
        {stores.length === 0 ? (
          <AnimatedSection className="py-20 text-center">
            <Store className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
            <h2 className="text-xl font-semibold text-foreground">
              {isAr ? 'قريباً' : 'Coming Soon'}
            </h2>
            <p className="mt-2 text-muted-foreground">
              {isAr ? 'نعمل على إضافة متاجر جديدة. ترقبوا!' : 'New shops coming soon!'}
            </p>
          </AnimatedSection>
        ) : (
          <StaggerGrid className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {stores.map((store) => (
              <StaggerItem key={store.id}>
                <Link href={`/store/${store.slug}`}>
                  <Card className="group overflow-hidden transition-all hover:shadow-lg">
                    {/* Store header / banner */}
                    <div className="relative h-32 bg-gradient-to-br from-primary-100 to-primary-50">
                      <div className="absolute -bottom-8 start-5">
                        <div className="flex h-16 w-16 items-center justify-center rounded-xl border-4 border-white bg-white shadow-md">
                          {store.logoUrl ? (
                            <Image
                              src={store.logoUrl}
                              alt={store.name as string}
                              width={48}
                              height={48}
                              className="rounded-lg object-contain"
                            />
                          ) : (
                            <Store className="h-8 w-8 text-primary-600" />
                          )}
                        </div>
                      </div>
                    </div>

                    <CardContent className="pt-12 px-5 pb-5">
                      <h3 className="text-lg font-bold text-foreground transition-colors group-hover:text-primary-600">
                        {typeof store.name === 'object' && store.name
                          ? ((store.name as Record<string, string>).ar || (store.name as Record<string, string>).en)
                          : String(store.name)}
                      </h3>
                      {store.location && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {typeof store.location === 'object' && store.location
                            ? ((store.location as Record<string, string>).ar || (store.location as Record<string, string>).en)
                            : String(store.location)}
                        </p>
                      )}
                      <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Gavel className="h-3 w-3" />
                          {isAr ? 'مزادات نشطة' : 'Active Auctions'}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </StaggerItem>
            ))}
          </StaggerGrid>
        )}
      </section>
    </div>
  )
}
