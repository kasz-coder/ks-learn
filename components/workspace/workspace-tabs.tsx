'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

const tabs = [
  { label: 'Chat', key: 'chat' },
  { label: 'Resources', key: 'resources' },
  { label: 'Roadmap', key: 'roadmap' },
] as const

export function WorkspaceTabs({ workspaceId }: { workspaceId: string }) {
  const pathname = usePathname()

  return (
    <div className="sticky top-14 z-30 border-b border-zinc-200 bg-white/90 backdrop-blur-md dark:border-zinc-700 dark:bg-zinc-800/90">
      <div className="mx-auto flex max-w-6xl">
        {tabs.map((tab) => {
          const href = `/workspaces/${workspaceId}/${tab.key}`
          const isActive = pathname === href
          return (
            <Link
              key={tab.key}
              href={href}
              className={`relative px-5 py-3 text-sm font-medium transition-colors duration-150 ${
                isActive
                  ? 'text-zinc-900 dark:text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              {tab.label}
              {isActive && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-zinc-900 dark:bg-zinc-100" />
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
