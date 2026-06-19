import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCreateSupabaseClient = vi.hoisted(() => vi.fn())
const mockCheckRateLimit = vi.hoisted(() => vi.fn())
const mockParseBlocks = vi.hoisted(() => vi.fn())
const mockBuildContext = vi.hoisted(() => vi.fn())
const mockCreateChatCompletion = vi.hoisted(() => vi.fn())
const mockLogBlockSave = vi.hoisted(() => vi.fn())
const mockLogLlmCall = vi.hoisted(() => vi.fn())
const mockLogLlmResponse = vi.hoisted(() => vi.fn())
const mockSlugify = vi.hoisted(() => vi.fn((s: string) => s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')))

vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((body, init) => {
      const headers = new Headers(init?.headers)
      return new Response(JSON.stringify(body), { status: init?.status ?? 200, headers })
    }),
  },
}))

vi.mock('@/lib/openai', () => ({
  openrouter: {
    chat: {
      completions: {
        create: mockCreateChatCompletion,
      },
    },
  },
  TEACH_SYSTEM_PROMPT: 'You are a helpful tutor.',
  MODEL: 'agnes-2.0-flash',
}))

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: mockCheckRateLimit,
}))

vi.mock('@/lib/context', () => ({
  buildContext: mockBuildContext,
}))

vi.mock('@/lib/blocks', () => ({
  slugify: mockSlugify,
  stripHtml: vi.fn((s: string) => s.replace(/<[^>]*>/g, '')),
  parseBlocks: mockParseBlocks,
}))

vi.mock('@/lib/logger', () => ({
  logLlmCall: mockLogLlmCall,
  logLlmResponse: mockLogLlmResponse,
  logBlockSave: mockLogBlockSave,
}))

vi.mock('@/lib/env', () => ({
  validateEnv: vi.fn(),
}))

vi.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: mockCreateSupabaseClient,
}))

vi.mock('@/lib/web-search', () => ({
  searchWeb: vi.fn(),
  formatSearchContext: vi.fn(),
  WEB_SEARCH_TOOL: { type: 'function', function: { name: 'web_search', description: 'Search the web' } },
}))

import { POST } from '@/app/api/chat/route'

function buildSupabaseChain(data: unknown) {
  const chain: Record<string, unknown> = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    single: vi.fn(() => Promise.resolve(data)),
    maybeSingle: vi.fn(() => Promise.resolve(data)),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    insert: vi.fn(() => Promise.resolve()),
    update: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve()) })),
    rpc: vi.fn(() => Promise.resolve()),
  }
  return chain
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/chat', () => {
  it('saves lesson, record, and roadmap blocks after streaming completes', async () => {
    const workspaceId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
    const fullContent =
      'Some explanation.\n\n' +
      ':::lesson[Arrays & Objects Simplified]\n<html><body><p>Content</p></body></html>\n:::\n\n' +
      ':::record[What Was Learned]\n- Key insight: Arrays are lists\n:::\n\n' +
      ':::roadmap[Learning Path: JS]\n{"goal":"Learn JS","steps":[{"order":1,"title":"Basics","description":"","status":"upcoming"}]}\n:::'

    const supabaseData: Record<string, unknown> = {
      workspaces: { data: { id: workspaceId, topic: 'JavaScript', mission: null } },
      chat_messages: { data: [] },
      lessons: { data: [] },
      references_doc: { data: [] },
      learning_records: { data: [] },
      roadmaps: { data: [] },
      user_settings: { data: null },
    }

    const supabaseChains = new Map<string, Record<string, unknown>>()
    for (const [table, data] of Object.entries(supabaseData)) {
      supabaseChains.set(table, buildSupabaseChain(data))
    }

    const mockRpc = vi.fn(() => Promise.resolve())

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1', email: 'test@test.com' } } }),
      },
      from: vi.fn((table: string) => {
        return supabaseChains.get(table) ?? buildSupabaseChain(null)
      }),
      rpc: mockRpc,
    }

    mockCreateSupabaseClient.mockResolvedValue(mockSupabase as never)
    mockCheckRateLimit.mockReturnValue({ allowed: true })
    mockBuildContext.mockReturnValue([{ role: 'system', content: 'context' }])

    mockParseBlocks.mockReturnValue({
      lessons: [{ title: 'Arrays & Objects Simplified', content: '<html><body><p>Content</p></body></html>' }],
      references: [],
      learningRecords: [{ title: 'What Was Learned', content: '- Key insight: Arrays are lists' }],
      roadmaps: [{ title: 'Learning Path: JS', content: '{"goal":"Learn JS","steps":[{"order":1,"title":"Basics","description":"","status":"upcoming"}]}' }],
    })

    mockCreateChatCompletion.mockResolvedValue({
      choices: [
        {
          message: { content: fullContent, tool_calls: null },
          finish_reason: 'stop',
        },
      ],
    })

    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId, message: 'Teach me about arrays' }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('text/event-stream')

    const reader = response.body!.getReader()
    const decoder = new TextDecoder()
    let allData = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      allData += decoder.decode(value, { stream: true })
    }

    expect(allData).toContain('"content"')
    expect(allData).toContain('"saveStatus"')

    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      'upsert_lesson_with_version',
      expect.objectContaining({
        p_workspace_id: workspaceId,
        p_title: 'Arrays & Objects Simplified',
      }),
    )

    const learningRecordFromCalls = vi.mocked(mockSupabase.from).mock.calls
    const learningRecordInserts = learningRecordFromCalls.filter(([t]) => t === 'learning_records')
    expect(learningRecordInserts.length).toBeGreaterThan(0)

    expect(mockLogBlockSave).toHaveBeenCalledWith(
      expect.objectContaining({ blockType: 'lesson', success: true }),
    )
    expect(mockLogBlockSave).toHaveBeenCalledWith(
      expect.objectContaining({ blockType: 'learning_record', success: true }),
    )
  })

  it('returns 401 when user is not authenticated', async () => {
    mockCreateSupabaseClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as never)

    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId: '00000000-0000-0000-0000-000000000003', message: 'test' }),
    })

    const response = await POST(request)
    expect(response.status).toBe(401)
  })

  it('returns 400 for invalid request body', async () => {
    mockCreateSupabaseClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-3' } } }) },
    } as never)

    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  it('returns 429 when rate limited', async () => {
    mockCreateSupabaseClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-4' } } }) },
    } as never)

    mockCheckRateLimit.mockReturnValue({ allowed: false, retryAfter: 30 })

    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId: '00000000-0000-0000-0000-000000000004', message: 'test' }),
    })

    const response = await POST(request)
    expect(response.status).toBe(429)
  })
})
