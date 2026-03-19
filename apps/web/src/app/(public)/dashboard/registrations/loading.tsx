/** Skeleton for dashboard › Registrations */
export default function RegistrationsLoading() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Heading */}
      <div className="space-y-2">
        <div className="h-7 w-44 rounded-lg bg-muted" />
        <div className="h-4 w-64 rounded bg-muted" />
      </div>

      {/* Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
            {/* Image band */}
            <div className="h-28 w-full bg-muted" />
            <div className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1.5">
                  <div className="h-5 w-40 rounded-lg bg-muted" />
                  <div className="h-3.5 w-24 rounded bg-muted" />
                </div>
                <div className="h-6 w-16 rounded-full bg-muted" />
              </div>
              <div className="flex gap-4">
                <div className="space-y-1">
                  <div className="h-3 w-16 rounded bg-muted" />
                  <div className="h-5 w-20 rounded bg-muted" />
                </div>
                <div className="space-y-1">
                  <div className="h-3 w-16 rounded bg-muted" />
                  <div className="h-5 w-20 rounded bg-muted" />
                </div>
              </div>
              <div className="h-9 w-full rounded-lg bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
