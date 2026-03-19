/** Skeleton for the lot detail page */
export default function LotLoading() {
  return (
    <div className="min-h-screen animate-pulse bg-white">
      {/* ── Breadcrumb ── */}
      <div className="border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="h-3.5 w-12 rounded bg-muted" />
            <div className="h-3 w-3 rounded bg-muted" />
            <div className="h-3.5 w-16 rounded bg-muted" />
            <div className="h-3 w-3 rounded bg-muted" />
            <div className="h-3.5 w-24 rounded bg-muted" />
            <div className="h-3 w-3 rounded bg-muted" />
            <div className="h-3.5 w-40 rounded bg-muted" />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10">
          {/* ── Left: Gallery + Details ── */}
          <div className="space-y-6 lg:col-span-7">
            {/* Main image */}
            <div className="aspect-4/3 w-full overflow-hidden rounded-2xl bg-muted" />
            {/* Thumbnail strip */}
            <div className="flex gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 w-16 shrink-0 rounded-xl bg-muted" />
              ))}
            </div>

            {/* Details tabs (desktop) */}
            <div className="hidden space-y-4 lg:block">
              {/* Tab bar */}
              <div className="flex gap-4 border-b border-border pb-1">
                {[80, 100, 90, 70].map((w, i) => (
                  <div key={i} className="h-8 rounded bg-muted" style={{ width: w }} />
                ))}
              </div>
              {/* Tab body lines */}
              <div className="space-y-3 pt-2">
                {[90, 75, 85, 60, 70].map((w, i) => (
                  <div key={i} className="h-4 rounded bg-muted" style={{ width: `${w}%` }} />
                ))}
              </div>
            </div>
          </div>

          {/* ── Right: Bid Engine ── */}
          <div className="lg:col-span-5">
            <div className="space-y-4 rounded-2xl border border-border bg-white p-5 shadow-sm">
              {/* Category + actions */}
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <div className="h-6 w-20 rounded-full bg-muted" />
                  <div className="h-6 w-16 rounded-full bg-muted" />
                </div>
                <div className="flex gap-1">
                  <div className="size-9 rounded-full bg-muted" />
                  <div className="size-9 rounded-full bg-muted" />
                </div>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <div className="h-7 w-full rounded-lg bg-muted" />
                <div className="h-5 w-2/3 rounded-lg bg-muted" />
              </div>

              {/* Price row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="h-20 rounded-xl bg-muted" />
                <div className="h-20 rounded-xl bg-muted" />
              </div>

              {/* Countdown */}
              <div className="h-16 rounded-xl bg-muted" />

              {/* Deposit row */}
              <div className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
                <div className="h-4 w-24 rounded bg-muted" />
                <div className="h-4 w-16 rounded bg-muted" />
              </div>

              {/* Bid input + button */}
              <div className="space-y-2">
                <div className="h-11 rounded-lg bg-muted" />
                <div className="h-12 rounded-xl bg-muted" />
              </div>

              {/* Bid increments */}
              <div className="flex gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-8 flex-1 rounded-lg bg-muted" />
                ))}
              </div>

              {/* Separator */}
              <div className="h-px bg-border" />

              {/* Bid history header */}
              <div className="h-5 w-28 rounded bg-muted" />

              {/* Bid history rows */}
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="size-7 rounded-full bg-muted" />
                      <div className="space-y-1">
                        <div className="h-3 w-20 rounded bg-muted" />
                        <div className="h-2.5 w-14 rounded bg-muted" />
                      </div>
                    </div>
                    <div className="h-4 w-16 rounded bg-muted" />
                  </div>
                ))}
              </div>
            </div>

            {/* Store card */}
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-white p-4">
              <div className="size-12 shrink-0 rounded-xl bg-muted" />
              <div className="space-y-1.5">
                <div className="h-4 w-28 rounded bg-muted" />
                <div className="h-3 w-20 rounded bg-muted" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
