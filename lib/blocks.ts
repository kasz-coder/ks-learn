const MAX_INPUT_LENGTH = 10_000

export function slugify(text: string) {
  if (!text) return ''
  return text.slice(0, MAX_INPUT_LENGTH).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export function stripHtml(html: string): string {
  if (!html) return ''
  return html.slice(0, MAX_INPUT_LENGTH)
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

export function stripAIWrapper(content: string): string {
  const trimmed = content.trim()
  const prefix = "{'type': 'text', 'text': '"
  const startIdx = trimmed.indexOf(prefix)
  if (startIdx !== -1) {
    const innerStart = startIdx + prefix.length
    const endIdx = trimmed.lastIndexOf("'")
    if (endIdx > innerStart) {
      return trimmed.slice(innerStart, endIdx).replace(/\\'/g, "'").replace(/\\n/g, '\n')
    }
  }
  const jsonPrefix = '{"type": "text", "text": "'
  const jsonStartIdx = trimmed.indexOf(jsonPrefix)
  if (jsonStartIdx !== -1) {
    const innerStart = jsonStartIdx + jsonPrefix.length
    const endIdx = trimmed.lastIndexOf('"')
    if (endIdx > innerStart) {
      return trimmed.slice(innerStart, endIdx).replace(/\\"/g, '"').replace(/\\n/g, '\n')
    }
  }
  return content
}

export function parseBlocks(content: string) {
  content = stripAIWrapper(content)
  const lessons: { title: string; content: string }[] = []
  const references: { title: string; content: string }[] = []
  const learningRecords: { title: string; content: string }[] = []
  const roadmaps: { title: string; content: string }[] = []

  const lessonRe = /:::?lesson\[([^\]]+)\][ \t]*\n?([\s\S]*?)(?::::|<\/html>\s*\n?\[\/lesson\]|<\/html>\s*$)/gi
  const refRe = /:::?reference\[([^\]]+)\][ \t]*\n?([\s\S]*?)(?::::|<\/html>\s*\n?\[\/reference\]|<\/html>\s*$)/gi
  const recordRe = /:::?record\[([^\]]+)\][ \t]*\n?([\s\S]*?)(?::::|\[\/record\])/gi
  const roadmapRe = /:::?roadmap\[([^\]]+)\][ \t]*\n?([\s\S]*?):::/gi

  const roadmapUserRe = /^roadmap\[([^\]]+)\]\n([\s\S]*)$/gm

  let m: RegExpExecArray | null
  while ((m = lessonRe.exec(content)) !== null) lessons.push({ title: m[1].trim(), content: m[2].trim() })
  while ((m = refRe.exec(content)) !== null) references.push({ title: m[1].trim(), content: m[2].trim() })
  while ((m = recordRe.exec(content)) !== null) learningRecords.push({ title: m[1].trim(), content: m[2].trim() })
  while ((m = roadmapRe.exec(content)) !== null) roadmaps.push({ title: m[1].trim(), content: m[2].trim() })
  while ((m = roadmapUserRe.exec(content)) !== null) {
    const title = m[1].trim()
    const content = m[2].trim()
    if (!roadmaps.some(r => r.title === title && r.content === content)) {
      roadmaps.push({ title, content })
    }
  }

  if (lessons.length === 0 && references.length === 0 && learningRecords.length === 0 && roadmaps.length === 0) {
    const trimmed = content.trim()
    if (trimmed.length > 50 && /<html|<body|<div|<style|<h[1-6]/i.test(trimmed)) {
      lessons.push({ title: 'Untitled Lesson', content: trimmed })
    }
  }

  return { lessons, references, learningRecords, roadmaps }
}
