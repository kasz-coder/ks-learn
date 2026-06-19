'use client'

import Link from 'next/link'
import { UserMenu } from '@/components/layout/user-menu'

export function DashboardHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 dark:border-zinc-700 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-1.5 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center justify-center size-8 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
              <path d="M10.394 2.08a1 1 0 0 0-.788 0l-7 3a1 1 0 0 0 0 1.84L5.25 8.051a.999.999 0 0 1 .356-.257l4-1.714a1 1 0 1 1 .788 1.838l-2.727 1.17 1.94.831a1 1 0 0 0 .787 0l7-3a1 1 0 0 0 0-1.838l-7-3ZM3.31 9.397 5 10.12v3.102a1 1 0 1 0 1 0V10.12l1.69-.724 1.64.703a2 2 0 0 0 1.34 0l1.64-.703L12 10.12v3.102a1 1 0 1 0 1 0V10.12l1.69-.724 1.175.503a1 1 0 0 0 .788-1.838l-7-3a1 1 0 0 0-.788 0l-7 3a1 1 0 0 0 0 1.838Z" />
            </svg>
          </div>
          <span className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100 hidden sm:block">
            TeachFlow
          </span>
        </Link>

        <UserMenu />
      </div>
    </header>
  )
}
