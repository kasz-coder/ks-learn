'use client'

import { useState, useEffect, useRef } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { UserResponse } from '@supabase/supabase-js'

export function UserMenu() {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    createSupabaseBrowserClient().auth.getUser().then(({ data }: UserResponse) => {
      if (data?.user?.email) setEmail(data.user.email)
    })
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const initials = email
    ? email.slice(0, 2).toUpperCase()
    : '?'

  async function handleSignOut() {
    setOpen(false)
    try {
      await createSupabaseBrowserClient().auth.signOut()
    } catch {}
    router.push('/login')
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-center size-8 rounded-full bg-zinc-200 dark:bg-zinc-600 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-500 transition-colors"
        aria-label="User menu"
      >
        {initials}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-lg py-1 z-50">
          <div className="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400 truncate border-b border-zinc-100 dark:border-zinc-700">
            {email}
          </div>
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
              <path d="M17.293 11.707a1 1 0 0 0 .196-1.392 2.984 2.984 0 0 1-.33-3.457 1 1 0 0 0-.585-1.42 3.001 3.001 0 0 1-1.764-1.425 1 1 0 0 0-1.316-.352 2.982 2.982 0 0 1-3.458.33 1 1 0 0 0-1.392.196 3.004 3.004 0 0 1-1.425 1.764 1 1 0 0 0-.352 1.316 2.982 2.982 0 0 1-.33 3.458 1 1 0 0 0 .196 1.392 3.004 3.004 0 0 1 1.425 1.764 1 1 0 0 0 1.316.352 2.982 2.982 0 0 1 3.458-.33 1 1 0 0 0 1.392.196 3.004 3.004 0 0 1 1.764 1.425 1 1 0 0 0 1.42.585 2.982 2.982 0 0 1 3.457-.33 1 1 0 0 0 1.392-.196 3.004 3.004 0 0 1 1.764-1.425Z" />
              <circle cx="10" cy="10" r="2.5" />
            </svg>
            Settings
          </Link>
          <button
            onClick={handleSignOut}
            className="w-full text-left px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors flex items-center gap-3"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
              <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 0 1 5.25 2h5.5A2.25 2.25 0 0 1 13 4.25v2a.75.75 0 0 1-1.5 0v-2a.75.75 0 0 0-.75-.75h-5.5a.75.75 0 0 0-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 0 0 .75-.75v-2a.75.75 0 0 1 1.5 0v2A2.25 2.25 0 0 1 10.75 18h-5.5A2.25 2.25 0 0 1 3 15.75V4.25Z" clipRule="evenodd" />
              <path fillRule="evenodd" d="M6 10a.75.75 0 0 1 .75-.75h9.546l-1.048-.943a.75.75 0 1 1 1.004-1.114l2.5 2.25a.75.75 0 0 1 0 1.114l-2.5 2.25a.75.75 0 1 1-1.004-1.114l1.048-.943H6.75A.75.75 0 0 1 6 10Z" clipRule="evenodd" />
            </svg>
            Sign Out
          </button>
        </div>
      )}
    </div>
  )
}
