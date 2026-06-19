export default function ResourcesLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-6">
      <div className="mb-6 flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-700 pb-4">
        <div className="h-5 w-16 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
        <div className="h-5 w-20 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
        <div className="h-5 w-24 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
      </div>
      <div className="mb-6 sm:mb-8">
        <div className="h-8 w-32 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
        <div className="mt-2 h-4 w-48 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4 shadow-sm"
          >
            <div className="mb-2 h-4 w-16 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
            <div className="mb-3 h-5 w-3/4 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
            <div className="h-3 w-full rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
            <div className="mt-2 h-3 w-2/3 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
