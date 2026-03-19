/** Skeleton for dashboard › My Bids */
export default function BidsLoading() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Heading */}
      <div className="space-y-2">
        <div className="h-7 w-32 rounded-lg bg-muted" />
        <div className="h-4 w-56 rounded bg-muted" />
      </div>

      {/* Filter / search bar */}
      <div className="flex gap-3">
        <div className="h-9 flex-1 rounded-lg bg-muted" />
        <div className="h-9 w-28 rounded-lg bg-muted" />
      </div>

      {/* Table / list */}
      <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
        {/* Header row */}
        <div className="flex items-center gap-4 border-b border-border bg-muted/30 px-5 py-3">
          {[120, 80, 80, 80, 60].map((w, i) => (
            <div key={i} className="h-3.5 rounded bg-muted" style={{ width: w }} />
          ))}
        </div>
        {/* Data rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-border px-5 py-4 last:border-0">
            <div className="flex flex-1 items-center gap-3">
              <div className="size-10 shrink-0 rounded-lg bg-muted" />
              <div className="space-y-1.5">
                <div className="h-4 w-36 rounded bg-muted" />
                <div className="h-3 w-24 rounded bg-muted" />
              </div>
            </div>
            <div className="h-4 w-20 rounded bg-muted" />
            <div className="h-4 w-20 rounded bg-muted" />
            <div className="h-6 w-16 rounded-full bg-muted" />
            <div className="h-8 w-16 rounded-lg bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}
