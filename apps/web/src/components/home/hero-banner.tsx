'use client'

import Image from 'next/image'
import Link from 'next/link'

interface HeroBannerProps {
  locale: string
  direction: 'rtl' | 'ltr'
}

export function HeroBanner({ locale }: HeroBannerProps) {
  const isAr = locale === 'ar'
  const bannerSrc = isAr ? '/banner-ar.jpg' : '/banner-en.jpg'

  return (
    <section className="w-full">
      <Link href="/auctions" className="block w-full">
        <div className="relative w-full aspect-[3/1] sm:aspect-[4/1] lg:aspect-[5/1]">
          <Image
            src={bannerSrc}
            alt={isAr ? 'مزايدة ذكية، فوز كبير' : 'Smart Bidding, Big Winning'}
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
        </div>
      </Link>
    </section>
  )
}
