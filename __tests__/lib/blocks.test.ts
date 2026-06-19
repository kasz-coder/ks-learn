import { describe, it, expect } from 'vitest'
import { slugify, stripHtml, parseBlocks, stripAIWrapper } from '@/lib/blocks'

describe('slugify', () => {
  it('lowercases the input', () => {
    expect(slugify('Hello World')).toBe('hello-world')
  })

  it('replaces non-alphanumeric characters with hyphens', () => {
    expect(slugify('What is JavaScript?')).toBe('what-is-javascript')
  })

  it('collapses multiple separators', () => {
    expect(slugify('a   b')).toBe('a-b')
  })

  it('trims leading and trailing hyphens', () => {
    expect(slugify('  hello  ')).toBe('hello')
  })

  it('handles empty string', () => {
    expect(slugify('')).toBe('')
  })
})

describe('stripHtml', () => {
  it('removes HTML tags', () => {
    expect(stripHtml('<p>Hello</p>')).toBe('Hello')
  })

  it('collapses whitespace', () => {
    expect(stripHtml('Hello    World')).toBe('Hello World')
  })

  it('handles nested tags', () => {
    expect(stripHtml('<div><p>Deep <b>text</b></p></div>')).toBe('Deep text')
  })

  it('trims surrounding whitespace', () => {
    expect(stripHtml('  <p>Hi</p>  ')).toBe('Hi')
  })

  it('handles empty string', () => {
    expect(stripHtml('')).toBe('')
  })

  it('removes self-closing tags without adding space', () => {
    expect(stripHtml('Line 1<br>Line 2')).toBe('Line 1Line 2')
  })
})

describe('parseBlocks', () => {
  it('parses a lesson block', () => {
    const content = 'Some text\n:::lesson[Variables in Python]\n<html><body>Content</body></html>\n:::'
    const result = parseBlocks(content)
    expect(result.lessons).toHaveLength(1)
    expect(result.lessons[0].title).toBe('Variables in Python')
    expect(result.lessons[0].content).toContain('<html>')
    expect(result.references).toHaveLength(0)
    expect(result.learningRecords).toHaveLength(0)
  })

  it('parses a reference block', () => {
    const content = ':::reference[Python Glossary]\n<html><body>Terms</body></html>\n:::'
    const result = parseBlocks(content)
    expect(result.references).toHaveLength(1)
    expect(result.references[0].title).toBe('Python Glossary')
    expect(result.references[0].content).toContain('<html>')
  })

  it('parses a learning record block', () => {
    const content = ':::record[Today I Learned]\n- Key insight: learned about loops\n:::'
    const result = parseBlocks(content)
    expect(result.learningRecords).toHaveLength(1)
    expect(result.learningRecords[0].title).toBe('Today I Learned')
    expect(result.learningRecords[0].content).toContain('Key insight')
  })

  it('parses multiple record blocks', () => {
    const content = ':::record[Session 1]\n- Date: Monday\n- Learned variables\n:::\n:::record[Session 2]\n- Date: Tuesday\n- Learned functions\n:::'
    const result = parseBlocks(content)
    expect(result.learningRecords).toHaveLength(2)
    expect(result.learningRecords[0].title).toBe('Session 1')
    expect(result.learningRecords[0].content).toContain('variables')
    expect(result.learningRecords[1].title).toBe('Session 2')
    expect(result.learningRecords[1].content).toContain('functions')
  })

  it('parses multiple blocks of different types', () => {
    const content = [
      ':::lesson[Lesson A]',
      '<html>A</html>',
      ':::',
      'some text',
      ':::reference[Ref B]',
      '<html>B</html>',
      ':::',
    ].join('\n')
    const result = parseBlocks(content)
    expect(result.lessons).toHaveLength(1)
    expect(result.references).toHaveLength(1)
  })

  it('parses legacy [/lesson] closing format', () => {
    const content = ':::lesson[Old Lesson]\n<html>Content</html>\n[/lesson]'
    const result = parseBlocks(content)
    expect(result.lessons).toHaveLength(1)
  })

  it('returns empty arrays when no blocks exist', () => {
    const result = parseBlocks('Just plain text with no blocks')
    expect(result.lessons).toHaveLength(0)
    expect(result.references).toHaveLength(0)
    expect(result.learningRecords).toHaveLength(0)
  })

  it('handles empty content', () => {
    const result = parseBlocks('')
    expect(result.lessons).toHaveLength(0)
    expect(result.references).toHaveLength(0)
    expect(result.learningRecords).toHaveLength(0)
  })

  it('trims whitespace from titles and content', () => {
    const content = ':::lesson[  Spaced Title  ]\n  <html>content</html>  \n:::'
    const result = parseBlocks(content)
    expect(result.lessons[0].title).toBe('Spaced Title')
    expect(result.lessons[0].content).toBe('<html>content</html>')
  })

  it('parses a roadmap block', () => {
    const content = 'Some text\n:::roadmap[Learning Path: SQL]\n{"goal":"Learn SQL","steps":[{"order":1,"title":"Basics","description":"","status":"upcoming"}]}\n:::'
    const result = parseBlocks(content)
    expect(result.roadmaps).toHaveLength(1)
    expect(result.roadmaps[0].title).toBe('Learning Path: SQL')
    expect(result.roadmaps[0].content).toContain('"goal"')
  })

  it('returns empty roadmaps when no roadmap block exists', () => {
    const result = parseBlocks('Just plain text')
    expect(result.roadmaps).toHaveLength(0)
  })

  it('parses a roadmap block in user format (without :::)', () => {
    const content = 'roadmap[Learning Path: JS]\n{"goal":"Build a portfolio","steps":[{"order":1,"title":"Fundamentals","description":"","status":"upcoming"}]}'
    const result = parseBlocks(content)
    expect(result.roadmaps).toHaveLength(1)
    expect(result.roadmaps[0].title).toBe('Learning Path: JS')
    expect(result.roadmaps[0].content).toContain('"goal"')
  })

  it('deduplicates roadmap when both formats present', () => {
    const content = ':::roadmap[Test]\n{"goal":"x","steps":[]}\n:::\nroadmap[Test]\n{"goal":"x","steps":[]}'
    const result = parseBlocks(content)
    expect(result.roadmaps).toHaveLength(1)
  })

  it('auto-detects bare HTML as Untitled Lesson', () => {
    const content = '<html><body><p>Long enough content here to pass the 50 char threshold for auto-detection as lesson</p></body></html>'
    const result = parseBlocks(content)
    expect(result.lessons).toHaveLength(1)
    expect(result.lessons[0].title).toBe('Untitled Lesson')
    expect(result.lessons[0].content).toBe(content)
  })

  it('slugify truncates input longer than MAX_INPUT_LENGTH', () => {
    const long = 'a'.repeat(15_000)
    const result = slugify(long)
    expect(result.length).toBeLessThanOrEqual(10_000)
  })

  it('stripHtml truncates input longer than MAX_INPUT_LENGTH', () => {
    const long = 'a'.repeat(15_000)
    const result = stripHtml(long)
    expect(result.length).toBeLessThanOrEqual(10_000)
  })
})

describe('stripAIWrapper', () => {
  it('strips Python dict wrapper with single quotes', () => {
    const raw = "[{'type': 'text', 'text': '## 📚 Lesson 2: Functions & Scope :::lesson[Functions & Scope] <!DOCTYPE html><html><body>content</body></html>'}]"
    const result = stripAIWrapper(raw)
    expect(result).not.toContain("{'type': 'text'")
    expect(result).not.toContain("'text':")
    expect(result).toContain(':::lesson[Functions & Scope]')
    expect(result).toContain('<html>')
    expect(result).toContain('## 📚 Lesson 2')
  })

  it('strips JSON dict wrapper', () => {
    const raw = '[{"type": "text", "text": "Lesson content here :::lesson[Test] <html>body</html>"}]'
    const result = stripAIWrapper(raw)
    expect(result).not.toContain('"type": "text"')
    expect(result).toContain(':::lesson[Test]')
  })

  it('does not modify content without wrapper', () => {
    const content = ':::lesson[Test]\n<html>content</html>\n:::'
    expect(stripAIWrapper(content)).toBe(content)
  })

  it('handles empty input', () => {
    expect(stripAIWrapper('')).toBe('')
  })

  it('parseBlocks with dict wrapper still extracts lessons', () => {
    const raw = "[{'type': 'text', 'text': 'some text :::lesson[Test Lesson] <html><body>content</body></html> :::'}]"
    const result = parseBlocks(raw)
    expect(result.lessons).toHaveLength(1)
    expect(result.lessons[0].title).toBe('Test Lesson')
    expect(result.lessons[0].content).toContain('content')
  })

  it('parseBlocks with dict wrapper and no ::: closing', () => {
    const raw = "[{'type': 'text', 'text': 'some text :::lesson[Test Lesson] <html><body>content</body></html>'}]"
    const result = parseBlocks(raw)
    expect(result.lessons).toHaveLength(1)
    expect(result.lessons[0].title).toBe('Test Lesson')
    expect(result.lessons[0].content).toContain('content')
  })

  it('handles space instead of newline after lesson title', () => {
    const content = 'text :::lesson[Spaced] <html>content</html> :::'
    const result = parseBlocks(content)
    expect(result.lessons).toHaveLength(1)
    expect(result.lessons[0].title).toBe('Spaced')
  })

  it('strips dict wrapper with single quotes inside content', () => {
    const raw = `[{'type': 'text', 'text': '## Functions & Scope\nYou've now explored functions and scope. :::lesson[Test] <html>body</html> :::'}]`
    const result = stripAIWrapper(raw)
    expect(result).not.toContain("{'type': 'text'")
    expect(result).toContain("You've")
    expect(result).toContain(':::lesson[Test]')
  })
})
