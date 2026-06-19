'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Workspace } from '@/lib/types'
import { ConfirmDialog } from './confirm-dialog'

export function WorkspaceList({ workspaces }: { workspaces: Workspace[] }) {
  const router = useRouter()
  const [topic, setTopic] = useState('')
  const [mission, setMission] = useState('')
  const [showMission, setShowMission] = useState(false)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const TOPIC_MAX_LENGTH = 500
  const remaining = TOPIC_MAX_LENGTH - topic.length
  const topicError = topic.length > TOPIC_MAX_LENGTH

  useEffect(() => {
    if (!error) return
    const t = setTimeout(() => setError(null), 5000)
    return () => clearTimeout(t)
  }, [error])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!topic.trim()) return
    setCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), mission: mission.trim() || null }),
      })
      if (res.ok) {
        setTopic('')
        setMission('')
        router.refresh()
      } else {
        try {
          const body = await res.json()
          setError(body.error || 'Failed to create workspace')
        } catch {
          if (res.status >= 500) {
            setError('Server error. Please try again.')
          } else if (res.status === 400) {
            setError('Invalid input. Please check your entries.')
          } else if (res.status === 401) {
            setError('Please sign in to create a workspace.')
          } else {
            setError('Failed to create workspace')
          }
        }
      }
    } catch {
      setError('Network error')
    }
    setCreating(false)
  }

  function handleDeleteClick(e: React.MouseEvent, id: string) {
    e.preventDefault()
    e.stopPropagation()
    setConfirmId(id)
  }

  async function handleDeleteConfirm() {
    if (!confirmId) return
    setDeleting(confirmId)
    setError(null)
    try {
      const res = await fetch(`/api/workspaces/${confirmId}`, { method: 'DELETE' })
      if (res.ok) {
        router.refresh()
      } else {
        setError('Failed to delete workspace')
      }
    } catch {
      setError('Network error')
    }
    setDeleting(null)
    setConfirmId(null)
  }

  return (
    <div className="space-y-5">
      <form onSubmit={handleCreate} className="flex flex-col gap-2.5">
          <input
            ref={inputRef}
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="What do you want to learn?"
            aria-label="Workspace name"
            disabled={creating}
            className={`rounded-lg border bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 transition-all duration-150 focus:ring-2 focus:ring-zinc-500/20 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 ${
              topicError
                ? 'border-red-400 focus:border-red-500 dark:border-red-500 dark:focus:border-red-400'
                : 'border-zinc-300 focus:border-zinc-500 dark:border-zinc-700 dark:focus:border-zinc-400'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          />
        <div className="flex justify-end">
          <span className={`text-xs ${topicError ? 'text-red-500' : 'text-zinc-400 dark:text-zinc-500'}`}>
            {remaining}
          </span>
        </div>
        {!showMission ? (
          <button
            type="button"
            onClick={() => setShowMission(true)}
            disabled={creating}
            className="text-xs text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
          >
            + Add learning goal (optional)
          </button>
        ) : (
          <textarea
            value={mission}
            onChange={(e) => setMission(e.target.value)}
            placeholder="What's your goal for learning this topic?"
            rows={2}
            autoFocus
            disabled={creating}
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 transition-all duration-150 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 resize-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-zinc-400 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        )}
        <button
          type="submit"
          disabled={creating || !topic.trim() || topicError}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-all duration-150 hover:bg-zinc-800 active:bg-zinc-950 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {creating && (
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {creating ? 'Creating...' : 'Start Learning'}
        </button>
      </form>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      {workspaces.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 py-16 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No workspaces yet. Type a topic above to start learning.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((ws) => (
            <Link
              key={ws.id}
              href={`/workspaces/${ws.id}/chat`}
              className="group relative block rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-all duration-150 hover:shadow-md hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-zinc-600"
            >
              <button
                onClick={(e) => handleDeleteClick(e, ws.id)}
                disabled={deleting === ws.id}
                className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-md text-zinc-400 opacity-0 transition-all duration-150 hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                aria-label="Delete workspace"
              >
                {deleting === ws.id ? (
                  <span className="text-xs">...</span>
                ) : (
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </button>
              <h2 className="mb-2 pr-6 text-base font-semibold text-zinc-900 dark:text-zinc-100">{ws.topic}</h2>
              <div className="flex gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                <span className="flex items-center gap-1">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  {ws.lesson_count} lessons
                </span>
                <span className="flex items-center gap-1">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  {ws.ref_count} refs
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirmId !== null}
        title="Delete workspace?"
        message="Delete this workspace and all its content? This will permanently remove: lessons, references, learning records, roadmaps, and chat history. This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmId(null)}
        loading={deleting !== null}
      />
    </div>
  )
}
