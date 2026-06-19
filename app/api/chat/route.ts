import { NextResponse } from 'next/server'
import { openrouter, TEACH_SYSTEM_PROMPT, MODEL } from '@/lib/openai'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { checkRateLimit } from '@/lib/rate-limit'
import { buildContext, type ContextMessage } from '@/lib/context'
import { slugify, stripHtml, parseBlocks } from '@/lib/blocks'
import { logLlmCall, logLlmResponse, logBlockSave } from '@/lib/logger'
import { searchWeb, formatSearchContext, WEB_SEARCH_TOOL } from '@/lib/web-search'
import { z } from 'zod'

type SupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>

async function upsertRoadmap(supabase: SupabaseClient, workspaceId: string, r: { title: string; content: string }) {
  let parsed: { goal?: string; steps?: unknown[] }
  try { parsed = JSON.parse(r.content) } catch { return }
  const existing = await supabase.from('roadmaps').select('id').eq('workspace_id', workspaceId).maybeSingle()
  if (existing.data) {
    await supabase.from('roadmaps').update({ title: r.title, goal: parsed.goal || '', steps: parsed.steps || [], updated_at: new Date().toISOString() }).eq('id', existing.data.id)
  } else {
    await supabase.from('roadmaps').insert({ workspace_id: workspaceId, title: r.title, goal: parsed.goal || '', steps: parsed.steps || [] })
  }
}

const MAX_MESSAGE_LENGTH = 10_000
const RECENT_HISTORY_WINDOW = 10
const SUMMARY_INPUT_TRUNCATION = 500
const SUMMARY_CONTEXT_TRUNCATION = 300
const SUMMARY_MAX_TOKENS = 300
const HISTORY_FETCH_LIMIT = 500
const REFERENCE_LIMIT = 5
const RECORDS_LIMIT = 10
const LESSON_SUMMARY_LENGTH = 200

const chatRequestSchema = z.object({
  workspaceId: z.string().uuid(),
  message: z.string().min(1, 'Message cannot be empty').max(MAX_MESSAGE_LENGTH, `Message must be ${MAX_MESSAGE_LENGTH} characters or less`),
})

const SUMMARY_INTERVAL = 25

const SUMMARY_PROMPT = `Summarize the key points of this learning conversation in 2-3 sentences. Cover: what topic is being studied, what has been covered, the learner's current level, and any open questions. Be concise.`

async function generateSummary(
  history: ContextMessage[],
  existing: string | null,
  userId?: string,
  workspaceId?: string,
): Promise<string> {
  const recent = history.slice(-RECENT_HISTORY_WINDOW).map(m => `${m.role}: ${m.content.slice(0, SUMMARY_INPUT_TRUNCATION)}`).join('\n')
  const input = existing
    ? `Previous summary: ${existing}\n\nRecent conversation:\n${recent}`
    : `Conversation:\n${history.map(m => `${m.role}: ${m.content.slice(0, SUMMARY_CONTEXT_TRUNCATION)}`).join('\n')}`

  const start = Date.now()
  logLlmCall({ userId, workspaceId, model: MODEL, messageCount: history.length, type: 'summary' })

  try {
    const res = await openrouter.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: SUMMARY_PROMPT },
        { role: 'user', content: input },
      ],
      max_tokens: SUMMARY_MAX_TOKENS,
    })
    const content = res.choices[0]?.message?.content || existing || ''
    logLlmResponse({ userId, workspaceId, model: MODEL, type: 'summary', durationMs: Date.now() - start, contentLength: content.length })
    return content
  } catch (err: unknown) {
    logLlmResponse({ userId, workspaceId, model: MODEL, type: 'summary', durationMs: Date.now() - start, error: err instanceof Error ? err.message : String(err) })
    return existing || ''
  }
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient(request)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { allowed, retryAfter } = checkRateLimit(user.id)
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(retryAfter) } })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = chatRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }
  const { workspaceId, message } = parsed.data

  const { data: ws } = await supabase
    .from('workspaces')
    .select('*')
    .eq('id', workspaceId)
    .eq('user_id', user.id)
    .single()

  if (!ws) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await supabase.from('chat_messages').insert({ workspace_id: workspaceId, role: 'user', content: message })

  const userRoadmaps = parseBlocks(message).roadmaps
  for (const r of userRoadmaps) {
    await upsertRoadmap(supabase, workspaceId, r)
  }

  const { data: history } = await supabase
    .from('chat_messages')
    .select('role, content')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: true })
    .limit(HISTORY_FETCH_LIMIT)

  const [lessonsRes, refsRes, recordsRes, roadmapsRes] = await Promise.all([
    supabase.from('lessons').select('title, content').eq('workspace_id', workspaceId).order('order'),
    supabase.from('references_doc').select('title, content').eq('workspace_id', workspaceId).order('created_at', { ascending: false }).limit(REFERENCE_LIMIT),
    supabase.from('learning_records').select('title, content').eq('workspace_id', workspaceId).order('created_at', { ascending: false }).limit(RECORDS_LIMIT),
    supabase.from('roadmaps').select('title, goal, steps').eq('workspace_id', workspaceId).limit(1),
  ])

  const lessons = (lessonsRes.data || []).map(l => ({ title: l.title, summary: stripHtml(l.content).slice(0, LESSON_SUMMARY_LENGTH) }))
  const references = (refsRes.data || []).map(r => ({ title: r.title, content: r.content }))
  const learningRecords = (recordsRes.data || []).map(r => ({ title: r.title, content: r.content }))
  const roadmaps = (roadmapsRes.data || []).map(r => ({ title: r.title, content: JSON.stringify({ goal: r.goal, steps: r.steps }) }))

  const historyMessages = (history || []).map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))

  const wsData = ws as { topic: string; mission: string | null; context_summary?: string | null; summary_message_count?: number | null }
  const messageCount = historyMessages.length
  const lastSummaryMsgCount = wsData.summary_message_count ?? 0
  let conversationSummary: string | null = wsData.context_summary ?? null

  if (messageCount >= SUMMARY_INTERVAL && (messageCount - lastSummaryMsgCount) >= SUMMARY_INTERVAL) {
    conversationSummary = await generateSummary(historyMessages, conversationSummary, user.id, workspaceId)
    if (conversationSummary) {
      try {
        await supabase
          .from('workspaces')
          .update({ context_summary: conversationSummary, summary_message_count: messageCount })
          .eq('id', workspaceId)
      } catch {
        // columns may not exist yet — summarization is additive
      }
    }
  }

  const { data: userSettings } = await supabase
    .from('user_settings')
    .select('language')
    .eq('user_id', user.id)
    .maybeSingle()

  const language = userSettings?.language || 'English'
  const langInstruction = language === 'English'
    ? ''
    : `\n\n## Language\nIMPORTANT: Always respond in ${language}. The user has set their preferred language to ${language}. All your responses, including lessons, references, and records, MUST be written entirely in ${language}.`

  const messages = buildContext(
    TEACH_SYSTEM_PROMPT + langInstruction,
    { topic: ws.topic, mission: ws.mission, lessons, references, learningRecords, roadmaps, conversationSummary },
    historyMessages,
  )

  const encoder = new TextEncoder()
  const llmStart = Date.now()
  let fullContent = ''

  logLlmCall({ userId: user.id, workspaceId, model: MODEL, messageCount: historyMessages.length, type: 'chat' })

  const tryStream = async (msgs: typeof messages): Promise<ReadableStream | null> => {
    try {
      return await openrouter.chat.completions.create({ model: MODEL, messages: msgs, stream: true }) as AsyncIterable<{ choices: { delta: { content?: string | null } }[] }>
    } catch {
      return null
    }
  }

  let stream: AsyncIterable<{ choices: { delta: { content?: string | null } }[] }> | null = null

  try {
    const phase1 = await openrouter.chat.completions.create({
      model: MODEL,
      messages,
      tools: [WEB_SEARCH_TOOL],
      tool_choice: 'auto',
      parallel_tool_calls: false,
      stream: false,
    })

    const choice = phase1.choices[0]
    const toolCalls = choice.message.tool_calls

    if (choice.finish_reason === 'tool_calls' && toolCalls && toolCalls.length > 0) {
      for (const toolCall of toolCalls) {
        const args = JSON.parse(toolCall.function.arguments)
        const searchRes = await searchWeb(args.query)
        const result = searchRes ? formatSearchContext(searchRes) : 'Web search failed. Proceed without search results.'

        messages.push({ role: 'assistant', content: null, tool_calls: [toolCall] } as never)
        messages.push({ role: 'tool', tool_call_id: toolCall.id, content: result } as never)
      }

      stream = await tryStream(messages)
      if (!stream) {
        logLlmResponse({ userId: user.id, workspaceId, model: MODEL, type: 'chat', durationMs: Date.now() - llmStart, error: 'Phase 2 stream failed' })
        return NextResponse.json({ error: 'AI response failed' }, { status: 502 })
      }
    } else {
      fullContent = choice.message?.content || ''
    }
  } catch {
    // Tool calling not supported — fallback to direct streaming
    stream = await tryStream(messages)
    if (!stream) {
      logLlmResponse({ userId: user.id, workspaceId, model: MODEL, type: 'chat', durationMs: Date.now() - llmStart, error: 'LLM error' })
      return NextResponse.json({ error: 'AI response failed' }, { status: 502 })
    }
  }

  const readable = new ReadableStream({
    async start(controller) {
      if (stream) {
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content || ''
          fullContent += delta
          if (delta) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: delta })}\n\n`))
        }
      } else if (fullContent) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: fullContent })}\n\n`))
      }

      const trimmed = fullContent.trim()
      const isSafetyResponse = /^(User Safety|Response Safety)\s*:\s*(safe|unsafe)/i.test(trimmed)
      const isEmptyResponse = trimmed.length === 0

      logLlmResponse({
        userId: user.id,
        workspaceId,
        model: MODEL,
        type: 'chat',
        durationMs: Date.now() - llmStart,
        contentLength: fullContent.length,
        safetyFiltered: isSafetyResponse,
      })

      if (isSafetyResponse || isEmptyResponse) {
        if (isSafetyResponse) {
          console.error('OpenRouter safety filter triggered:', { userId: user.id, workspaceId, content: fullContent })
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
        return
      }

      let saveOk = true
      try {
        await supabase.from('chat_messages').insert({ workspace_id: workspaceId, role: 'assistant', content: fullContent })
      } catch (err: unknown) {
        saveOk = false
        const msg = err instanceof Error ? err.message : 'Unknown error'
        console.error('Failed to save assistant message:', { userId: user.id, workspaceId, msgLength: fullContent.length, error: msg })
      }

      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ saveStatus: saveOk ? 'saved' : 'failed' })}\n\n`))
      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      controller.close()

      if (!saveOk) return

      const { lessons, references, learningRecords, roadmaps } = parseBlocks(fullContent)
      const logErr = (label: string, err: unknown) =>
        console.error(`Failed to save ${label}:`, { userId: user.id, workspaceId, error: err instanceof Error ? err.message : err })

      await Promise.all([
        ...lessons.map(lesson =>
          supabase.rpc('upsert_lesson_with_version', {
            p_workspace_id: workspaceId,
            p_slug: slugify(lesson.title),
            p_title: lesson.title,
            p_content: lesson.content,
          }).then(() => { logBlockSave({ userId: user.id, workspaceId, blockType: 'lesson', title: lesson.title, success: true }) }, e => { logErr('lesson', e); logBlockSave({ userId: user.id, workspaceId, blockType: 'lesson', title: lesson.title, success: false, error: e instanceof Error ? e.message : String(e) }) })
        ),
        ...references.map(ref => {
          const slug = slugify(ref.title)
          return supabase.from('references_doc').select('id').eq('workspace_id', workspaceId).eq('slug', slug).maybeSingle()
            .then(async ({ data: existing }) => {
              if (existing) {
                await supabase.from('references_doc').update({ title: ref.title, content: ref.content }).eq('id', existing.id)
              } else {
                await supabase.from('references_doc').insert({ workspace_id: workspaceId, title: ref.title, slug, content: ref.content })
              }
              logBlockSave({ userId: user.id, workspaceId, blockType: 'reference', title: ref.title, success: true })
            }, e => { logErr('reference', e); logBlockSave({ userId: user.id, workspaceId, blockType: 'reference', title: ref.title, success: false, error: e instanceof Error ? e.message : String(e) }) })
        }),
        ...learningRecords.map(lr =>
          supabase.from('learning_records').insert({ workspace_id: workspaceId, title: lr.title, content: lr.content })
            .then(() => { logBlockSave({ userId: user.id, workspaceId, blockType: 'learning_record', title: lr.title, success: true }) }, e => { logErr('learning record', e); logBlockSave({ userId: user.id, workspaceId, blockType: 'learning_record', title: lr.title, success: false, error: e instanceof Error ? e.message : String(e) }) })
        ),
        ...roadmaps.map(r =>
          Promise.resolve(upsertRoadmap(supabase, workspaceId, r))
            .then(() => { logBlockSave({ userId: user.id, workspaceId, blockType: 'roadmap', title: r.title, success: true }) }, e => { logErr('roadmap', e); logBlockSave({ userId: user.id, workspaceId, blockType: 'roadmap', title: r.title, success: false, error: e instanceof Error ? e.message : String(e) }) })
        ),
      ])
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
  })
}
