'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import useEmblaCarousel from 'embla-carousel-react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Expand, Images } from 'lucide-react'
import { cn } from '@mzadat/ui/lib/utils'
import { Badge } from '@mzadat/ui/components/badge'

interface LotGalleryProps {
  images: string[]
  name: string
  status: 'upcoming' | 'live' | 'ended' | string
  direction: 'rtl' | 'ltr'
  isAr: boolean
  onImageClick: (index: number) => void
}

export function LotGallery({ images, name, status, direction, isAr, onImageClick }: LotGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Main carousel
  const [mainRef, mainApi] = useEmblaCarousel({
    loop: true,
    direction,
    containScroll: 'trimSnaps',
  })

  // Thumbnail carousel
  const [thumbRef, thumbApi] = useEmblaCarousel({
    containScroll: 'keepSnaps',
    dragFree: true,
    direction,
    axis: 'x',
  })

  const onThumbClick = useCallback(
    (index: number) => {
      if (!mainApi || !thumbApi) return
      mainApi.scrollTo(index)
    },
    [mainApi, thumbApi],
  )

  const onSelect = useCallback(() => {
    if (!mainApi || !thumbApi) return
    setSelectedIndex(mainApi.selectedScrollSnap())
    thumbApi.scrollTo(mainApi.selectedScrollSnap())
  }, [mainApi, thumbApi])

  useEffect(() => {
    if (!mainApi) return
    onSelect()
    mainApi.on('select', onSelect)
    mainApi.on('reInit', onSelect)
    return () => {
      mainApi.off('select', onSelect)
      mainApi.off('reInit', onSelect)
    }
  }, [mainApi, onSelect])

  const scrollPrev = useCallback(() => mainApi?.scrollPrev(), [mainApi])
  const scrollNext = useCallback(() => mainApi?.scrollNext(), [mainApi])

  const displayImages = images.length > 0 ? images : ['/placeholder-lot.jpg']

  return (
    <div className="space-y-3">
      {/* Main Image Carousel */}
      <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50">
        <div ref={mainRef} className="overflow-hidden">
          <div className="flex">
            {displayImages.map((img, i) => (
              <div
                key={i}
                className="relative aspect-[4/2.7] w-full flex-[0_0_100%] cursor-zoom-in"
                onClick={() => onImageClick(i)}
              >
                <Image
                  src={img}
                  alt={`${name} - ${i + 1}`}
                  fill
                  priority={i === 0}
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 58vw"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Gradient overlay for status badges */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/30 to-transparent" />

        {/* Status Badge */}
        <div className="absolute right-4 top-4 z-10">
          {status === 'live' && (
            <Badge className="border-0 bg-emerald-500/90 px-3 py-1.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 backdrop-blur-sm">
              <span className="me-2 inline-block h-2 w-2 animate-pulse rounded-full bg-white" />
              {isAr ? 'مزاد مباشر' : 'LIVE'}
            </Badge>
          )}
          {status === 'upcoming' && (
            <Badge className="border-0 bg-amber-500/90 px-3 py-1.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/30 backdrop-blur-sm">
              {isAr ? 'قريباً' : 'UPCOMING'}
            </Badge>
          )}
          {status === 'ended' && (
            <Badge className="border-0 bg-slate-700/90 px-3 py-1.5 text-sm font-semibold text-white shadow-lg backdrop-blur-sm">
              {isAr ? 'انتهى' : 'ENDED'}
            </Badge>
          )}
        </div>

        {/* Fullscreen button */}
        <button
          onClick={() => onImageClick(selectedIndex)}
          className="absolute bottom-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white opacity-0 backdrop-blur-sm transition-all hover:bg-black/60 group-hover:opacity-100"
        >
          <Expand className="h-4 w-4" />
        </button>

        {/* Navigation arrows */}
        {displayImages.length > 1 && (
          <>
            <button
              onClick={scrollPrev}
              className="absolute start-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 shadow-lg backdrop-blur-sm transition-all hover:bg-white hover:shadow-xl"
            >
              {direction === 'rtl' ? (
                <ChevronRight className="h-5 w-5 text-slate-700" />
              ) : (
                <ChevronLeft className="h-5 w-5 text-slate-700" />
              )}
            </button>
            <button
              onClick={scrollNext}
              className="absolute end-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 shadow-lg backdrop-blur-sm transition-all hover:bg-white hover:shadow-xl"
            >
              {direction === 'rtl' ? (
                <ChevronLeft className="h-5 w-5 text-slate-700" />
              ) : (
                <ChevronRight className="h-5 w-5 text-slate-700" />
              )}
            </button>
          </>
        )}

        {/* Image counter pill */}
        {displayImages.length > 1 && (
          <div className="absolute bottom-4 end-4 z-10 flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
            <Images className="h-3.5 w-3.5" />
            {selectedIndex + 1} / {displayImages.length}
          </div>
        )}
      </div>

      {/* Thumbnail Strip */}
      {displayImages.length > 1 && (
        <div className="relative">
          <div ref={thumbRef} className="overflow-hidden rounded-xl">
            <div className="flex gap-2 p-2">
              {displayImages.map((img, i) => (
                <button
                  key={i}
                  onClick={() => onThumbClick(i)}
                  className={cn(
                    'relative aspect-[4/3] flex-[0_0_calc(20%-6.4px)] overflow-hidden rounded-lg transition-all duration-200',
                    'min-w-0 sm:flex-[0_0_calc(16.666%-6.67px)]',
                    selectedIndex === i
                      ? 'ring-2 ring-primary-500 ring-offset-2'
                      : 'opacity-60 hover:opacity-90',
                  )}
                >
                  <Image
                    src={img}
                    alt={`${name} thumbnail ${i + 1}`}
                    fill
                    className="object-cover"
                    sizes="100px"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
