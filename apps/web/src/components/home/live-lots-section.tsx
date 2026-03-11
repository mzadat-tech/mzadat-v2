'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Flame, ArrowRight, ArrowLeft, Gavel, ChevronLeft, ChevronRight } from 'lucide-react'
import useEmblaCarousel from 'embla-carousel-react'
import Autoplay from 'embla-carousel-autoplay'
import { AuctionCard } from '@/components/auction/auction-card'
import type { ProductCard } from '@/lib/data'

interface LiveLotsSectionProps {
  lots: ProductCard[]
  locale: string
  direction: 'rtl' | 'ltr'
}

export function LiveLotsSection({ lots, locale, direction }: LiveLotsSectionProps) {
  const isAr = locale === 'ar'
  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight

  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      align: 'start',
      loop: true,
      skipSnaps: false,
      direction: direction,
      slidesToScroll: 1,
    },
    [Autoplay({ delay: 4000, stopOnInteraction: false, stopOnMouseEnter: true })],
  )

  const [canScrollPrev, setCanScrollPrev] = useState(false)
  const [canScrollNext, setCanScrollNext] = useState(false)
  const [selectedSnap, setSelectedSnap] = useState(0)
  const [snapCount, setSnapCount] = useState(0)

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setCanScrollPrev(emblaApi.canScrollPrev())
    setCanScrollNext(emblaApi.canScrollNext())
    setSelectedSnap(emblaApi.selectedScrollSnap())
    setSnapCount(emblaApi.scrollSnapList().length)
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    onSelect()
    emblaApi.on('select', onSelect)
    emblaApi.on('reInit', onSelect)
    return () => {
      emblaApi.off('select', onSelect)
      emblaApi.off('reInit', onSelect)
    }
  }, [emblaApi, onSelect])

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi])
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi])
  const scrollTo = useCallback((i: number) => emblaApi?.scrollTo(i), [emblaApi])

  // Don't render section if no lots
  if (!lots.length) {
    return (
      <section className="bg-stone-50/80 py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <div className="mb-2 flex items-center justify-center gap-2">
              <Flame className="h-4 w-4 text-accent-500" />
              <span className="text-xs font-semibold uppercase tracking-wider text-accent-500">
                {isAr ? 'مزايدة الآن' : 'Bid Now'}
              </span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {isAr ? 'قطع المزاد المتاحة' : 'Live Auction Lots'}
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {isAr
                ? 'قطع متاحة للمزايدة أو ستُطرح قريبًا'
                : 'Lots currently open for bidding or coming soon'}
            </p>
          </div>

          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-white/60 py-20">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground/40">
              <Gavel className="h-7 w-7" />
            </div>
            <h3 className="mt-5 text-sm font-medium text-foreground">
              {isAr ? 'لا توجد قطع مزاد متاحة حالياً' : 'No auction lots available right now'}
            </h3>
            <p className="mt-1.5 max-w-sm text-center text-xs leading-relaxed text-muted-foreground">
              {isAr
                ? 'سيتم إضافة قطع جديدة قريبًا. ترقب المزادات القادمة'
                : 'New lots will be added soon. Stay tuned for upcoming auctions.'}
            </p>
          </div>
        </div>
      </section>
    )
  }

  const showControls = lots.length > 1

  return (
    <section className="bg-stone-50/80 py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10 flex items-end justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Flame className="h-4 w-4 text-accent-500" />
              <span className="text-xs font-semibold uppercase tracking-wider text-accent-500">
                {isAr ? 'مزايدة الآن' : 'Bid Now'}
              </span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {isAr ? 'قطع المزاد المتاحة' : 'Live Auction Lots'}
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {isAr
                ? 'قطع متاحة للمزايدة أو ستُطرح قريبًا'
                : 'Lots currently open for bidding or coming soon'}
            </p>
          </div>

          <div className="hidden items-center gap-2 sm:flex">
            {showControls && (
              <>
                <button
                  onClick={scrollPrev}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary-200 hover:bg-primary-50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label="Previous"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={scrollNext}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary-200 hover:bg-primary-50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label="Next"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            )}
            <Link
              href="/auctions"
              className="ms-2 inline-flex items-center gap-1.5 rounded-full border border-primary-600 px-5 py-2 text-sm font-medium text-primary-600 transition-all hover:bg-primary-600 hover:text-white"
            >
              {isAr ? 'عرض الكل' : 'View All'}
              <ArrowIcon className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Embla Carousel */}
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="-ms-4 flex">
            {lots.map((product, i) => (
              <div
                key={product.id}
                className="min-w-0 flex-[0_0_85%] ps-4 sm:flex-[0_0_50%] lg:flex-[0_0_33.333%] xl:flex-[0_0_25%]"
              >
                <div className="py-4">
                  <AuctionCard
                    product={product}
                    locale={locale}
                    direction={direction}
                    index={i}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pagination dots */}
        {showControls && snapCount > 1 && (
          <div className="mt-6 flex items-center justify-center gap-1.5">
            {Array.from({ length: snapCount }).map((_, i) => (
              <button
                key={i}
                onClick={() => scrollTo(i)}
                className={`h-2 rounded-full transition-all ${
                  i === selectedSnap
                    ? 'w-6 bg-primary-600'
                    : 'w-2 bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        )}

        {/* Mobile View All */}
        <div className="mt-10 flex justify-center sm:hidden">
          <Link
            href="/auctions"
            className="inline-flex items-center gap-2 rounded-full border border-primary-600 px-7 py-2.5 text-sm font-medium text-primary-600 transition-all hover:bg-primary-600 hover:text-white"
          >
            {isAr ? 'عرض جميع القطع' : 'View All Lots'}
            <ArrowIcon className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  )
}
