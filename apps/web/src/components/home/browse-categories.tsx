'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { ArrowRight, ArrowLeft } from 'lucide-react'
import type { CategoryItem } from '@/lib/data'

// Default icons for common auction categories
const categoryIcons: Record<string, string> = {
  cars: '🚗',
  vehicles: '🚗',
  'real-estate': '🏠',
  property: '🏠',
  electronics: '💻',
  machinery: '⚙️',
  equipment: '🔧',
  jewelry: '💎',
  art: '🎨',
  furniture: '🪑',
  collectibles: '🏆',
  watches: '⌚',
  default: '📦',
}

function getCategoryIcon(slug: string): string {
  for (const [key, icon] of Object.entries(categoryIcons)) {
    if (slug.toLowerCase().includes(key)) return icon
  }
  return categoryIcons.default
}

interface BrowseCategoriesProps {
  categories: CategoryItem[]
  locale: string
  direction: 'rtl' | 'ltr'
}

export function BrowseCategories({ categories, locale, direction }: BrowseCategoriesProps) {
  const isAr = locale === 'ar'
  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight

  if (!categories.length) return null

  return (
    <section className="py-14 lg:py-18">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground sm:text-2xl">
              {isAr ? 'تصفح المزادات' : 'Browse Auctions'}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {isAr ? 'اختر الفئة التي تهمك' : 'Find what you\'re looking for'}
            </p>
          </div>
          <Link
            href="/categories"
            className="hidden items-center gap-1.5 text-sm font-medium text-primary-600 transition-colors hover:text-primary-700 sm:flex"
          >
            {isAr ? 'عرض الكل' : 'View All'}
            <ArrowIcon className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {categories.slice(0, 12).map((cat, i) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.04 }}
            >
              <Link
                href={`/auctions?category=${cat.slug}`}
                className="group flex flex-col items-center gap-3 rounded-2xl border border-border bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md"
              >
                {/* Icon */}
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary-50 text-2xl transition-colors group-hover:bg-primary-100">
                  {cat.image ? (
                    <Image
                      src={cat.image}
                      alt={cat.name}
                      width={32}
                      height={32}
                      className="h-8 w-8 object-contain"
                    />
                  ) : (
                    <span>{getCategoryIcon(cat.slug)}</span>
                  )}
                </div>

                {/* Name */}
                <span className="text-center text-sm font-medium text-foreground line-clamp-1">
                  {cat.name}
                </span>

                {/* Count */}
                {cat.productCount > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {cat.productCount} {isAr ? 'قطعة' : 'lots'}
                  </span>
                )}
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Mobile "View All" */}
        <div className="mt-6 flex justify-center sm:hidden">
          <Link
            href="/categories"
            className="flex items-center gap-1.5 text-sm font-medium text-primary-600"
          >
            {isAr ? 'عرض جميع الفئات' : 'View All Categories'}
            <ArrowIcon className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  )
}
