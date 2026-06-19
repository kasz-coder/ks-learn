"use client"

import { use, useEffect, useState, useCallback } from "react"
import { MessageList } from "@/components/chat/message-list"
import { MessageInput } from "@/components/chat/message-input"
import { ErrorBoundary } from "@/components/error-boundary"
import { WorkspaceTabs } from "@/components/workspace/workspace-tabs"
import { useChatStream } from "@/hooks/use-chat-stream"
import { sendChatMessage } from "@/lib/chat-stream"
import { clearStream, getLastMessage } from "@/lib/chat-stream-store"
import { injectQuizScript } from "@/lib/quiz-inject"
import { injectSharedStyles } from "@/lib/shared-styles"
import type { Message } from "@/lib/types"

type LessonViewer = {
  title: string
  html: string
}

const PAGE_SIZE = 10

export default function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [messages, setMessages] = useState<Message[]>([])
  const [viewer, setViewer] = useState<LessonViewer | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadingMessages, setLoadingMessages] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  const { streamingContent, sending, error: streamError } = useChatStream(id)
  const isThinking = sending && !streamingContent

  useEffect(() => {
    setLoadingMessages(true)
    setMessages([])
    setHasMore(true)
  }, [id])

  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/workspaces/${id}/messages?limit=${PAGE_SIZE}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch")
        return res.json()
      })
      .then((data) => {
        setMessages(data.messages)
        setHasMore(data.total > PAGE_SIZE)
        setLoadingMessages(false)
      })
      .catch((e) => {
        if (e.name !== 'AbortError') {
          setError("Failed to load messages")
          setLoadingMessages(false)
        }
      })
    return () => controller.abort()
  }, [id])

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const res = await fetch(`/api/workspaces/${id}/messages?limit=${PAGE_SIZE}&offset=${messages.length}`)
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setMessages((prev) => [...data.messages, ...prev])
      setHasMore(data.messages.length === PAGE_SIZE)
    } catch {
      setError("Failed to load earlier messages")
    } finally {
      setLoadingMore(false)
    }
  }, [id, messages.length, loadingMore, hasMore])

  useEffect(() => {
    if (!error && !streamError) return
    const t = setTimeout(() => {
      setError(null)
      clearStream(id)
    }, 8000)
    return () => clearTimeout(t)
  }, [error, streamError, id])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = viewer ? "hidden" : ""
    return () => { document.body.style.overflow = prev }
  }, [viewer])

  const handleSend = useCallback(
    (message: string) => {
      setError(null)
      sendChatMessage(id, message, setMessages)
    },
    [id],
  )

  const handleRetry = useCallback(
    (userMessage: string) => {
      setError(null)
      setMessages((prev) => {
        const lastAssistantIdx = [...prev].reverse().findIndex((m) => m.role === 'assistant')
        if (lastAssistantIdx === -1) return prev
        const realIdx = prev.length - 1 - lastAssistantIdx
        const userBefore = [...prev].reverse().findIndex((m, ri) => ri > lastAssistantIdx && m.role === 'user')
        if (userBefore === -1) return prev
        const userIdx = prev.length - 1 - userBefore
        return prev.slice(0, userIdx)
      })
      sendChatMessage(id, userMessage, setMessages)
    },
    [id],
  )

  const handleDelete = useCallback(
    async (messageId: string) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId))
      try {
        await fetch(`/api/workspaces/${id}/messages`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messageIds: [messageId] }),
        })
      } catch {
        setError("Failed to delete message")
      }
    },
    [id],
  )

  const retryMessage = streamError ? getLastMessage(id) : null

  return (
    <ErrorBoundary>
      <div className="flex h-full flex-col">
        <WorkspaceTabs workspaceId={id} />

        {error && (
          <div role="alert" className="mx-3 mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400 sm:mx-4">
            {error}
          </div>
        )}
        {streamError && (
          <div role="alert" className="mx-3 mt-2 flex items-center gap-3 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-700 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-400 sm:mx-4">
            <span className="flex-1">{streamError}</span>
            {retryMessage && (
              <button
                onClick={() => handleSend(retryMessage)}
                className="shrink-0 rounded-md border border-current px-2.5 py-1 text-xs font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/10"
              >
                Retry
              </button>
            )}
          </div>
        )}

        <div className="flex flex-1 flex-col overflow-hidden bg-white dark:bg-zinc-800">
          {loadingMessages ? (
            <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-4">
              <div className="mb-5 flex justify-start">
                <div className="flex flex-col gap-2.5 max-w-[75%]">
                  <div className="h-3 rounded-lg bg-zinc-200/60 dark:bg-zinc-700/50 w-56 animate-pulse-soft" />
                  <div className="h-3 rounded-lg bg-zinc-200/60 dark:bg-zinc-700/50 w-40 animate-pulse-soft" />
                  <div className="h-3 rounded-lg bg-zinc-200/60 dark:bg-zinc-700/50 w-48 animate-pulse-soft" />
                </div>
              </div>
              <div className="mb-5 flex justify-end">
                <div className="flex flex-col gap-2.5 max-w-[75%]">
                  <div className="h-3 rounded-lg bg-zinc-200/60 dark:bg-zinc-700/50 w-44 animate-pulse-soft" />
                  <div className="h-3 rounded-lg bg-zinc-200/60 dark:bg-zinc-700/50 w-36 animate-pulse-soft" />
                </div>
              </div>
              <div className="mb-5 flex justify-start">
                <div className="flex flex-col gap-2.5 max-w-[75%]">
                  <div className="h-3 rounded-lg bg-zinc-200/60 dark:bg-zinc-700/50 w-52 animate-pulse-soft" />
                  <div className="h-3 rounded-lg bg-zinc-200/60 dark:bg-zinc-700/50 w-32 animate-pulse-soft" />
                </div>
              </div>
              <div className="flex justify-end">
                <div className="flex flex-col gap-2.5 max-w-[75%]">
                  <div className="h-3 rounded-lg bg-zinc-200/60 dark:bg-zinc-700/50 w-40 animate-pulse-soft" />
                </div>
              </div>
            </div>
          ) : (
            <MessageList
              messages={messages}
              streamingContent={streamingContent}
              isThinking={isThinking}
              loadingMessages={loadingMessages}
              workspaceId={id}
              onOpenLesson={(title, html) => setViewer({ title, html })}
              onRetry={handleRetry}
              onDelete={handleDelete}
              onSend={handleSend}
              hasMore={hasMore}
              loadingMore={loadingMore}
              onLoadMore={loadMore}
            />
          )}
          <MessageInput onSend={handleSend} disabled={sending} retryMessage={retryMessage} />
        </div>
      </div>

      {/* Full-screen lesson viewer */}
      {viewer && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-700 px-4 py-3 shrink-0">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate pr-4">{viewer.title}</h2>
            <button
              onClick={() => setViewer(null)}
              aria-label="Close lesson viewer"
              className="rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shrink-0"
            >
              Close
            </button>
          </div>
          <iframe
            srcDoc={injectQuizScript(injectSharedStyles(viewer.html))}
            className="flex-1 w-full border-0"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      )}
    </ErrorBoundary>
  )
}
