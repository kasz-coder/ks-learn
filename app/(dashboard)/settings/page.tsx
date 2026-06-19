'use client'

import { useState, useEffect, useCallback } from 'react'

function InlineThemeToggle() {
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return false
    const t = localStorage.getItem('theme')
    return t === 'dark' || (t !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  })

  function toggle() {
    const next = !dark
    setDark(next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark', next)
  }

  return (
    <button
      onClick={toggle}
      className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 dark:focus:ring-offset-zinc-800"
      style={{ backgroundColor: dark ? '#52525b' : '#d4d4d8' }}
      role="switch"
      aria-checked={dark}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <span
        className={`inline-flex items-center justify-center size-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          dark ? 'translate-x-[22px]' : 'translate-x-[2px]'
        }`}
      >
        {dark ? (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-3 text-zinc-600">
            <path fillRule="evenodd" d="M7.455 2.004a.75.75 0 0 1 .26.77 7 7 0 0 0 9.958 7.967.75.75 0 0 1 1.067.853A8.5 8.5 0 1 1 6.647 1.921a.75.75 0 0 1 .808.083Z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-3 text-amber-500">
            <path d="M10 2a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 2ZM10 15a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 15ZM10 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM15.657 5.404a.75.75 0 1 0-1.06-1.06l-1.061 1.06a.75.75 0 0 0 1.06 1.06l1.06-1.06ZM6.464 14.596a.75.75 0 1 0-1.06-1.06l-1.06 1.06a.75.75 0 0 0 1.06 1.06l1.06-1.06ZM18 10a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 18 10ZM5 10a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 5 10ZM14.596 15.657a.75.75 0 0 0 1.06-1.06l-1.06-1.061a.75.75 0 1 0-1.06 1.06l1.06 1.06ZM5.404 6.464a.75.75 0 0 0 1.06-1.06l-1.06-1.06a.75.75 0 1 0-1.061 1.06l1.06 1.06Z" />
          </svg>
        )}
      </span>
    </button>
  )
}

const LANGUAGES = [
  'English', '中文', '日本語', '한국어', 'Español', 'Français',
  'Deutsch', 'Português', 'Italiano', 'Русский', 'العربية',
  'हिन्दी', 'ไทย', 'Tiếng Việt', 'Bahasa Indonesia', 'Bahasa Melayu',
]

export default function SettingsPage() {
  const [language, setLanguage] = useState('English')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => { if (data.language) setLanguage(data.language) })
      .finally(() => setLoading(false))
  }, [])

  const save = useCallback(async () => {
    setSaving(true)
    setSaved(false)
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [language])

  return (
    <div className="mx-auto max-w-xl space-y-8 px-4 py-4 sm:px-6 sm:py-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Settings</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Configure your TeachFlow experience</p>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800 space-y-8">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Appearance
          </label>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Toggle between light and dark mode.
          </p>
          <div className="pt-1">
            <InlineThemeToggle />
          </div>
        </div>

        <hr className="border-zinc-200 dark:border-zinc-700" />

        <div className="space-y-2">
          <label htmlFor="language" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            AI Response Language
          </label>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Choose the language TeachFlow AI will use when responding to you.
          </p>
          <select
            id="language"
            value={language}
            onChange={e => setLanguage(e.target.value)}
            disabled={loading}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 disabled:opacity-50"
          >
            {LANGUAGES.map(lang => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={save}
            disabled={saving || loading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          {saved && (
            <span className="text-sm text-green-600 dark:text-green-400">Saved</span>
          )}
        </div>
      </div>
    </div>
  )
}
