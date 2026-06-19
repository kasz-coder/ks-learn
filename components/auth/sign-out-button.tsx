"use client"

import { createSupabaseBrowserClient } from "@/lib/supabase-browser"
import { useRouter } from "next/navigation"

export function SignOutButton() {
  const router = useRouter()

  async function handleSignOut() {
    try {
      const supabase = createSupabaseBrowserClient()
      await supabase.auth.signOut()
    } catch {
      // Sign out even if cleanup fails
    }
    router.push("/login")
  }

  return (
    <button
      onClick={handleSignOut}
      className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3.5 py-1.5 text-sm font-medium text-zinc-600 dark:text-zinc-400 transition-all duration-150 hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-200"
    >
      Sign Out
    </button>
  )
}
