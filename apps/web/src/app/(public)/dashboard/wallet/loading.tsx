/** Skeleton for dashboard › Wallet */
export default function WalletLoading() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Heading */}
      <div className="space-y-2">
        <div className="h-7 w-32 rounded-lg bg-muted" />
        <div className="h-4 w-56 rounded bg-muted" />
      </div>

      {/* Balance card */}
      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-4 w-28 rounded bg-muted" />
            <div className="h-10 w-40 rounded-xl bg-muted" />
          </div>
          <div className="size-14 rounded-2xl bg-muted" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="h-12 rounded-xl bg-muted" />
          <div className="h-12 rounded-xl bg-muted" />
        </div>
      </div>

      {/* Transaction history */}
      <div className="space-y-2">
        <div className="h-5 w-36 rounded-lg bg-muted" />
        <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between border-b border-border px-5 py-4 last:border-0">
              <div className="flex items-center gap-3">
                <div className="size-9 shrink-0 rounded-lg bg-muted" />
                <div className="space-y-1.5">
                  <div className="h-4 w-32 rounded bg-muted" />
                  <div className="h-3 w-24 rounded bg-muted" />
                </div>
              </div>
              <div className="text-end space-y-1.5">
                <div className="h-4 w-20 rounded bg-muted" />
                <div className="h-5 w-14 rounded-full bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
