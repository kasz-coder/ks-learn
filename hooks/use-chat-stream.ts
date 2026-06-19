"use client"

import { useSyncExternalStore } from "react"
import { subscribe, getStreamState } from "@/lib/chat-stream-store"

export function useChatStream(workspaceId: string) {
  const state = useSyncExternalStore(
    (listener) => subscribe(workspaceId, listener),
    () => getStreamState(workspaceId),
    () => getStreamState(workspaceId),
  )

  return state
}
