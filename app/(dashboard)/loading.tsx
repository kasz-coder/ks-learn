export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-4 sm:px-6 sm:py-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">My Workspaces</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Manage your learning spaces</p>
      </div>
      <div className="space-y-5">
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <div className="flex-1 h-[42px] rounded-lg bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
          <div className="h-[42px] w-[140px] rounded-lg bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-5 shadow-sm"
            >
              <div className="mb-3 h-5 w-3/4 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
              <div className="flex gap-3">
                <div className="h-4 w-20 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
                <div className="h-4 w-16 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
