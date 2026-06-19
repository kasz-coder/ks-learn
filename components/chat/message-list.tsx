"use client"

import { useEffect, useLayoutEffect, useRef, useCallback } from "react"
import { ChatMessage } from "./chat-message"
import type { Message } from "@/lib/types"

type MessageListProps = {
  messages: Message[]
  streamingContent: string
  isThinking: boolean
  loadingMessages?: boolean
  workspaceId?: string
  onOpenLesson?: (title: string, html: string) => void
  onRetry?: (messageContent: string) => void
  onDelete?: (messageId: string) => void
  onSend?: (message: string) => void
  hasMore?: boolean
  loadingMore?: boolean
  onLoadMore?: () => void
}

const suggestions = [
  "Create a lesson about Python basics",
  "Explain quantum computing",
  "Create a roadmap for learning web development",
]

export function MessageList({ messages, streamingContent, isThinking, loadingMessages, workspaceId, onOpenLesson, onRetry, onDelete, onSend, hasMore, loadingMore, onLoadMore }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const prevMessagesLength = useRef(messages.length)
  const isAtBottom = useRef(true)
  const prevScrollHeightRef = useRef(0)

  const checkAtBottom = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    isAtBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onScroll = () => checkAtBottom()
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [checkAtBottom])

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return

    const prevLen = prevMessagesLength.current
    prevMessagesLength.current = messages.length

    if (messages.length > prevLen) {
      const added = messages.length - prevLen
      const isPrepend = added <= 10
      if (isPrepend && prevLen > 0) {
        const heightDiff = el.scrollHeight - prevScrollHeightRef.current
        el.scrollTop = el.scrollTop + heightDiff
        prevScrollHeightRef.current = el.scrollHeight
        return
      }
    }

    prevScrollHeightRef.current = el.scrollHeight

    if (isAtBottom.current || messages.length <= prevLen) {
      bottomRef.current?.scrollIntoView({ behavior: messages.length <= prevLen ? "instant" : "smooth" })
    }
  }, [messages])

  useEffect(() => {
    if (streamingContent && isAtBottom.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [streamingContent])

  return (
    <div ref={containerRef} role="log" aria-live="polite" className="flex-1 overflow-y-auto px-3 py-3 sm:px-4 sm:py-4">
      {hasMore && (
        <div className="flex justify-center pb-3">
          <button
            onClick={onLoadMore}
            disabled={loadingMore}
            className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-500 transition-colors hover:border-zinc-300 hover:text-zinc-700 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-200"
          >
            {loadingMore ? (
              <span className="flex items-center gap-2">
                <svg className="size-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Loading...
              </span>
            ) : (
              'Load earlier messages'
            )}
          </button>
        </div>
      )}

      {messages.length === 0 && !streamingContent && !loadingMessages && (
        <div className="flex h-full items-center justify-center">
          <div className="text-center px-4 max-w-md">
            <div className="text-4xl mb-3">📚</div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Start learning</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 mb-5">Tell me what you want to learn about</p>
            <div className="flex flex-col gap-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => onSend?.(suggestion)}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-700 transition-all hover:border-zinc-300 hover:bg-white hover:text-zinc-900 active:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {messages.map((msg, i) => {
        const handleRetry = onRetry
          ? msg.role === 'assistant'
            ? () => {
                const userMsg = messages.slice(0, i).reverse().find(m => m.role === 'user')
                if (userMsg) onRetry(userMsg.content)
              }
            : msg.error
              ? () => onRetry(msg.content)
              : undefined
          : undefined

        return (
          <ChatMessage
            key={msg.id}
            role={msg.role}
            content={msg.content}
            workspaceId={workspaceId}
            onOpenLesson={onOpenLesson}
            onRetry={handleRetry}
            onDelete={onDelete ? () => onDelete(msg.id) : undefined}
            error={msg.error}
            timestamp={msg.timestamp}
          />
        )
      })}
      {(isThinking || streamingContent) && (
        <div className="flex justify-start mb-2">
          <div className="max-w-[85%] sm:max-w-[75%]">
            <div className="px-3 py-2 rounded-2xl rounded-bl-md bg-white border border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 sm:px-4 sm:py-2.5">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:0.3s]" />
              </div>
            </div>
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  )
}
