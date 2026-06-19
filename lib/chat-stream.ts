import type { Message } from "@/lib/types"
import {
  setSending,
  setStreamingActive,
  setStreamingContent,
  setStreamingError,
  setLastMessage,
  setAbortController,
} from "./chat-stream-store"

export function sendChatMessage(
  workspaceId: string,
  message: string,
  onMessagesUpdate: (updater: (prev: Message[]) => Message[]) => void,
): void {
  setLastMessage(workspaceId, message)
  setSending(workspaceId, true)
  setStreamingError(workspaceId, null)

  const tempUser: Message = {
    id: crypto.randomUUID(),
    role: "user",
    content: message,
  }
  onMessagesUpdate((prev) => [...prev, tempUser])

  let fullContent = ""
  const controller = new AbortController()
  setAbortController(workspaceId, controller)

  ;(async () => {
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, message }),
        signal: controller.signal,
      })

      if (!res.ok) {
        let detail = ""
        try {
          const body = await res.json()
          detail = body.error || body.message || ""
        } catch {}

        if (res.status === 429) {
          const retryAfter = res.headers.get("Retry-After")
          const seconds = retryAfter ? parseInt(retryAfter, 10) : 60
          throw new Error(`Rate limit exceeded. Please wait ${seconds} seconds.`)
        }
        throw new Error(detail || `Server error (${res.status})`)
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      setStreamingActive(workspaceId, true)

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6)
            if (data === "[DONE]") continue
            try {
              const parsed = JSON.parse(data)
              if (typeof parsed.content === "string") {
                fullContent += parsed.content
                setStreamingContent(workspaceId, fullContent)
              }
            } catch {}
          }
        }
      }

      const trimmed = fullContent.trim()
      const isSafetyResponse = /^(User Safety|Response Safety)\s*:\s*(safe|unsafe)/i.test(trimmed)
      const isEmptyResponse = trimmed.length === 0

      if (isSafetyResponse || isEmptyResponse) {
        setStreamingError(workspaceId, isSafetyResponse ? 'AI response was blocked by content filter. Please rephrase your message.' : 'AI returned an empty response. Please try again.')
        onMessagesUpdate((prev) => prev.filter((m) => m.id !== tempUser.id))
        setStreamingActive(workspaceId, false)
        setStreamingContent(workspaceId, "")
        return
      }

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: fullContent,
      }
      onMessagesUpdate((prev) => [...prev, assistantMsg])
      setStreamingActive(workspaceId, false)
      setStreamingContent(workspaceId, "")
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return

      const isNetwork = err instanceof TypeError
      const msg = isNetwork
        ? "Network error. Check your connection."
        : err instanceof Error
          ? err.message
          : "Failed to send message"
      setStreamingError(workspaceId, msg)

      if (fullContent) {
        const partialMsg: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: fullContent,
        }
        onMessagesUpdate((prev) => [...prev, partialMsg])
      }

      onMessagesUpdate((prev) =>
        prev.map((m) => (m.id === tempUser.id ? { ...m, error: true } : m))
      )
      setStreamingActive(workspaceId, false)
      setStreamingContent(workspaceId, "")
    } finally {
      setAbortController(workspaceId, null)
      setSending(workspaceId, false)
    }
  })()
}
