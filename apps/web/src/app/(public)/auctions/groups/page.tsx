import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Calendar, MapPin, Package, Clock } from 'lucide-react'
import { Badge } from '@mzadat/ui/components/badge'
import { formatOMR } from '@mzadat/ui/lib/utils'
import { getAuctionGroups } from '@/lib/data'
import { DEFAULT_LOCALE } from '@/lib/i18n'

const locale = DEFAULT_LOCALE

export const metadata: Metadata = {
  title: locale === 'ar' ? 'مجموعات المزادات' : 'Auction Groups',
}

export default async function GroupsPage() {
  const isAr = locale === 'ar'
  const groups = await getAuctionGroups(locale).catch(() => [])

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-border bg-gradient-to-b from-muted/50 to-background">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
          <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
            {isAr ? 'مجموعات المزادات' : 'Auction Groups'}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {isAr
              ? 'تصفح جميع مجموعات المزادات المتاحة'
              : 'Browse all available auction groups'}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {groups.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => (
              <Link
                key={group.id}
                href={`/auctions/groups/${group.slug}`}
                className="group block overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-primary-100 to-primary-50">
                  {group.image ? (
                    <Image
                      src={group.image}
                      alt={group.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Package className="h-16 w-16 text-primary-200" />
                    </div>
                  )}
                  <div className="absolute bottom-3 start-3">
                    <Badge className="bg-white/90 text-foreground backdrop-blur-sm">
                      <Package className="me-1 h-3 w-3" />
                      {group.productCount} {isAr ? 'منتج' : 'products'}
                    </Badge>
                  </div>
                </div>

                <div className="p-5">
                  <h3 className="mb-2 text-lg font-semibold text-foreground">
                    {group.name}
                  </h3>
                  {group.description && (
                    <p className="mb-3 text-sm text-muted-foreground line-clamp-2">
                      {group.description}
                    </p>
                  )}

                  <div className="space-y-2 text-sm text-muted-foreground">
                    {group.inspectionLocation && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 shrink-0" />
                        <span>{group.inspectionLocation}</span>
                      </div>
                    )}
                    {group.inspectionDate && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 shrink-0" />
                        <span>
                          {isAr ? 'المعاينة: ' : 'Inspection: '}
                          {new Date(group.inspectionDate).toLocaleDateString(
                            locale === 'ar' ? 'ar-OM' : 'en-US',
                            { month: 'long', day: 'numeric', year: 'numeric' },
                          )}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                    <span className="text-sm text-muted-foreground">
                      {isAr ? 'الحد الأدنى للتأمين' : 'Min Deposit'}
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                      {formatOMR(group.minDeposit)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
            <Package className="mb-4 h-16 w-16 text-muted-foreground/30" />
            <h3 className="mb-1 text-lg font-semibold">
              {isAr ? 'لا توجد مجموعات حالياً' : 'No Groups Available'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {isAr ? 'تحقق لاحقاً' : 'Check back later'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
