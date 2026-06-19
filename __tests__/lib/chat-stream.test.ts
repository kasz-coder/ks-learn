import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockStore = vi.hoisted(() => ({
  setSending: vi.fn(),
  setStreamingActive: vi.fn(),
  setStreamingContent: vi.fn(),
  setStreamingError: vi.fn(),
  setLastMessage: vi.fn(),
  setAbortController: vi.fn(),
}))

vi.mock('../../lib/chat-stream-store', () => mockStore)

import { sendChatMessage } from '@/lib/chat-stream'

function createSSEStream(...chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk))
      }
      controller.close()
    },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('sendChatMessage', () => {
  it('accumulates content from SSE events and ignores non-content events like saveStatus', async () => {
    vi.stubGlobal('crypto', { randomUUID: () => 'test-uuid' })

    const stream = createSSEStream(
      `data: ${JSON.stringify({ content: 'Hello' })}\n\n`,
      `data: ${JSON.stringify({ content: ' world' })}\n\n`,
      `data: ${JSON.stringify({ content: '\n\n:::record[Test]\n- Key: value\n:::' })}\n\n`,
      `data: ${JSON.stringify({ saveStatus: 'saved' })}\n\n`,
      'data: [DONE]\n\n',
    )

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      body: stream,
      headers: new Headers(),
    })
    vi.stubGlobal('fetch', mockFetch)

    const onMessagesUpdate = vi.fn()

    sendChatMessage('ws-1', 'test message', onMessagesUpdate)

    await vi.waitFor(() => {
      expect(mockStore.setSending).toHaveBeenLastCalledWith('ws-1', false)
    })

    const contentCalls = mockStore.setStreamingContent.mock.calls
    const contentArgs = contentCalls.map((c) => c[1])
    const nonEmptyContent = contentArgs.filter((c) => c !== '')
    expect(nonEmptyContent.length).toBeGreaterThan(0)

    const lastNonEmpty = nonEmptyContent[nonEmptyContent.length - 1]
    expect(lastNonEmpty).toBe('Hello world\n\n:::record[Test]\n- Key: value\n:::')
    expect(lastNonEmpty).not.toContain('undefined')

    const updateCalls = onMessagesUpdate.mock.calls
    expect(updateCalls.length).toBeGreaterThan(0)
    const allCallArgs: string[] = []
    for (const [updater] of updateCalls) {
      const result = updater([] as { id: string; role: string; content: string }[])
      for (const msg of result) {
        if (msg.role === 'assistant') {
          allCallArgs.push(msg.content)
        }
      }
    }
    const finalContent = allCallArgs[allCallArgs.length - 1] || ''
    expect(finalContent).toBe('Hello world\n\n:::record[Test]\n- Key: value\n:::')
    expect(finalContent).not.toContain('undefined')
  })

  it('handles only content events without corruption', async () => {
    vi.stubGlobal('crypto', { randomUUID: () => 'test-uuid' })

    const stream = createSSEStream(
      `data: ${JSON.stringify({ content: ':::lesson[Test]\n<html>content</html>\n:::' })}\n\n`,
      `data: ${JSON.stringify({ saveStatus: 'saved' })}\n\n`,
      'data: [DONE]\n\n',
    )

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      body: stream,
      headers: new Headers(),
    })
    vi.stubGlobal('fetch', mockFetch)

    const onMessagesUpdate = vi.fn()
    sendChatMessage('ws-1', 'test', onMessagesUpdate)

    await vi.waitFor(() => {
      expect(mockStore.setSending).toHaveBeenLastCalledWith('ws-1', false)
    })

    const contentCalls = mockStore.setStreamingContent.mock.calls
    const contentArgs = contentCalls.map((c) => c[1])
    const nonEmptyContent = contentArgs.filter((c) => c !== '')
    expect(nonEmptyContent.length).toBeGreaterThan(0)

    const lastNonEmpty = nonEmptyContent[nonEmptyContent.length - 1]
    expect(lastNonEmpty).not.toContain('undefined')
    expect(lastNonEmpty).toContain(':::lesson[')
    expect(lastNonEmpty).toMatch(/:::$/m)
  })

  it('handles only content events without any non-content events', async () => {
    vi.stubGlobal('crypto', { randomUUID: () => 'test-uuid' })

    const stream = createSSEStream(
      `data: ${JSON.stringify({ content: 'Hello' })}\n\n`,
      `data: ${JSON.stringify({ content: ' world' })}\n\n`,
      'data: [DONE]\n\n',
    )

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      body: stream,
      headers: new Headers(),
    })
    vi.stubGlobal('fetch', mockFetch)

    const onMessagesUpdate = vi.fn()
    sendChatMessage('ws-1', 'test', onMessagesUpdate)

    await vi.waitFor(() => {
      expect(mockStore.setSending).toHaveBeenLastCalledWith('ws-1', false)
    })

    const contentCalls = mockStore.setStreamingContent.mock.calls
    const contentArgs = contentCalls.map((c) => c[1])
    const nonEmptyContent = contentArgs.filter((c) => c !== '')
    expect(nonEmptyContent.length).toBeGreaterThan(0)
    expect(nonEmptyContent[nonEmptyContent.length - 1]).toBe('Hello world')
    expect(nonEmptyContent[nonEmptyContent.length - 1]).not.toContain('undefined')
  })

  it('handles SSE events delimited across multiple chunks', async () => {
    vi.stubGlobal('crypto', { randomUUID: () => 'test-uuid' })

    const stream = createSSEStream(
      `data: ${JSON.stringify({ content: 'Hello' })}\n\ndata: ${JSON.stringify({ content: ' world' })}\n\n`,
      `data: ${JSON.stringify({ saveStatus: 'saved' })}\n\ndata: [DONE]\n\n`,
    )

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      body: stream,
      headers: new Headers(),
    })
    vi.stubGlobal('fetch', mockFetch)

    const onMessagesUpdate = vi.fn()
    sendChatMessage('ws-1', 'test', onMessagesUpdate)

    await vi.waitFor(() => {
      expect(mockStore.setSending).toHaveBeenLastCalledWith('ws-1', false)
    })

    const contentCalls = mockStore.setStreamingContent.mock.calls
    const contentArgs = contentCalls.map((c) => c[1])
    const nonEmptyContent = contentArgs.filter((c) => c !== '')
    expect(nonEmptyContent.length).toBeGreaterThan(0)
    expect(nonEmptyContent[nonEmptyContent.length - 1]).toBe('Hello world')
    expect(nonEmptyContent[nonEmptyContent.length - 1]).not.toContain('undefined')
  })

  it('handles abort without throwing', async () => {
    vi.stubGlobal('crypto', { randomUUID: () => 'test-uuid' })

    const abortError = new DOMException('The operation was aborted', 'AbortError')
    const mockFetch = vi.fn().mockRejectedValue(abortError)
    vi.stubGlobal('fetch', mockFetch)

    const onMessagesUpdate = vi.fn()
    sendChatMessage('ws-1', 'test abort', onMessagesUpdate)

    await vi.waitFor(() => {
      expect(mockStore.setSending).toHaveBeenLastCalledWith('ws-1', false)
    })

    expect(mockStore.setStreamingError).toHaveBeenCalledTimes(1)
    expect(mockStore.setStreamingError).toHaveBeenCalledWith('ws-1', null)
    expect(mockStore.setAbortController).toHaveBeenLastCalledWith('ws-1', null)
  })

  it('handles network error and flags temp user message', async () => {
    vi.stubGlobal('crypto', { randomUUID: () => 'test-uuid' })

    const mockFetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    vi.stubGlobal('fetch', mockFetch)

    const onMessagesUpdate = vi.fn()
    sendChatMessage('ws-1', 'test network error', onMessagesUpdate)

    await vi.waitFor(() => {
      expect(mockStore.setSending).toHaveBeenLastCalledWith('ws-1', false)
    })

    expect(mockStore.setStreamingError).toHaveBeenCalledWith('ws-1', 'Network error. Check your connection.')

    const hasErrorFlag = onMessagesUpdate.mock.calls.some(([updater]) => {
      const result = updater([{ id: 'test-uuid', role: 'user', content: 'test network error' }])
      return result.some((m: { error?: boolean }) => m.error)
    })
    expect(hasErrorFlag).toBe(true)
  })

  it('handles rate limit 429 with retry-after header', async () => {
    vi.stubGlobal('crypto', { randomUUID: () => 'test-uuid' })

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      headers: new Headers({ 'Retry-After': '30' }),
      json: () => Promise.resolve({}),
    })
    vi.stubGlobal('fetch', mockFetch)

    sendChatMessage('ws-1', 'test rate limit', vi.fn())

    await vi.waitFor(() => {
      expect(mockStore.setSending).toHaveBeenLastCalledWith('ws-1', false)
    })

    expect(mockStore.setStreamingError).toHaveBeenCalledWith(
      'ws-1',
      expect.stringContaining('Rate limit exceeded')
    )
    const errorMsg = mockStore.setStreamingError.mock.calls.find(
      (c: [string, string]) => c[0] === 'ws-1' && c[1] !== null
    )?.[1]
    expect(errorMsg).toContain('30')
  })

  it('handles safety response by removing temp message', async () => {
    vi.stubGlobal('crypto', { randomUUID: () => 'test-uuid' })

    const stream = createSSEStream(
      `data: ${JSON.stringify({ content: 'User Safety : safe' })}\n\n`,
      'data: [DONE]\n\n',
    )

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      body: stream,
      headers: new Headers(),
    })
    vi.stubGlobal('fetch', mockFetch)

    const onMessagesUpdate = vi.fn()
    sendChatMessage('ws-1', 'test safety', onMessagesUpdate)

    await vi.waitFor(() => {
      expect(mockStore.setSending).toHaveBeenLastCalledWith('ws-1', false)
    })

    expect(mockStore.setStreamingError).toHaveBeenCalledWith(
      'ws-1',
      'AI response was blocked by content filter. Please rephrase your message.'
    )
    expect(mockStore.setStreamingActive).toHaveBeenLastCalledWith('ws-1', false)
    expect(mockStore.setStreamingContent).toHaveBeenLastCalledWith('ws-1', '')
  })

  it('handles empty response with error', async () => {
    vi.stubGlobal('crypto', { randomUUID: () => 'test-uuid' })

    const stream = createSSEStream('data: [DONE]\n\n')

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      body: stream,
      headers: new Headers(),
    })
    vi.stubGlobal('fetch', mockFetch)

    sendChatMessage('ws-1', 'test empty', vi.fn())

    await vi.waitFor(() => {
      expect(mockStore.setSending).toHaveBeenLastCalledWith('ws-1', false)
    })

    expect(mockStore.setStreamingError).toHaveBeenCalledWith(
      'ws-1',
      'AI returned an empty response. Please try again.'
    )
  })
})
