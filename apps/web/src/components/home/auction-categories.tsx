'use client'

import { motion } from 'framer-motion'
import {
  Car,
  Smartphone,
  Home,
  Watch,
  Hammer,
  Gem,
  Paintbrush,
  Package,
} from 'lucide-react'
import Link from 'next/link'

interface AuctionCategoriesProps {
  locale: string
}

export function AuctionCategories({ locale }: AuctionCategoriesProps) {
  const isAr = locale === 'ar'

  const categories = [
    {
      icon: <Car className="h-6 w-6" />,
      title: isAr ? 'سيارات ومركبات' : 'Vehicles & Cars',
      description: isAr
        ? 'مزادات سيارات، شاحنات، ودراجات نارية بأسعار تنافسية'
        : 'Auctions for cars, trucks, and motorcycles at competitive prices.',
      color: 'bg-blue-50 text-blue-600',
    },
    {
      icon: <Smartphone className="h-6 w-6" />,
      title: isAr ? 'إلكترونيات' : 'Electronics',
      description: isAr
        ? 'أجهزة إلكترونية وهواتف ذكية وأجهزة كمبيوتر بعروض مميزة'
        : 'Electronics, smartphones, and computers with exclusive deals.',
      color: 'bg-violet-50 text-violet-600',
    },
    {
      icon: <Home className="h-6 w-6" />,
      title: isAr ? 'عقارات' : 'Real Estate',
      description: isAr
        ? 'عقارات سكنية وتجارية وأراضي في مختلف مناطق عُمان'
        : 'Residential and commercial properties and land across Oman.',
      color: 'bg-emerald-50 text-emerald-600',
    },
    {
      icon: <Watch className="h-6 w-6" />,
      title: isAr ? 'ساعات ومجوهرات' : 'Watches & Jewelry',
      description: isAr
        ? 'ساعات فاخرة ومجوهرات ثمينة بأسعار لا تُقاوم'
        : 'Luxury watches and precious jewelry at unbeatable prices.',
      color: 'bg-amber-50 text-amber-600',
    },
    {
      icon: <Hammer className="h-6 w-6" />,
      title: isAr ? 'معدات وآلات' : 'Equipment & Machinery',
      description: isAr
        ? 'معدات صناعية وزراعية وبناء من مصادر موثوقة'
        : 'Industrial, agricultural, and construction equipment from trusted sources.',
      color: 'bg-orange-50 text-orange-600',
    },
    {
      icon: <Gem className="h-6 w-6" />,
      title: isAr ? 'تحف وأنتيك' : 'Antiques & Collectibles',
      description: isAr
        ? 'قطع نادرة وتحف فنية ومقتنيات ثمينة'
        : 'Rare items, art pieces, and valuable collectibles.',
      color: 'bg-rose-50 text-rose-600',
    },
    {
      icon: <Paintbrush className="h-6 w-6" />,
      title: isAr ? 'أثاث ومفروشات' : 'Furniture & Home',
      description: isAr
        ? 'أثاث منزلي ومكتبي وديكورات بتصاميم متنوعة'
        : 'Home and office furniture and décor in various styles.',
      color: 'bg-teal-50 text-teal-600',
    },
    {
      icon: <Package className="h-6 w-6" />,
      title: isAr ? 'بضائع متنوعة' : 'General Goods',
      description: isAr
        ? 'مجموعة متنوعة من المنتجات والبضائع بأسعار مخفضة'
        : 'A wide variety of products and goods at discounted prices.',
      color: 'bg-sky-50 text-sky-600',
    },
  ]

  return (
    <section className="bg-white py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <span className="inline-block rounded-full bg-primary-100 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary-700">
            {isAr ? 'الفئات' : 'Categories'}
          </span>
          <h2 className="mt-4 text-2xl font-bold text-gray-900 sm:text-3xl lg:text-4xl">
            {isAr
              ? 'تصفح فئات المزادات المتنوعة'
              : 'Explore Diverse Auction Categories'}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-gray-500">
            {isAr
              ? 'اكتشف مجموعة واسعة من المزادات في فئات متعددة. من السيارات والعقارات إلى الإلكترونيات والمجوهرات'
              : 'Discover a wide selection of auctions across multiple categories. From vehicles and real estate to electronics and jewelry — find what you\'re looking for on Mzadat.'}
          </p>
        </motion.div>

        {/* Category Grid */}
        <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <Link
                href="/auctions"
                className="group flex flex-col items-start rounded-2xl border border-gray-100 bg-white p-5 transition-all hover:border-primary-200 hover:shadow-md"
              >
                <div
                  className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${category.color} transition-transform group-hover:scale-110`}
                >
                  {category.icon}
                </div>
                <h3 className="text-sm font-semibold text-gray-900">
                  {category.title}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-gray-400">
                  {category.description}
                </p>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
