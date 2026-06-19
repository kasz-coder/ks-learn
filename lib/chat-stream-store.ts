type Listener = () => void

type StreamState = {
  streaming: boolean
  streamingContent: string
  error: string | null
  sending: boolean
}

type WorkspaceStreams = {
  state: StreamState
  listeners: Set<Listener>
  abortController: AbortController | null
  lastMessage: string | null
  lastAccessed: number
}

const streams = new Map<string, WorkspaceStreams>()

const TTL_MS = 30 * 60 * 1000

function evictStaleEntries() {
  const now = Date.now()
  for (const [key, s] of streams) {
    if (now - s.lastAccessed > TTL_MS) {
      streams.delete(key)
    }
  }
}

if (typeof setInterval !== "undefined") {
  setInterval(evictStaleEntries, TTL_MS)
}

function getOrCreate(wsId: string): WorkspaceStreams {
  let s = streams.get(wsId)
  if (!s) {
    s = {
      state: { streaming: false, streamingContent: "", error: null, sending: false },
      listeners: new Set(),
      abortController: null,
      lastMessage: null,
      lastAccessed: Date.now(),
    }
    streams.set(wsId, s)
  }
  s.lastAccessed = Date.now()
  return s
}

function notify(wsId: string) {
  const s = streams.get(wsId)
  if (s) s.listeners.forEach((l) => l())
}

export function getStreamState(wsId: string): StreamState {
  return getOrCreate(wsId).state
}

export function subscribe(wsId: string, listener: Listener): () => void {
  const s = getOrCreate(wsId)
  s.listeners.add(listener)
  return () => {
    s.listeners.delete(listener)
  }
}

export function setSending(wsId: string, sending: boolean) {
  const s = getOrCreate(wsId)
  s.state.sending = sending
  notify(wsId)
}

export function setStreamingContent(wsId: string, content: string) {
  const s = getOrCreate(wsId)
  s.state.streamingContent = content
  notify(wsId)
}

export function setStreamingActive(wsId: string, active: boolean) {
  const s = getOrCreate(wsId)
  s.state.streaming = active
  notify(wsId)
}

export function setStreamingError(wsId: string, error: string | null) {
  const s = getOrCreate(wsId)
  s.state.error = error
  notify(wsId)
}

export function setLastMessage(wsId: string, message: string) {
  getOrCreate(wsId).lastMessage = message
}

export function setAbortController(wsId: string, controller: AbortController | null) {
  getOrCreate(wsId).abortController = controller
}

export function abortStream(wsId: string) {
  const s = streams.get(wsId)
  if (s?.abortController) {
    s.abortController.abort()
    s.abortController = null
  }
}

export function clearStream(wsId: string) {
  abortStream(wsId)
  const s = getOrCreate(wsId)
  s.state = { streaming: false, streamingContent: "", error: null, sending: false }
  notify(wsId)
}

export function getLastMessage(wsId: string): string | null {
  return getOrCreate(wsId).lastMessage
}
