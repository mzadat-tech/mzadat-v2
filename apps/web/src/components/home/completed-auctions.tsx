'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { ArrowRight, ArrowLeft, Gavel, CheckCircle2 } from 'lucide-react'
import { Badge } from '@mzadat/ui/components/badge'
import { formatOMR } from '@mzadat/ui/lib/utils'
import type { ProductCard } from '@/lib/data'

interface CompletedAuctionsProps {
  products: ProductCard[]
  locale: string
  direction: 'rtl' | 'ltr'
}

export function CompletedAuctions({ products, locale, direction }: CompletedAuctionsProps) {
  const isAr = locale === 'ar'
  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight

  if (!products.length) return null

  return (
    <section className="py-14 lg:py-18">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground sm:text-2xl">
              {isAr ? 'مزادات مكتملة' : 'Completed Auctions'}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {isAr ? 'مزادات تم إنجازها بنجاح' : 'Successfully concluded auctions'}
            </p>
          </div>
          <Link
            href="/auctions?status=ended"
            className="hidden items-center gap-1.5 text-sm font-medium text-primary-600 transition-colors hover:text-primary-700 sm:flex"
          >
            {isAr ? 'عرض الكل' : 'View All'}
            <ArrowIcon className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.slice(0, 8).map((product, i) => (
            <CompletedCard key={product.id} product={product} locale={locale} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}

function CompletedCard({
  product,
  locale,
  index,
}: {
  product: ProductCard
  locale: string
  index: number
}) {
  const isAr = locale === 'ar'

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Link
        href={`/auctions/${product.slug}`}
        className="group block overflow-hidden rounded-2xl border border-border bg-white transition-all hover:shadow-md"
      >
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="object-cover grayscale-[20%] transition-all duration-300 group-hover:grayscale-0"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Gavel className="h-10 w-10 text-muted-foreground/20" />
            </div>
          )}

          {/* Completed overlay */}
          <div className="absolute start-3 top-3">
            <Badge variant="secondary" className="bg-gray-800/90 text-white backdrop-blur-sm">
              <CheckCircle2 className="me-1 h-3 w-3" />
              {isAr ? 'مكتمل' : 'Completed'}
            </Badge>
          </div>

          {/* Category */}
          {product.categoryName && (
            <div className="absolute end-3 top-3">
              <Badge variant="secondary" className="bg-white/90 text-xs backdrop-blur-sm">
                {product.categoryName}
              </Badge>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-3.5">
          <h3 className="mb-2 text-sm font-medium text-foreground line-clamp-1">
            {product.name}
          </h3>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {isAr ? 'السعر النهائي' : 'Sold for'}
              </p>
              <p className="text-sm font-bold text-foreground">
                {formatOMR(product.currentBid || product.startingPrice)}
              </p>
            </div>
            {product.bidCount > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Gavel className="h-3 w-3" />
                {product.bidCount} {isAr ? 'مزايدة' : 'bids'}
              </div>
            )}
          </div>

          {/* Store */}
          {product.storeName && (
            <div className="mt-2 border-t border-border pt-2">
              <span className="text-xs text-muted-foreground">{product.storeName}</span>
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  )
}
