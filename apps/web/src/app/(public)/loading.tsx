/** Skeleton for the home page */
export default function HomeLoading() {
  return (
    <div className="min-h-screen animate-pulse">
      {/* ── Hero Banner ── */}
      <div className="relative h-120 w-full bg-muted sm:h-140 lg:h-150">
        {/* Overlay shimmer blocks */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-4">
          <div className="h-5 w-32 rounded-full bg-white/20" />
          <div className="h-12 w-3/4 max-w-lg rounded-xl bg-white/20 sm:h-14" />
          <div className="h-12 w-2/4 max-w-md rounded-xl bg-white/20" />
          <div className="h-4 w-64 rounded bg-white/15" />
          <div className="mt-2 flex gap-3">
            <div className="h-11 w-36 rounded-full bg-white/20" />
            <div className="h-11 w-36 rounded-full bg-white/10" />
          </div>
        </div>
      </div>

      {/* ── Browse Auctions Tabs ── */}
      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Heading */}
          <div className="mx-auto mb-8 flex flex-col items-center gap-3">
            <div className="h-7 w-48 rounded-lg bg-muted" />
            <div className="h-4 w-64 rounded bg-muted" />
          </div>

          {/* Tab pills */}
          <div className="mb-10 flex flex-wrap items-center justify-center gap-2">
            {[140, 120, 160].map((w, i) => (
              <div key={i} className="h-10 rounded-full bg-muted" style={{ width: w }} />
            ))}
          </div>

          {/* Card grid */}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <AuctionCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Live Lots Carousel ── */}
      <section className="bg-stone-50/80 py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Section header */}
          <div className="mb-10 flex items-end justify-between">
            <div className="space-y-2">
              <div className="h-3 w-20 rounded bg-muted" />
              <div className="h-7 w-52 rounded-lg bg-muted" />
              <div className="h-4 w-64 rounded bg-muted" />
            </div>
            <div className="hidden h-9 w-28 rounded-full bg-muted sm:block" />
          </div>
          {/* 4-column carousel */}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <AuctionCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Merchants ── */}
      <section className="py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-8 flex flex-col items-center gap-3">
            <div className="h-7 w-44 rounded-lg bg-muted" />
            <div className="h-4 w-56 rounded bg-muted" />
          </div>
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex shrink-0 flex-col items-center gap-3 rounded-2xl border border-border bg-white p-5"
                style={{ width: 160 }}
              >
                <div className="size-16 rounded-xl bg-muted" />
                <div className="h-4 w-24 rounded bg-muted" />
                <div className="h-3 w-16 rounded bg-muted" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

function AuctionCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      {/* Image */}
      <div className="aspect-4/2.75 w-full bg-muted" />
      {/* Body */}
      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <div className="h-3 w-20 rounded bg-muted" />
          <div className="h-3 w-16 rounded bg-muted" />
        </div>
        <div className="h-5 w-4/5 rounded bg-muted" />
        <div className="h-4 w-3/5 rounded bg-muted" />
        {/* Price grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="h-14 rounded-lg bg-muted" />
          <div className="h-14 rounded-lg bg-muted" />
        </div>
        {/* Timer */}
        <div className="h-16 rounded-lg bg-muted" />
        {/* CTA */}
        <div className="h-10 rounded-lg bg-muted" />
      </div>
    </div>
  )
}
