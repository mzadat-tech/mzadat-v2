/** Skeleton for the shops / merchants listing page */
export default function ShopsLoading() {
  return (
    <div className="min-h-screen animate-pulse">
      {/* ── Hero ── */}
      <section className="relative h-52 overflow-hidden bg-linear-to-br from-primary-900 via-primary-800 to-primary-700 sm:h-60">
        <div className="flex h-full flex-col items-center justify-center gap-3">
          <div className="h-6 w-28 rounded-full bg-white/20" />
          <div className="h-10 w-32 rounded-xl bg-white/20 sm:h-12 sm:w-40" />
          <div className="h-4 w-64 rounded bg-white/15" />
        </div>
      </section>

      {/* ── Shops Grid ── */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <ShopCardSk key={i} />
          ))}
        </div>
      </section>
    </div>
  )
}

function ShopCardSk() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      {/* Banner */}
      <div className="relative h-32 bg-muted">
        {/* Logo overlap */}
        <div className="absolute bottom-0 inset-s-4 translate-y-1/2">
          <div className="size-14 rounded-xl border-2 border-white bg-muted shadow-md" />
        </div>
      </div>
      {/* Content */}
      <div className="p-4 pt-10 space-y-3">
        <div className="h-5 w-36 rounded-lg bg-muted" />
        <div className="h-3.5 w-full rounded bg-muted" />
        <div className="h-3.5 w-4/5 rounded bg-muted" />
        <div className="flex items-center gap-3 pt-1">
          <div className="h-3 w-16 rounded bg-muted" />
          <div className="h-3 w-16 rounded bg-muted" />
          <div className="h-3 w-16 rounded bg-muted" />
        </div>
        <div className="h-9 w-full rounded-lg bg-muted pt-1" />
      </div>
    </div>
  )
}
