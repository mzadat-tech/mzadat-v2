export default function StoreLoading() {
  return (
    <div className="min-h-screen bg-gray-50/60 animate-pulse">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-3">
        {/* Header Skeleton */}
      <div className="bg-white border-b border-border">
        <div className="h-32 w-full bg-muted sm:h-40 md:h-44" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-end gap-4 pb-5 sm:gap-5">
            <div className="-mt-10 size-20 rounded-xl border-[3px] border-white bg-muted shadow-lg sm:-mt-12 sm:size-24 sm:rounded-2xl" />
            <div className="flex min-w-0 flex-1 flex-col gap-2 pt-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0 space-y-2">
                <div className="h-6 w-48 rounded-md bg-muted" />
                <div className="h-4 w-64 rounded bg-muted" />
              </div>
              <div className="flex gap-1.5">
                <div className="h-6 w-20 rounded-full bg-muted" />
                <div className="h-6 w-12 rounded-full bg-muted" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar Skeleton */}
      <div className="border-b border-border bg-white/95">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 py-3">
            <div className="h-9 w-52 rounded-lg bg-muted" />
            <div className="h-9 w-32 rounded-lg bg-muted" />
            <div className="ms-auto h-4 w-16 rounded bg-muted" />
          </div>
        </div>
      </div>

      {/* Group Quick Card Skeletons */}
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <div className="flex gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex shrink-0 items-center gap-3 rounded-xl border border-border bg-white px-4 py-3">
              <div className="h-10 w-10 rounded-lg bg-muted" />
              <div className="space-y-1.5">
                <div className="h-3.5 w-20 rounded bg-muted" />
                <div className="h-3 w-28 rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
      </div>

      {/* Lot Card Skeletons */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-3">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="flex flex-col overflow-hidden rounded-xl border border-border bg-white sm:flex-row"
          >
            <div className="h-44 w-full shrink-0 bg-muted sm:h-auto sm:w-48 md:w-56" />
            <div className="flex min-w-0 flex-1 flex-col justify-between p-4 space-y-3">
              <div className="space-y-2">
                <div className="h-5 w-3/4 rounded bg-muted" />
                <div className="flex gap-3">
                  <div className="h-3 w-20 rounded bg-muted" />
                  <div className="h-3 w-16 rounded bg-muted" />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="h-13 w-28 rounded-lg bg-muted" />
                <div className="h-13 w-28 rounded-lg bg-muted" />
              </div>
            </div>
            <div className="flex shrink-0 flex-row items-center gap-2 border-t border-border px-3 py-3 sm:w-44 sm:flex-col sm:items-stretch sm:gap-2 sm:border-t-0 sm:border-s md:w-48">
              <div className="space-y-1 flex-1 sm:flex-none">
                <div className="h-2.5 w-16 rounded bg-muted" />
                <div className="h-5 w-24 rounded bg-muted" />
              </div>
              <div className="h-9 w-full rounded-lg bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
