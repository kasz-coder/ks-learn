import { describe, it, expect } from 'vitest'
import { estimateTokens, buildContext } from '@/lib/context'
import type { WorkspaceContext, ContextMessage } from '@/lib/context'

describe('estimateTokens', () => {
  it('estimates tokens based on character count', () => {
    expect(estimateTokens('')).toBe(0)
    expect(estimateTokens('a'.repeat(350))).toBe(100)
    expect(estimateTokens('a'.repeat(351))).toBe(101)
  })
})

describe('buildContext', () => {
  const systemPrompt = 'You are TeachFlow.'
  const emptyCtx: WorkspaceContext = {
    topic: 'Python',
    mission: null,
    lessons: [],
    references: [],
    learningRecords: [],
    roadmaps: [],
    conversationSummary: null,
  }

  it('includes system prompt with state block', () => {
    const result = buildContext(systemPrompt, emptyCtx, [])
    expect(result[0].role).toBe('system')
    expect(result[0].content).toContain('You are TeachFlow.')
    expect(result[0].content).toContain('TOPIC: Python')
    expect(result[0].content).toContain('LESSONS CREATED: None yet')
  })

  it('includes mission when provided', () => {
    const ctx = { ...emptyCtx, mission: 'Build a web app' }
    const result = buildContext(systemPrompt, ctx, [])
    expect(result[0].content).toContain('MISSION: Build a web app')
  })

  it('includes lesson summaries', () => {
    const ctx: WorkspaceContext = {
      ...emptyCtx,
      lessons: [{ title: 'Variables', summary: 'How to store data' }],
    }
    const result = buildContext(systemPrompt, ctx, [])
    expect(result[0].content).toContain('LESSONS CREATED (1)')
    expect(result[0].content).toContain('Variables')
    expect(result[0].content).toContain('How to store data')
  })

  it('includes conversation summary when available', () => {
    const ctx: WorkspaceContext = {
      ...emptyCtx,
      conversationSummary: 'Covered basic syntax',
    }
    const result = buildContext(systemPrompt, ctx, [])
    expect(result[1].role).toBe('system')
    expect(result[1].content).toContain('CONVERSATION SUMMARY')
    expect(result[1].content).toContain('Covered basic syntax')
  })

  it('includes history messages in order', () => {
    const history: ContextMessage[] = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there' },
    ]
    const result = buildContext(systemPrompt, emptyCtx, history)
    expect(result[result.length - 2].role).toBe('user')
    expect(result[result.length - 2].content).toBe('Hello')
    expect(result[result.length - 1].role).toBe('assistant')
    expect(result[result.length - 1].content).toBe('Hi there')
  })

  it('drops older messages when over budget', () => {
    const history: ContextMessage[] = Array.from({ length: 100 }, (_, i) => ({
      role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
      content: 'A'.repeat(500),
    }))
    const result = buildContext(systemPrompt, emptyCtx, history, 5000)
    const sysMsgs = result.filter(m => m.role === 'system')
    const droppedMsg = sysMsgs.find(m => m.content.includes('omitted'))
    expect(droppedMsg).toBeDefined()
  })

  it('truncates messages partially when budget allows partial fit', () => {
    const history: ContextMessage[] = [
      { role: 'user', content: 'B'.repeat(10000) },
    ]
    const result = buildContext(systemPrompt, emptyCtx, history, 500)
    const userMsg = result.find(m => m.role === 'user')
    expect(userMsg?.content).toContain('[truncated]')
  })

  it('handles empty history', () => {
    const result = buildContext(systemPrompt, emptyCtx, [])
    expect(result.length).toBe(1)
    expect(result[0].role).toBe('system')
  })

  it('includes references data when provided', () => {
    const ctx: WorkspaceContext = {
      ...emptyCtx,
      references: [{ title: 'Python Glossary', content: 'A list of common Python terms and their meanings.' }],
    }
    const result = buildContext(systemPrompt, ctx, [])
    expect(result[0].content).toContain('REFERENCES')
    expect(result[0].content).toContain('Python Glossary')
    expect(result[0].content).toContain('common Python terms')
  })

  it('includes learning records data when provided', () => {
    const ctx: WorkspaceContext = {
      ...emptyCtx,
      learningRecords: [{ title: 'Session 1', content: 'Learned about variables and functions.' }],
    }
    const result = buildContext(systemPrompt, ctx, [])
    expect(result[0].content).toContain('LEARNING RECORDS')
    expect(result[0].content).toContain('Session 1')
    expect(result[0].content).toContain('variables and functions')
  })

  it('includes roadmaps data when provided', () => {
    const ctx: WorkspaceContext = {
      ...emptyCtx,
      roadmaps: [{ title: 'Python Path', content: '{"goal":"Master Python","steps":[]}' }],
    }
    const result = buildContext(systemPrompt, ctx, [])
    expect(result[0].content).toContain('ROADMAPS')
    expect(result[0].content).toContain('Python Path')
    expect(result[0].content).toContain('Master Python')
  })
})
