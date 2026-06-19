'use client'

import { useState, useEffect } from 'react'
import type { Resource } from '@/lib/types'
import { IframePreview } from '@/components/iframe-preview'
import { injectQuizScript } from '@/lib/quiz-inject'
import { injectSharedStyles } from '@/lib/shared-styles'
import { ConfirmDialog } from '@/components/confirm-dialog'

const typeConfig = {
  lesson: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300', label: 'Lesson', icon: '📖' },
  reference: { color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300', label: 'Reference', icon: '📋' },
  learning_record: { color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300', label: 'Record', icon: '📝' },
}

type VersionEntry = {
  version: number
  title: string
  content: string
  created_at: string
}

function FullScreenViewer({
  open,
  onClose,
  title,
  html,
  resourceId,
  resourceType,
}: {
  open: boolean
  onClose: () => void
  title: string
  html: string
  resourceId: string
  resourceType: string
}) {
  const [versions, setVersions] = useState<VersionEntry[]>([])
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null)
  const [currentVersion, setCurrentVersion] = useState(1)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = prev }
  }, [open])

  useEffect(() => {
    if (!open || resourceType !== 'lesson') return
    let cancelled = false
    setLoading(true)
    fetch(`/api/lessons/${resourceId}/versions`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (cancelled || !data) return
        setVersions(data.history)
        setCurrentVersion(data.current.version)
        setSelectedVersion(null)
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [open, resourceId, resourceType])

  if (!open) return null

  const isLatest = selectedVersion === null
  const displayVersion = isLatest ? currentVersion : selectedVersion!
  const displayTitle = isLatest ? title : (versions.find(v => v.version === displayVersion)?.title || title)
  const displayHtml = isLatest ? html : (versions.find(v => v.version === displayVersion)?.content || html)
  const safeHtml = injectQuizScript(injectSharedStyles(displayHtml))
  const allVersions = [
    { version: currentVersion, title, content: html, created_at: '' },
    ...versions,
  ].sort((a, b) => b.version - a.version)

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-zinc-900">
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-700 px-4 py-3 shrink-0 gap-3">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{displayTitle}</h2>
        <div className="flex items-center gap-2 shrink-0">
          {resourceType === 'lesson' && loading && (
            <div className="h-6 w-16 rounded bg-zinc-200 animate-pulse" />
          )}
          {resourceType === 'lesson' && !loading && allVersions.length > 1 && (
            <div className="flex gap-1">
              {allVersions.map(v => {
                const isActive = v.version === displayVersion
                return (
                  <button
                    key={v.version}
                    onClick={() => setSelectedVersion(v.version === currentVersion ? null : v.version)}
                    aria-label={`Version ${v.version}${isActive ? ' (current)' : ''}`}
                    className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                      isActive
                        ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                        : 'text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                    }`}
                  >
                    v{v.version}
                  </button>
                )
              })}
            </div>
          )}
          <button
            onClick={onClose}
            aria-label="Close viewer"
            className="rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
      <iframe
        srcDoc={safeHtml}
        title={displayTitle}
        className="flex-1 w-full border-0"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  )
}

function RecordViewer({
  open,
  onClose,
  title,
  content,
}: {
  open: boolean
  onClose: () => void
  title: string
  content: string
}) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = prev }
  }, [open])

  const [copied, setCopied] = useState(false)

  if (!open) return null

  const lines = content.split('\n').filter(l => l.trim())

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-zinc-900">
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-700 px-4 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
            📝 Record
          </span>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{title}</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              try {
                navigator.clipboard.writeText(content)
                setCopied(true)
              } catch {
                console.error('Clipboard write failed')
                setCopied(false)
              }
              setTimeout(() => setCopied(false), 2000)
            }}
            aria-label="Copy content"
            className="rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            onClick={onClose}
            aria-label="Close viewer"
            className="rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">{title}</h1>
          <ul className="space-y-3">
            {lines.map((line, i) => {
              const trimmed = line.replace(/^[-•*]\s*/, '').trim()
              const colonIdx = trimmed.indexOf(':')
              const hasLabel = colonIdx > 0 && colonIdx < 30
              return (
                <li key={i} className="flex items-start gap-3 rounded-lg border border-purple-100 dark:border-purple-900 bg-purple-50/50 dark:bg-purple-950/50 px-4 py-3">
                  <span className="shrink-0 mt-1 w-2 h-2 rounded-full bg-purple-400 dark:bg-purple-500" />
                  <div className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                    {hasLabel ? (
                      <><span className="font-semibold text-zinc-900 dark:text-zinc-100">{trimmed.slice(0, colonIdx)}:</span>{trimmed.slice(colonIdx + 1)}</>
                    ) : (
                      trimmed
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </div>
  )
}

export function ResourceCard({ resource, onDelete }: { resource: Resource; onDelete?: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const config = typeConfig[resource.type]
  const isHtml = /<html|<body|<div|<section/i.test(resource.content)
  const isRecord = resource.type === 'learning_record'

  const renderPreview = () => {
    if (isRecord) {
      const lines = resource.content.split('\n').filter(l => l.trim())
      return (
        <div className="border-t border-purple-200/50 dark:border-purple-800/50 px-4 py-3 bg-purple-50/50 dark:bg-purple-950/50">
          <ul className="space-y-1.5">
            {lines.slice(0, 4).map((line, i) => {
              const trimmed = line.replace(/^[-•*]\s*/, '').trim()
              const colonIdx = trimmed.indexOf(':')
              const hasLabel = colonIdx > 0 && colonIdx < 30
              return (
                <li key={i} className="flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                  <span className="shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full bg-purple-400 dark:bg-purple-500" />
                  {hasLabel ? (
                    <span><span className="font-medium text-zinc-700 dark:text-zinc-300">{trimmed.slice(0, colonIdx)}:</span>{trimmed.slice(colonIdx + 1)}</span>
                  ) : (
                    <span>{trimmed}</span>
                  )}
                </li>
              )
            })}
          </ul>
          {lines.length > 4 && (
            <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">+{lines.length - 4} more items</p>
          )}
        </div>
      )
    }

    if (isHtml) {
      return (
        <div className="border-t border-zinc-100 dark:border-zinc-700 h-28 overflow-hidden bg-zinc-50 dark:bg-zinc-900 relative">
          <IframePreview html={resource.content} title={`Preview of ${resource.title}`} />
        </div>
      )
    }

    return (
      <div className="border-t border-zinc-100 dark:border-zinc-700 px-4 py-2 bg-zinc-50 dark:bg-zinc-900">
        <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">{resource.content.slice(0, 150)}</p>
      </div>
    )
  }

  return (
    <>
      <button
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setOpen(true) }}
        className="w-full text-left bg-white border border-zinc-200 rounded-xl overflow-hidden hover:shadow-md hover:border-zinc-300 transition-all duration-150 dark:bg-zinc-800 dark:border-zinc-700 dark:hover:border-zinc-600"
      >
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${config.color}`}>
              {config.icon} {config.label}
            </span>
            <span className="text-xs text-zinc-400">
              {new Date(resource.created_at).toLocaleDateString()}
            </span>
            <div className="ml-auto">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setConfirmOpen(true)
                }}
                aria-label="Delete resource"
                className="rounded-md p-1 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c-.84 0-1.673.025-2.5.075V3.75c0-.69.56-1.25 1.25-1.25h2.5c.69 0 1.25.56 1.25 1.25v.325C11.673 4.025 10.84 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">{resource.title}</h3>
        </div>
        {renderPreview()}
      </button>
      {isRecord ? (
        <RecordViewer
          open={open}
          onClose={() => setOpen(false)}
          title={resource.title}
          content={resource.content}
        />
      ) : (
        <FullScreenViewer
          open={open}
          onClose={() => setOpen(false)}
          title={resource.title}
          html={resource.content}
          resourceId={resource.id}
          resourceType={resource.type}
        />
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Delete resource"
        message={`Are you sure you want to delete "${resource.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={async () => {
          setDeleting(true)
          try {
            const res = await fetch(`/api/resources/${resource.id}?type=${resource.type}`, { method: 'DELETE' })
            if (res.ok) {
              onDelete?.(resource.id)
            }
          } finally {
            setDeleting(false)
            setConfirmOpen(false)
          }
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  )
}
