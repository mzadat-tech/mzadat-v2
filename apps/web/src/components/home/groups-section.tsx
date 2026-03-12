'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Calendar, MapPin, Package } from 'lucide-react'
import { Button } from '@mzadat/ui'
import { Badge } from '@mzadat/ui/components/badge'
import { formatOMR } from '@mzadat/ui/lib/utils'
import { useCountdown } from '@/hooks/use-countdown'
import type { AuctionGroup } from '@/lib/data'

interface GroupsSectionProps {
  groups: AuctionGroup[]
  locale: string
  direction: 'rtl' | 'ltr'
}

export function GroupsSection({ groups, locale, direction }: GroupsSectionProps) {
  const isAr = locale === 'ar'
  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight

  if (groups.length === 0) return null

  return (
    <section className="bg-muted/30 py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-10 flex items-end justify-between"
        >
          <div>
            <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
              {isAr ? 'مجموعات المزادات' : 'Auction Groups'}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {isAr
                ? 'تصفح المجموعات المتاحة للمزايدة'
                : 'Browse available auction groups'}
            </p>
          </div>
          <Button variant="outline" size="sm" asChild className="hidden sm:flex">
            <Link href="/auctions/groups" className="gap-1.5">
              {isAr ? 'عرض الكل' : 'View All'}
              <ArrowIcon className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </motion.div>

        {/* Groups Grid */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {groups.slice(0, 6).map((group, index) => (
            <GroupCard
              key={group.id}
              group={group}
              locale={locale}
              direction={direction}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

function GroupCard({
  group,
  locale,
  direction,
  index,
}: {
  group: AuctionGroup
  locale: string
  direction: string
  index: number
}) {
  const isAr = locale === 'ar'
  const timeLeft = useCountdown(group.endDate)

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <Link
        href={`/auctions/groups/${group.slug}`}
        className="group block overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
      >
        {/* Image */}
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
              <Package className="h-12 w-12 text-primary-200" />
            </div>
          )}
          <div className="absolute bottom-3 start-3">
            <Badge className="bg-white/90 text-foreground backdrop-blur-sm">
              <Package className="me-1 h-3 w-3" />
              {group.productCount} {isAr ? 'منتج' : 'products'}
            </Badge>
          </div>
        </div>

        <div className="p-4">
          <h3 className="mb-2 text-base font-semibold text-foreground line-clamp-1">
            {group.name}
          </h3>

          {group.description && (
            <p className="mb-3 text-sm text-muted-foreground line-clamp-2">
              {group.description}
            </p>
          )}

          <div className="space-y-2 text-sm">
            {group.inspectionLocation && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{group.inspectionLocation}</span>
              </div>
            )}
            {group.inspectionEndDate && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {isAr ? 'المعاينة: ' : 'Inspection: '}
                  {new Date(group.inspectionEndDate).toLocaleDateString(
                    locale === 'ar' ? 'ar-OM' : 'en-US',
                    { month: 'short', day: 'numeric' },
                  )}
                </span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
            <span className="text-xs text-muted-foreground">
              {isAr ? 'الحد الأدنى: ' : 'Min Deposit: '}
              <span className="font-semibold text-foreground">
                {formatOMR(group.minDeposit)}
              </span>
            </span>
            {timeLeft.total > 0 && (
              <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                {timeLeft.days}d {timeLeft.hours}h
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
