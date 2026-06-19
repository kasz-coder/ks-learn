const CHARS_PER_TOKEN = 3.5
const DEFAULT_BUDGET = 24_000
const STATE_BLOCK_TRUNCATION = 200
const MIN_TRUNCATED_LENGTH = 50
const TRUNCATION_THRESHOLD = 64

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN)
}

export interface WorkspaceContext {
  topic: string
  mission: string | null
  lessons: { title: string; summary: string }[]
  references: { title: string; content: string }[]
  learningRecords: { title: string; content: string }[]
  roadmaps: { title: string; content: string }[]
  conversationSummary: string | null
}

export interface ContextMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

function buildStateBlock(ctx: WorkspaceContext): string {
  const parts: string[] = [
    `TOPIC: ${ctx.topic}`,
    `MISSION: ${ctx.mission || 'Not yet defined — ask the user why they want to learn this'}`,
  ]

  if (ctx.lessons.length > 0) {
    const lines = ctx.lessons.map(l => `  - ${l.title} → ${l.summary}`)
    parts.push(`LESSONS CREATED (${ctx.lessons.length}):\n${lines.join('\n')}`)
  } else {
    parts.push('LESSONS CREATED: None yet')
  }

  if (ctx.references.length > 0) {
    const lines = ctx.references.map(r => `  - ${r.title} → ${r.content.slice(0, STATE_BLOCK_TRUNCATION)}`)
    parts.push(`REFERENCES:\n${lines.join('\n')}`)
  }

  if (ctx.learningRecords.length > 0) {
    const records = ctx.learningRecords
      .map(r => `- ${r.title}: ${r.content.slice(0, STATE_BLOCK_TRUNCATION)}`)
      .join('\n')
    parts.push(`LEARNING RECORDS:\n${records}`)
  }

  if (ctx.roadmaps.length > 0) {
    const lines = ctx.roadmaps.map(r => `  - ${r.title} → ${r.content.slice(0, STATE_BLOCK_TRUNCATION)}`)
    parts.push(`ROADMAPS:\n${lines.join('\n')}`)
  }

  return parts.join('\n')
}

export function buildContext(
  systemPrompt: string,
  ctx: WorkspaceContext,
  history: ContextMessage[],
  budget: number = DEFAULT_BUDGET,
): ContextMessage[] {
  const systemContent = systemPrompt + '\n\n--- CURRENT STATE ---\n' + buildStateBlock(ctx)
  let remaining = budget - estimateTokens(systemContent)
  if (remaining < 0) remaining = 0

  const messages: ContextMessage[] = [
    { role: 'system', content: systemContent },
  ]

  if (ctx.conversationSummary) {
    const summaryContent = '--- CONVERSATION SUMMARY ---\n' + ctx.conversationSummary
    const tokens = estimateTokens(summaryContent)
    if (tokens <= remaining) {
      remaining -= tokens
      messages.push({ role: 'system', content: summaryContent })
    } else {
      const cut = Math.floor(remaining * CHARS_PER_TOKEN)
      messages.push({
        role: 'system',
        content: summaryContent.slice(0, Math.max(cut, MIN_TRUNCATED_LENGTH)) + '\n[summary truncated]',
      })
      remaining = 0
    }
  }

  const included: ContextMessage[] = []
  let dropped = 0

  for (let i = history.length - 1; i >= 0; i--) {
    const msg = history[i]
    const tokens = estimateTokens(msg.content)

    if (tokens <= remaining) {
      included.unshift(msg)
      remaining -= tokens
    } else if (remaining > TRUNCATION_THRESHOLD) {
      const cut = Math.floor(remaining * CHARS_PER_TOKEN)
      included.unshift({
        ...msg,
        content: msg.content.slice(0, Math.max(cut, MIN_TRUNCATED_LENGTH)) + '\n[truncated]',
      })
      remaining = 0
    } else {
      dropped++
    }
  }

  if (dropped > 0) {
    messages.push({
      role: 'system',
      content: `[${dropped} earlier message(s) omitted due to context length. Review the conversation summary above for key points.]`,
    })
  }

  messages.push(...included)
  return messages
}
