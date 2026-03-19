/** Skeleton for the dashboard overview page */
export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-8">
      {/* ── Page heading ── */}
      <div className="space-y-2">
        <div className="h-7 w-48 rounded-lg bg-muted" />
        <div className="h-4 w-64 rounded bg-muted" />
      </div>

      {/* ── Stat Cards (4 columns) ── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-white p-5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="h-4 w-28 rounded bg-muted" />
              <div className="size-9 rounded-lg bg-muted" />
            </div>
            <div className="h-8 w-24 rounded-lg bg-muted" />
            <div className="h-3 w-16 rounded bg-muted" />
          </div>
        ))}
      </div>

      {/* ── Recent Activity + Upcoming ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Bids */}
        <div className="rounded-xl border border-border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="h-5 w-28 rounded bg-muted" />
            <div className="h-4 w-12 rounded bg-muted" />
          </div>
          <div className="divide-y divide-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3.5">
                <div className="size-9 shrink-0 rounded-lg bg-muted" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="h-4 w-4/5 rounded bg-muted" />
                  <div className="h-3 w-1/2 rounded bg-muted" />
                </div>
                <div className="shrink-0 space-y-1.5 text-end">
                  <div className="h-4 w-20 rounded bg-muted" />
                  <div className="h-5 w-14 rounded-full bg-muted" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Auctions */}
        <div className="rounded-xl border border-border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="h-5 w-36 rounded bg-muted" />
            <div className="h-4 w-12 rounded bg-muted" />
          </div>
          <div className="divide-y divide-border">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-4">
                <div className="size-12 shrink-0 rounded-xl bg-muted" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="h-4 w-3/4 rounded bg-muted" />
                  <div className="h-3 w-1/2 rounded bg-muted" />
                </div>
                <div className="h-8 w-20 shrink-0 rounded-lg bg-muted" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl border border-border bg-white shadow-sm" />
        ))}
      </div>
    </div>
  )
}
