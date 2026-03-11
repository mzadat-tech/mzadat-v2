'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Heart,
  Share2,
  MapPin,
  Eye,
  Gavel,
  Clock,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  Shield,
  Info,
  Store,
} from 'lucide-react'
import { Button } from '@mzadat/ui'
import { Badge } from '@mzadat/ui/components/badge'
import { Separator } from '@mzadat/ui/components/separator'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@mzadat/ui/components/tabs'
import { cn, formatOMR } from '@mzadat/ui/lib/utils'
import { useCountdown } from '@/hooks/use-countdown'
import type { ProductDetail } from '@/lib/data'

interface AuctionDetailClientProps {
  product: ProductDetail
  locale: string
  direction: 'rtl' | 'ltr'
}

export function AuctionDetailClient({ product, locale, direction }: AuctionDetailClientProps) {
  const isAr = locale === 'ar'
  const [currentImage, setCurrentImage] = useState(0)
  const [selectedIncrement, setSelectedIncrement] = useState(0)
  const timeLeft = useCountdown(product.endDate)
  const isLive = product.status === 'live'
  const isEnded = timeLeft.total <= 0

  const images = product.images.length > 0 ? product.images : [product.image].filter(Boolean) as string[]

  const bidAmount = product.currentBid + product.bidIncrements[selectedIncrement]

  return (
    <div className="min-h-screen">
      {/* Breadcrumb */}
      <div className="border-b border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground">
              {isAr ? 'الرئيسية' : 'Home'}
            </Link>
            <span>/</span>
            <Link href="/auctions" className="hover:text-foreground">
              {isAr ? 'المزادات' : 'Auctions'}
            </Link>
            <span>/</span>
            <span className="text-foreground">{product.name}</span>
          </nav>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* ─── Image Gallery ─── */}
          <div className="lg:col-span-7">
            <motion.div
              initial={{ opacity: 0, x: direction === 'rtl' ? 30 : -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* Main Image */}
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted">
                <AnimatePresence mode="wait">
                  {images[currentImage] && (
                    <motion.div
                      key={currentImage}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="relative h-full w-full"
                    >
                      <Image
                        src={images[currentImage]}
                        alt={product.name}
                        fill
                        priority
                        className="object-cover"
                        sizes="(max-width: 1024px) 100vw, 60vw"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Navigation */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={() =>
                        setCurrentImage((prev) =>
                          prev > 0 ? prev - 1 : images.length - 1,
                        )
                      }
                      className="absolute start-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur-sm transition-all hover:bg-white"
                    >
                      {direction === 'rtl' ? (
                        <ChevronRight className="h-5 w-5" />
                      ) : (
                        <ChevronLeft className="h-5 w-5" />
                      )}
                    </button>
                    <button
                      onClick={() =>
                        setCurrentImage((prev) =>
                          prev < images.length - 1 ? prev + 1 : 0,
                        )
                      }
                      className="absolute end-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur-sm transition-all hover:bg-white"
                    >
                      {direction === 'rtl' ? (
                        <ChevronLeft className="h-5 w-5" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      )}
                    </button>
                  </>
                )}

                {/* Status Badge */}
                <div className="absolute start-4 top-4">
                  {isLive && !isEnded && (
                    <Badge className="bg-emerald-500 text-white shadow-lg">
                      <span className="me-1.5 inline-block h-2 w-2 animate-pulse rounded-full bg-white" />
                      {isAr ? 'مزاد مباشر' : 'Live Auction'}
                    </Badge>
                  )}
                  {isEnded && (
                    <Badge variant="secondary" className="bg-gray-800 text-white">
                      {isAr ? 'انتهى المزاد' : 'Auction Ended'}
                    </Badge>
                  )}
                </div>

                {/* Image counter */}
                {images.length > 1 && (
                  <div className="absolute bottom-4 end-4 rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                    {currentImage + 1}/{images.length}
                  </div>
                )}
              </div>

              {/* Thumbnails */}
              {images.length > 1 && (
                <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentImage(i)}
                      className={cn(
                        'relative h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition-all',
                        currentImage === i
                          ? 'border-primary-600 ring-2 ring-primary-200'
                          : 'border-transparent opacity-70 hover:opacity-100',
                      )}
                    >
                      <Image
                        src={img}
                        alt={`${product.name} ${i + 1}`}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          </div>

          {/* ─── Product Info ─── */}
          <div className="lg:col-span-5">
            <motion.div
              initial={{ opacity: 0, x: direction === 'rtl' ? -30 : 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="space-y-6"
            >
              {/* Category & Actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {product.categoryName && (
                    <Badge variant="secondary">{product.categoryName}</Badge>
                  )}
                  {product.saleType === 'direct' && (
                    <Badge className="bg-primary-600 text-white">
                      {isAr ? 'بيع مباشر' : 'Direct Sale'}
                    </Badge>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <Heart className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Title */}
              <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
                {product.name}
              </h1>

              {/* Store & Location */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                {product.storeName && (
                  <Link
                    href={`/shops/${product.storeSlug}`}
                    className="flex items-center gap-1.5 font-medium text-primary-600 hover:underline"
                  >
                    <Store className="h-4 w-4" />
                    {product.storeName}
                  </Link>
                )}
                {product.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    {product.location}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Eye className="h-4 w-4" />
                  {product.viewCount.toLocaleString()}
                </span>
                <span className="flex items-center gap-1.5">
                  <Gavel className="h-4 w-4" />
                  {product.bidCount} {isAr ? 'مزايدة' : 'bids'}
                </span>
              </div>

              <Separator />

              {/* Pricing */}
              <div className="rounded-2xl border border-border bg-muted/30 p-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {isAr ? 'سعر البداية' : 'Starting Price'}
                    </p>
                    <p className="mt-1 text-lg font-semibold text-foreground">
                      {formatOMR(product.startingPrice)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-primary-600">
                      {isAr ? 'المزايدة الحالية' : 'Current Bid'}
                    </p>
                    <p className="mt-1 text-2xl font-bold text-primary-700">
                      {formatOMR(product.currentBid || product.startingPrice)}
                    </p>
                  </div>
                </div>

                {/* Countdown */}
                {isLive && !isEnded && (
                  <div className="mt-4 border-t border-border pt-4">
                    <div className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {isAr ? 'ينتهي بعد' : 'Time Remaining'}
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <TimeUnit
                        value={timeLeft.days}
                        label={isAr ? 'يوم' : 'Days'}
                      />
                      <TimeUnit
                        value={timeLeft.hours}
                        label={isAr ? 'ساعة' : 'Hrs'}
                      />
                      <TimeUnit
                        value={timeLeft.minutes}
                        label={isAr ? 'دقيقة' : 'Min'}
                      />
                      <TimeUnit
                        value={timeLeft.seconds}
                        label={isAr ? 'ثانية' : 'Sec'}
                        urgent={timeLeft.total < 3600000}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Bid Increments */}
              {isLive && !isEnded && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-foreground">
                    {isAr ? 'اختر قيمة المزايدة' : 'Select Bid Amount'}
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {product.bidIncrements.map((inc, i) => {
                      const amount = product.currentBid + inc
                      return (
                        <button
                          key={i}
                          onClick={() => setSelectedIncrement(i)}
                          className={cn(
                            'rounded-xl border p-3 text-center transition-all',
                            selectedIncrement === i
                              ? 'border-primary-600 bg-primary-50 ring-2 ring-primary-200'
                              : 'border-border hover:border-primary-300',
                          )}
                        >
                          <div className="text-[10px] font-medium text-muted-foreground">
                            +{formatOMR(inc)}
                          </div>
                          <div className="text-sm font-bold text-foreground">
                            {formatOMR(amount)}
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  <Button
                    size="lg"
                    className="w-full bg-primary-700 text-lg hover:bg-primary-800"
                  >
                    <Gavel className="me-2 h-5 w-5" />
                    {isAr ? 'قدم مزايدة' : 'Place Bid'} — {formatOMR(bidAmount)}
                  </Button>

                  {product.depositAmount > 0 && (
                    <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                      <Shield className="h-4 w-4 shrink-0" />
                      {isAr
                        ? `يتطلب تأمين ${formatOMR(product.depositAmount)} للمشاركة في المزاد`
                        : `Requires a deposit of ${formatOMR(product.depositAmount)} to participate`}
                    </div>
                  )}
                </div>
              )}

              {/* Group link */}
              {product.groupName && product.groupSlug && (
                <Link
                  href={`/auctions/groups/${product.groupSlug}`}
                  className="flex items-center justify-between rounded-xl border border-border p-4 transition-colors hover:bg-muted/50"
                >
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {isAr ? 'ضمن مجموعة' : 'Part of Group'}
                    </p>
                    <p className="font-medium text-foreground">{product.groupName}</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              )}
            </motion.div>
          </div>
        </div>

        {/* ─── Details Tabs ─── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-12"
        >
          <Tabs defaultValue="description">
            <TabsList>
              <TabsTrigger value="description">
                {isAr ? 'الوصف' : 'Description'}
              </TabsTrigger>
              <TabsTrigger value="specifications">
                {isAr ? 'المواصفات' : 'Specifications'}
              </TabsTrigger>
              <TabsTrigger value="terms">
                {isAr ? 'الشروط' : 'Terms'}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="description" className="mt-6">
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
                  {product.description || (isAr ? 'لا يوجد وصف متاح' : 'No description available')}
                </p>
              </div>
            </TabsContent>

            <TabsContent value="specifications" className="mt-6">
              {product.specifications.length > 0 ? (
                <div className="overflow-hidden rounded-xl border border-border">
                  {product.specifications.map((spec, i) => (
                    <div
                      key={i}
                      className={cn(
                        'grid grid-cols-3 gap-4 px-4 py-3',
                        i % 2 === 0 ? 'bg-muted/30' : 'bg-white',
                      )}
                    >
                      <span className="font-medium text-foreground">{spec.key}</span>
                      <span className="col-span-2 text-muted-foreground">
                        {spec.value}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {isAr ? 'لا توجد مواصفات متاحة' : 'No specifications available'}
                </p>
              )}
            </TabsContent>

            <TabsContent value="terms" className="mt-6">
              <div className="space-y-4 text-sm text-muted-foreground">
                <div className="flex items-start gap-3 rounded-lg border border-border p-4">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
                  <div>
                    <p className="font-medium text-foreground">
                      {isAr ? 'شروط المزايدة' : 'Bidding Terms'}
                    </p>
                    <p className="mt-1">
                      {isAr
                        ? 'يجب إيداع التأمين المطلوب قبل المشاركة في المزاد. المزايدة ملزمة وغير قابلة للإلغاء.'
                        : 'Required deposit must be submitted before participating. Bids are binding and non-reversible.'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg border border-border p-4">
                  <Shield className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <div>
                    <p className="font-medium text-foreground">
                      {isAr ? 'ضمان الشفافية' : 'Transparency Guarantee'}
                    </p>
                    <p className="mt-1">
                      {isAr
                        ? 'جميع المزايدات شفافة ويتم تسجيلها. يفوز صاحب أعلى مزايدة عند انتهاء المزاد.'
                        : 'All bids are transparent and recorded. The highest bidder wins when the auction ends.'}
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  )
}

function TimeUnit({
  value,
  label,
  urgent,
}: {
  value: number
  label: string
  urgent?: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-xl p-3 text-center',
        urgent ? 'bg-accent-50' : 'bg-white',
      )}
    >
      <div
        className={cn(
          'text-xl font-bold tabular-nums sm:text-2xl',
          urgent ? 'text-accent-600' : 'text-foreground',
        )}
      >
        {String(value).padStart(2, '0')}
      </div>
      <div className="text-[10px] font-medium text-muted-foreground">{label}</div>
    </div>
  )
}
