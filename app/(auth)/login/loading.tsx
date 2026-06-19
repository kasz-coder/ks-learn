export default function LoginLoading() {
  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <div className="h-7 w-32 rounded bg-zinc-200 animate-pulse" />
        <div className="h-4 w-48 rounded bg-zinc-200 animate-pulse" />
      </div>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <div className="h-4 w-12 rounded bg-zinc-200 animate-pulse" />
          <div className="h-10 w-full rounded-lg bg-zinc-200 animate-pulse" />
        </div>
        <div className="space-y-1.5">
          <div className="h-4 w-16 rounded bg-zinc-200 animate-pulse" />
          <div className="h-10 w-full rounded-lg bg-zinc-200 animate-pulse" />
        </div>
        <div className="flex justify-end">
          <div className="h-3 w-24 rounded bg-zinc-200 animate-pulse" />
        </div>
      </div>
      <div className="h-10 w-full rounded-lg bg-zinc-200 animate-pulse" />
      <div className="h-4 w-40 mx-auto rounded bg-zinc-200 animate-pulse" />
    </div>
  )
}
