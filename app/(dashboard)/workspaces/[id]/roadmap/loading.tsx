export default function RoadmapLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-6">
      <div className="mb-6 flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-700 pb-4">
        <div className="h-5 w-16 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
        <div className="h-5 w-20 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
        <div className="h-5 w-24 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
      </div>
      <div className="space-y-4">
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6 shadow-sm">
          <div className="mb-6 h-8 w-3/4 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
          <div className="mb-8 h-4 w-1/2 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="mt-1 h-6 w-6 rounded-full bg-zinc-200 dark:bg-zinc-700 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-2/3 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
                  <div className="h-3 w-full rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
                  <div className="h-3 w-4/5 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
