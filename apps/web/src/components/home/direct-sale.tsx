'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { ArrowRight, ArrowLeft, ShoppingBag, Tag } from 'lucide-react'
import { Badge } from '@mzadat/ui/components/badge'
import { formatOMR } from '@mzadat/ui/lib/utils'
import type { ProductCard } from '@/lib/data'

interface DirectSaleProps {
  products: ProductCard[]
  locale: string
  direction: 'rtl' | 'ltr'
}

export function DirectSale({ products, locale, direction }: DirectSaleProps) {
  const isAr = locale === 'ar'
  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight

  if (!products.length) return null

  return (
    <section className="bg-gray-50/80 py-14 lg:py-18">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-end justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-primary-600" />
              <span className="text-xs font-semibold uppercase tracking-wider text-primary-600">
                {isAr ? 'بيع مباشر' : 'Direct Sale'}
              </span>
            </div>
            <h2 className="text-xl font-bold text-foreground sm:text-2xl">
              {isAr ? 'اشترِ الآن' : 'Buy Now'}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {isAr ? 'منتجات متاحة للشراء المباشر بدون مزايدة' : 'Available for immediate purchase — no bidding required'}
            </p>
          </div>
          <Link
            href="/auctions?type=direct"
            className="hidden items-center gap-1.5 text-sm font-medium text-primary-600 transition-colors hover:text-primary-700 sm:flex"
          >
            {isAr ? 'عرض الكل' : 'View All'}
            <ArrowIcon className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.slice(0, 4).map((product, i) => (
            <DirectSaleCard key={product.id} product={product} locale={locale} direction={direction} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}

function DirectSaleCard({
  product,
  locale,
  direction,
  index,
}: {
  product: ProductCard
  locale: string
  direction: 'rtl' | 'ltr'
  index: number
}) {
  const isAr = locale === 'ar'
  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3, delay: index * 0.06 }}
    >
      <Link
        href={`/auctions/${product.slug}`}
        className="group block overflow-hidden rounded-2xl border border-border bg-white transition-all hover:-translate-y-0.5 hover:shadow-lg"
      >
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <ShoppingBag className="h-10 w-10 text-muted-foreground/20" />
            </div>
          )}

          <div className="absolute start-3 top-3">
            <Badge className="bg-primary-700 text-white shadow-md">
              <Tag className="me-1 h-3 w-3" />
              {isAr ? 'بيع مباشر' : 'Buy Now'}
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {product.storeName && (
            <span className="mb-1 block text-xs font-medium text-primary-600">
              {product.storeName}
            </span>
          )}

          <h3 className="mb-3 text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary-700">
            {product.name}
          </h3>

          {/* Price */}
          <div className="rounded-lg bg-primary-50 px-3 py-2.5">
            <p className="text-[10px] font-medium uppercase tracking-wider text-primary-600">
              {isAr ? 'السعر' : 'Price'}
            </p>
            <p className="text-lg font-bold text-primary-700">
              {formatOMR(product.startingPrice)}
            </p>
          </div>

          {/* CTA */}
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
            <span className="text-xs font-medium text-primary-600 group-hover:text-primary-700">
              {isAr ? 'اشترِ الآن' : 'Buy Now'}
            </span>
            <ArrowIcon className="h-3.5 w-3.5 text-primary-600 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
