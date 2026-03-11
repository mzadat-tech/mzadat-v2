'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, SlidersHorizontal, LayoutGrid, List, X } from 'lucide-react'
import { Button } from '@mzadat/ui'
import { Input } from '@mzadat/ui/components/input'
import { Badge } from '@mzadat/ui/components/badge'
import { Tabs, TabsList, TabsTrigger } from '@mzadat/ui/components/tabs'
import { AuctionCard } from '@/components/auction/auction-card'
import type { ProductCard } from '@/lib/data'
import type { CMSCategory } from '@/lib/cms'

interface AuctionsPageClientProps {
  liveAuctions: ProductCard[]
  upcomingAuctions: ProductCard[]
  categories: CMSCategory[]
  locale: string
  direction: 'rtl' | 'ltr'
}

export function AuctionsPageClient({
  liveAuctions,
  upcomingAuctions,
  categories,
  locale,
  direction,
}: AuctionsPageClientProps) {
  const isAr = locale === 'ar'
  const [activeTab, setActiveTab] = useState<'live' | 'upcoming' | 'direct'>('live')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  const allAuctions = activeTab === 'live' ? liveAuctions : upcomingAuctions

  // Filter
  const filtered = allAuctions.filter((product) => {
    if (searchQuery && !product.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    if (selectedCategory && product.categorySlug !== selectedCategory) {
      return false
    }
    if (activeTab === 'direct' && product.saleType !== 'direct') {
      return false
    }
    return true
  })

  return (
    <div className="min-h-screen">
      {/* Page Header */}
      <div className="border-b border-border bg-gradient-to-b from-muted/50 to-background">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
              {isAr ? 'المزادات' : 'Auctions'}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {isAr
                ? 'تصفح جميع المزادات المتاحة وشارك في المزايدة'
                : 'Browse all available auctions and start bidding'}
            </p>
          </motion.div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Search & Filters Bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mb-8 space-y-4"
        >
          {/* Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as 'live' | 'upcoming' | 'direct')}
          >
            <TabsList className="h-10">
              <TabsTrigger value="live" className="gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {isAr ? 'مزادات مباشرة' : 'Live'}
                <Badge variant="secondary" className="ms-1 h-5 min-w-[20px] px-1 text-[10px]">
                  {liveAuctions.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="upcoming">
                {isAr ? 'قادمة' : 'Upcoming'}
                <Badge variant="secondary" className="ms-1 h-5 min-w-[20px] px-1 text-[10px]">
                  {upcomingAuctions.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="direct">
                {isAr ? 'بيع مباشر' : 'Direct Sale'}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Search + Filter Toggle */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={isAr ? 'ابحث في المزادات...' : 'Search auctions...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ps-10"
              />
            </div>
            <Button
              variant={showFilters ? 'secondary' : 'outline'}
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className="shrink-0"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </div>

          {/* Filters Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="rounded-xl border border-border bg-white p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {isAr ? 'التصنيفات' : 'Categories'}
                    </span>
                    {selectedCategory && (
                      <button
                        onClick={() => setSelectedCategory(null)}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                        {isAr ? 'مسح' : 'Clear'}
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() =>
                          setSelectedCategory(
                            selectedCategory === cat.slug ? null : cat.slug,
                          )
                        }
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                          selectedCategory === cat.slug
                            ? 'border-primary-600 bg-primary-50 text-primary-700'
                            : 'border-border bg-white text-muted-foreground hover:border-primary-300 hover:text-foreground'
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Active filter badge */}
          {selectedCategory && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {isAr ? 'تصفية:' : 'Filter:'}
              </span>
              <Badge
                variant="secondary"
                className="cursor-pointer gap-1"
                onClick={() => setSelectedCategory(null)}
              >
                {categories.find((c) => c.slug === selectedCategory)?.name}
                <X className="h-3 w-3" />
              </Badge>
            </div>
          )}
        </motion.div>

        {/* Results */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 py-4">
            {filtered.map((product, index) => (
              <AuctionCard
                key={product.id}
                product={product}
                locale={locale}
                direction={direction}
                index={index}
              />
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center"
          >
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-1 text-lg font-semibold text-foreground">
              {isAr ? 'لا توجد نتائج' : 'No Results Found'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {isAr
                ? 'جرب تعديل معايير البحث أو التصفية'
                : 'Try adjusting your search or filter criteria'}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  )
}
