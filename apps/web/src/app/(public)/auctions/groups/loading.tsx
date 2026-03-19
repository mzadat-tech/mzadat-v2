/** Skeleton for the auction groups listing page */
export default function GroupsLoading() {
  return (
    <div className="min-h-screen animate-pulse">
      {/* Header */}
      <div className="border-b border-border bg-linear-to-b from-muted/50 to-background">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 space-y-3">
          <div className="h-9 w-52 rounded-lg bg-muted sm:h-10" />
          <div className="h-4 w-72 rounded bg-muted" />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <GroupCardSk key={i} />
          ))}
        </div>
      </div>
    </div>
  )
}

function GroupCardSk() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      {/* Image */}
      <div className="aspect-video w-full bg-muted" />
      {/* Body */}
      <div className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-5 w-16 rounded-full bg-muted" />
          <div className="h-5 w-20 rounded-full bg-muted" />
        </div>
        <div className="h-6 w-3/4 rounded-lg bg-muted" />
        <div className="h-4 w-full rounded bg-muted" />
        <div className="h-4 w-4/5 rounded bg-muted" />
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="h-10 rounded-lg bg-muted" />
          <div className="h-10 rounded-lg bg-muted" />
        </div>
        <div className="h-10 w-full rounded-xl bg-muted" />
      </div>
    </div>
  )
}
