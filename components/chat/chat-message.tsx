'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Attachment } from '@/lib/types'
import { IframePreview } from '@/components/iframe-preview'
import { stripAIWrapper } from '@/lib/blocks'
import { ConfirmDialog } from '@/components/confirm-dialog'

type ChatMessageProps = {
  role: string
  content: string
  workspaceId?: string
  onOpenLesson?: (title: string, html: string) => void
  onRetry?: () => void
  onDelete?: () => void
  error?: boolean
  timestamp?: string
}

const variantStyles = {
  default:
    'border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-200',
  delete:
    'border-zinc-200 bg-white text-zinc-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-red-950 dark:hover:text-red-400 dark:hover:border-red-800',
  error:
    'border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400 dark:hover:bg-red-900',
} as const

function ActionButton({
  icon,
  onClick,
  label,
  variant = 'default',
  ariaLabel,
}: {
  icon: React.ReactNode
  onClick: () => void
  label: string
  variant?: keyof typeof variantStyles
  ariaLabel?: string
}) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel ?? label}
      className={`flex items-center gap-1 rounded-md border px-2 py-1 text-xs shadow-sm transition-colors ${variantStyles[variant]}`}
    >
      {icon}
      {label}
    </button>
  )
}

function formatTime(ts: string) {
  const d = new Date(ts)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const sameDay = d.toDateString() === now.toDateString()
  if (diff < 60000) return 'Just now'
  if (sameDay) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export function ChatMessage({ role, content, workspaceId, onOpenLesson, onRetry, onDelete, error, timestamp }: ChatMessageProps) {
  const router = useRouter()
  const [hovered, setHovered] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'delete' | 'retry' | null>(null)
  const cleaned = stripAIWrapper(content)
  const blockRe = /(:::?(?:lesson|reference|record|roadmap)\[[^\]]*\][ \t]*\n?[\s\S]*?(?:::(?=\n|$)|<\/html>\s*\n?\[(?:\/lesson|\/reference|\/roadmap)\]|<\/html>\s*$))/g
  const parts = cleaned.split(blockRe)

  const attachments: Attachment[] = []
  const roadmapCards: { title: string; stepCount: number }[] = []
  const textParts: string[] = []

  for (const part of parts) {
    const lessonMatch = part.match(/^:::?lesson\[([^\]]*)\][ \t]*\n?([\s\S]*?)(?:::$|<\/html>\s*\n?\[\/lesson\]$|<\/html>\s*$)/)
    const refMatch = part.match(/^:::?reference\[([^\]]*)\][ \t]*\n?([\s\S]*?)(?:::$|<\/html>\s*\n?\[\/reference\]$|<\/html>\s*$)/)
    const recordMatch = part.match(/^:::?record\[([^\]]*)\][ \t]*\n?([\s\S]*?):::$/)
    const roadmapMatch = part.match(/^:::?roadmap\[([^\]]*)\][ \t]*\n?([\s\S]*?):::$/)
    const userRoadmapMatch = part.match(/^roadmap\[([^\]]*)\]\n([\s\S]*)$/)

    if (lessonMatch || refMatch) {
      const title = (lessonMatch || refMatch)![1]
      const html = (lessonMatch || refMatch)![2]
      attachments.push({ title, html, type: lessonMatch ? 'lesson' : 'reference' })
    } else if (recordMatch) {
      const title = recordMatch[1]
      const recordContent = recordMatch[2].trim()
      attachments.push({ title, html: recordContent, type: 'record' })
    } else if (roadmapMatch || userRoadmapMatch) {
      const title = (roadmapMatch || userRoadmapMatch)![1]
      const content = (roadmapMatch || userRoadmapMatch)![2]
      let stepCount = 0
      try {
        const parsed = JSON.parse(content)
        stepCount = parsed.steps?.length || 0
      } catch { console.warn("Failed to parse roadmap JSON", title) }
      roadmapCards.push({ title, stepCount })
    } else if (part.trim() && part.trim() !== ':::') {
      const cleaned = part.trim().replace(/^:{1,3}\s*|\s*:{1,3}$/g, '').trim()
      if (cleaned) textParts.push(cleaned)
    }
  }

  const text = textParts.join('\n')

  return (
    <div
      className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'} mb-2 sm:mb-3 group`}
      role="article"
      aria-label={`${role === 'user' ? 'Your' : 'Assistant'} message`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className={`max-w-[85%] sm:max-w-[75%] relative`}>
        {text && (
          <div
            className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-2xl break-words text-[0.9375rem] leading-relaxed ${
              role === 'user'
                ? error
                  ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded-br-md ring-1 ring-red-300 dark:ring-red-700'
                  : 'bg-zinc-900 text-white dark:bg-zinc-700 rounded-br-md'
                : 'bg-white border border-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 rounded-bl-md'
            }`}
          >
            <div className="text-sm whitespace-pre-wrap">{text}</div>
            {timestamp && (
              <div className={`mt-1 text-[0.6875rem] ${role === 'user' ? 'text-white/60 dark:text-white/50' : 'text-zinc-400 dark:text-zinc-500'}`}>
                {formatTime(timestamp)}
              </div>
            )}
          </div>
        )}

        {roadmapCards.map((card, i) => (
          <button
            key={`rm-${i}`}
            onClick={() => workspaceId && router.push(`/workspaces/${workspaceId}/roadmap`)}
            className="mt-1 inline-flex items-center gap-1.5 text-sm text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 underline underline-offset-2 transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
            </svg>
            View Roadmap: {card.title}
          </button>
        ))}

        {attachments.length > 0 && (
          <div role="list" aria-label="Attachments">
            {attachments.map((att, i) => {
              const isRecord = att.type === 'record'

              const icon = att.type === 'lesson' ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>
              ) : isRecord ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
              )

              if (isRecord) {
                return (
                  <div
                    key={i}
                    role="listitem"
                    className="mt-2 w-full rounded-xl border transition-all duration-150 overflow-hidden bg-purple-50 border-purple-200 dark:bg-purple-950 dark:border-purple-800"
                  >
                    <div className="flex items-center gap-3 p-3">
                      <div className="shrink-0 p-2 rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400">
                        {icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{att.title}</div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">Learning Record</div>
                      </div>
                    </div>
                    <div className="border-t border-purple-200/50 dark:border-purple-800/50 px-3 pb-3">
                      <div className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">{att.html}</div>
                    </div>
                  </div>
                )
              }

              return (
                <button
                  key={i}
                  role="listitem"
                  onClick={() => onOpenLesson?.(att.title, att.html)}
                  aria-label={att.type === 'lesson' ? `Open lesson: ${att.title}` : `Open reference: ${att.title}`}
                  className={`mt-2 w-full rounded-xl border transition-all duration-150 text-left overflow-hidden ${
                    att.type === 'lesson'
                      ? 'bg-blue-50 border-blue-200 hover:bg-blue-100 hover:border-blue-300 dark:bg-blue-950 dark:border-blue-800 dark:hover:bg-blue-900'
                      : 'bg-green-50 border-green-200 hover:bg-green-100 hover:border-green-300 dark:bg-green-950 dark:border-green-800 dark:hover:bg-green-900'
                  }`}
                >
                  <div className="flex items-center gap-3 p-3">
                    <div className={`shrink-0 p-2 rounded-lg ${att.type === 'lesson' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400' : 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400'}`}>
                      {icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{att.title}</div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">{att.type === 'lesson' ? 'Lesson' : 'Reference'} · Click to open</div>
                    </div>
                    <svg className="w-4 h-4 text-zinc-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                  </div>
                  <div className="border-t border-current/10 h-28 overflow-hidden pointer-events-none relative">
                    <IframePreview html={att.html} />
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {role === 'assistant' && hovered && (onRetry || onDelete) && (
          <div className="absolute -bottom-8 left-0 flex items-center gap-1 z-10">
            {onRetry && (
              <ActionButton
                icon={
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                  </svg>
                }
                onClick={() => setConfirmAction('retry')}
                label="Retry"
                ariaLabel="Retry this message"
              />
            )}
            {onDelete && (
              <ActionButton
                icon={
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                }
                onClick={() => setConfirmAction('delete')}
                label="Delete"
                ariaLabel="Delete this message"
                variant="delete"
              />
            )}
          </div>
        )}

        {role === 'user' && (hovered || error) && (onDelete || (error && onRetry)) && (
          <div className={`absolute -bottom-8 ${error ? 'left-0' : 'right-0'} flex items-center gap-1 z-10`}>
            {error && onRetry && (
              <ActionButton
                icon={
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                  </svg>
                }
                onClick={() => setConfirmAction('retry')}
                label="Retry"
                ariaLabel="Retry failed message"
                variant="error"
              />
            )}
            {onDelete && (
              <ActionButton
                icon={
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                }
                onClick={() => setConfirmAction('delete')}
                label="Delete"
                ariaLabel="Delete this message"
                variant="delete"
              />
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmAction === 'delete'}
        title="Delete message"
        message="Are you sure you want to delete this message? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => { onDelete?.(); setConfirmAction(null) }}
        onCancel={() => setConfirmAction(null)}
      />

      <ConfirmDialog
        open={confirmAction === 'retry'}
        title="Retry message"
        message="This will remove the last assistant response and resend your message. Continue?"
        confirmLabel="Retry"
        variant="default"
        onConfirm={() => { onRetry?.(); setConfirmAction(null) }}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  )
}
