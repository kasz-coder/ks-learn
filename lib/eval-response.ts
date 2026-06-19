import { parseBlocks, stripHtml } from './blocks'

export type EvalIssue = {
  type: 'error' | 'warning'
  blockType: 'lesson' | 'reference' | 'roadmap' | 'record' | 'general'
  message: string
}

export type EvalReport = {
  passed: boolean
  issues: EvalIssue[]
  stats: {
    lessons: number
    references: number
    roadmaps: number
    records: number
    textLength: number
  }
}

const REQUIRED_HTML_TAGS = ['<html', '<head', '<body']
const REQUIRED_CSS_CLASSES = ['meta', 'insight', 'compare', 'quiz', 'next']
const LESSON_CSS_WHITELIST = ['meta', 'insight', 'compare', 'bad', 'good', 'lbl', 'quiz', 'q', 'next']
const REFERENCE_CSS_WHITELIST = ['term', 'name', 'def']
const VALID_ROADMAP_STATUSES = ['upcoming', 'in_progress', 'completed']

function checkHtmlStructure(html: string, type: 'lesson' | 'reference' | 'roadmap' | 'record'): EvalIssue[] {
  const issues: EvalIssue[] = []

  if (!/<html/i.test(html) && !/<!DOCTYPE/i.test(html)) {
    issues.push({ type: 'warning', blockType: type, message: 'Missing <html> or <!DOCTYPE> declaration' })
  }

  if (!/<head/i.test(html)) {
    issues.push({ type: 'warning', blockType: type, message: 'Missing <head> section' })
  }

  if (!/<body/i.test(html)) {
    issues.push({ type: 'warning', blockType: type, message: 'Missing <body> section' })
  }

  const stripped = stripHtml(html)
  if (stripped.length < 20) {
    issues.push({ type: 'error', blockType: type, message: 'Content too short after stripping HTML' })
  }

  return issues
}

function checkLessonHtml(html: string): EvalIssue[] {
  const issues: EvalIssue[] = checkHtmlStructure(html, 'lesson')

  for (const cls of LESSON_CSS_WHITELIST) {
    const regex = new RegExp(`class="[^"]*\\b${cls}\\b[^"]*"`)
    if (!regex.test(html)) {
      issues.push({ type: 'warning', blockType: 'lesson', message: `Missing recommended CSS class: "${cls}"` })
    }
  }

  if (!html.includes('h1') && !html.includes('<h1')) {
    issues.push({ type: 'warning', blockType: 'lesson', message: 'Missing <h1> heading' })
  }

  return issues
}

function checkReferenceHtml(html: string): EvalIssue[] {
  const issues: EvalIssue[] = checkHtmlStructure(html, 'reference')

  for (const cls of REFERENCE_CSS_WHITELIST) {
    const regex = new RegExp(`class="[^"]*\\b${cls}\\b[^"]*"`)
    if (!regex.test(html)) {
      issues.push({ type: 'warning', blockType: 'reference', message: `Missing recommended CSS class: "${cls}"` })
    }
  }

  const termCount = (html.match(/class="[^"]*\bterm\b[^"]*"/gi) || []).length
  if (termCount === 0) {
    issues.push({ type: 'warning', blockType: 'reference', message: 'No term entries found (class="term")' })
  }

  return issues
}

function checkRoadmapJson(content: string): EvalIssue[] {
  const issues: EvalIssue[] = []

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(content)
  } catch {
    issues.push({ type: 'error', blockType: 'roadmap', message: 'Invalid JSON: ' + content.slice(0, 80) })
    return issues
  }

  if (!parsed.goal || typeof parsed.goal !== 'string') {
    issues.push({ type: 'warning', blockType: 'roadmap', message: 'Missing or non-string "goal" field' })
  } else if ((parsed.goal as string).length < 5) {
    issues.push({ type: 'warning', blockType: 'roadmap', message: 'Roadmap goal is too short' })
  }

  if (!Array.isArray(parsed.steps)) {
    issues.push({ type: 'error', blockType: 'roadmap', message: 'Missing or non-array "steps" field' })
    return issues
  }

  if (parsed.steps.length === 0) {
    issues.push({ type: 'warning', blockType: 'roadmap', message: 'Roadmap has zero steps' })
  }

  for (let i = 0; i < parsed.steps.length; i++) {
    const step = parsed.steps[i] as Record<string, unknown>
    if (!step.title || typeof step.title !== 'string') {
      issues.push({ type: 'error', blockType: 'roadmap', message: `Step ${i + 1}: missing or invalid "title"` })
    }
    if (step.status && !VALID_ROADMAP_STATUSES.includes(step.status as string)) {
      issues.push({ type: 'error', blockType: 'roadmap', message: `Step ${i + 1}: invalid status "${step.status}" (must be one of: ${VALID_ROADMAP_STATUSES.join(', ')})` })
    }
    if (step.order !== undefined && typeof step.order !== 'number') {
      issues.push({ type: 'error', blockType: 'roadmap', message: `Step ${i + 1}: "order" must be a number` })
    }
    if (step.description !== undefined && typeof step.description !== 'string') {
      issues.push({ type: 'error', blockType: 'roadmap', message: `Step ${i + 1}: "description" must be a string` })
    }
  }

  const orders = parsed.steps.map((s: Record<string, unknown>) => s.order).filter((o: unknown): o is number => typeof o === 'number')
  if (orders.length > 0) {
    for (let i = 1; i < orders.length; i++) {
      if (orders[i] <= orders[i - 1]) {
        issues.push({ type: 'error', blockType: 'roadmap', message: 'Steps are not in ascending order' })
        break
      }
    }
  }

  return issues
}

function checkRecordContent(content: string): EvalIssue[] {
  const issues: EvalIssue[] = []

  if (content.length < 10) {
    issues.push({ type: 'warning', blockType: 'record', message: 'Record content is very short' })
  }

  if (!content.includes('-') && !content.includes('•')) {
    issues.push({ type: 'warning', blockType: 'record', message: 'Record does not use bullet list format' })
  }

  return issues
}

export function evaluateResponse(content: string): EvalReport {
  const issues: EvalIssue[] = []
  const blocks = parseBlocks(content)

  for (const lesson of blocks.lessons) {
    issues.push(...checkLessonHtml(lesson.content))
  }

  for (const ref of blocks.references) {
    issues.push(...checkReferenceHtml(ref.content))
  }

  for (const rm of blocks.roadmaps) {
    issues.push(...checkRoadmapJson(rm.content))
  }

  for (const rec of blocks.learningRecords) {
    issues.push(...checkRecordContent(rec.content))
  }

  if (blocks.lessons.length === 0 && blocks.references.length === 0 && blocks.roadmaps.length === 0 && blocks.learningRecords.length === 0) {
    if (content.length > 0) {
      issues.push({ type: 'warning', blockType: 'general', message: 'Response contains no ::lesson/::reference/::roadmap/::record blocks' })
    }
  }

  const hasError = issues.some(i => i.type === 'error')

  return {
    passed: !hasError,
    issues,
    stats: {
      lessons: blocks.lessons.length,
      references: blocks.references.length,
      roadmaps: blocks.roadmaps.length,
      records: blocks.learningRecords.length,
      textLength: content.length,
    },
  }
}
