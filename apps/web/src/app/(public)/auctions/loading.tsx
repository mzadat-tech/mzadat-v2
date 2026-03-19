/** Skeleton for the auctions listing page */
export default function AuctionsLoading() {
  return (
    <div className="min-h-screen animate-pulse">
      {/* ── Page Header ── */}
      <div className="border-b border-border bg-linear-to-b from-muted/50 to-background">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
          <div className="space-y-3">
            <div className="h-9 w-40 rounded-lg bg-muted sm:h-10" />
            <div className="h-4 w-72 rounded bg-muted" />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* ── Filters Bar ── */}
        <div className="mb-8 space-y-4">
          {/* Search + filter toggle row */}
          <div className="flex gap-3">
            <div className="h-10 flex-1 rounded-lg bg-muted" />
            <div className="h-10 w-28 rounded-lg bg-muted" />
          </div>
          {/* Tab row */}
          <div className="flex gap-3">
            {[90, 100, 80].map((w, i) => (
              <div key={i} className="h-9 rounded-full bg-muted" style={{ width: w }} />
            ))}
          </div>
          {/* Category pills */}
          <div className="flex flex-wrap gap-2">
            {[70, 90, 80, 100, 75, 85].map((w, i) => (
              <div key={i} className="h-7 rounded-full bg-muted" style={{ width: w }} />
            ))}
          </div>
          {/* Results count */}
          <div className="h-4 w-28 rounded bg-muted" />
        </div>

        {/* ── Card Grid ── */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <AuctionCardSk key={i} />
          ))}
        </div>
      </div>
    </div>
  )
}

function AuctionCardSk() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      <div className="aspect-4/2.75 w-full bg-muted" />
      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <div className="h-3 w-20 rounded bg-muted" />
          <div className="h-3 w-16 rounded bg-muted" />
        </div>
        <div className="h-5 w-4/5 rounded bg-muted" />
        <div className="h-4 w-3/5 rounded bg-muted" />
        <div className="grid grid-cols-2 gap-2">
          <div className="h-14 rounded-lg bg-muted" />
          <div className="h-14 rounded-lg bg-muted" />
        </div>
        <div className="h-16 rounded-lg bg-muted" />
        <div className="h-10 rounded-lg bg-muted" />
      </div>
    </div>
  )
}
