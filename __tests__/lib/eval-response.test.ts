import { describe, it, expect } from 'vitest'
import { evaluateResponse } from '@/lib/eval-response'

const validLesson = `:::lesson[Variables in Python]
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Test</title>
<style>
* { box-sizing: border-box; }
body { font-family: serif; max-width: 720px; margin: 0 auto; }
.meta { font-size: 0.85rem; color: #666; }
.insight { background: #eff6ff; border-left: 4px solid #3b82f6; }
.compare { display: grid; grid-template-columns: 1fr 1fr; }
.bad { background: #fef2f2; }
.good { background: #f0fdf4; }
.lbl { font-weight: 700; text-transform: uppercase; }
.quiz { background: #f8fafc; border: 1px solid #e2e8f0; }
.q { padding: 0.6rem 0.9rem; border: 1px solid #d1d5db; }
.next { background: #f1f5f9; border-radius: 8px; }
</style>
</head>
<body>
<div class="meta">Lesson · Python</div>
<h1>Variables in Python</h1>
<p>Variables store data in memory.</p>
<div class="insight">"Variables are containers for data"</div>
<h2>Assignment</h2>
<p>Use = to assign values.</p>
<div class="compare">
<div class="bad"><div class="lbl">Common Mistake</div><p>Using == for assignment</p></div>
<div class="good"><div class="lbl">Better Way</div><p>Use single =</p></div>
</div>
<div class="quiz">
<h3>Check Your Understanding</h3>
<p>What does x = 5 do?</p>
<div class="q">Assigns 5 to x</div>
<div class="q">Compares x to 5</div>
</div>
<div class="next">
<h2>Next Steps</h2>
<ul><li>Try data types</li></ul>
</div>
</body>
</html>
:::`

const minimalLesson = `:::lesson[Quick Tip]
<html><body><p>Short content</p></body></html>
:::`

const validReference = `:::reference[Python Glossary]
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><style>
body { font-family: system-ui, sans-serif; }
h1 { font-size: 1.5rem; }
.term { margin-bottom: 1.5rem; }
.name { font-weight: 700; color: #2563eb; }
.def { color: #374151; }
</style></head>
<body>
<h1>Python Glossary</h1>
<div class="term"><div class="name">Variable</div><div class="def">A storage location</div></div>
<div class="term"><div class="name">Function</div><div class="def">A reusable block</div></div>
</body>
</html>
:::`

const invalidReference = `:::reference[Bad Ref]
<p>Just a paragraph with no html/head/body structure</p>
:::`

const validRoadmap = `:::roadmap[Learning Path: Python]
{
  "goal": "Become proficient in Python programming",
  "steps": [
    { "order": 1, "title": "Python Basics", "description": "Variables, data types", "status": "upcoming" },
    { "order": 2, "title": "Functions", "description": "Writing reusable code", "status": "in_progress" },
    { "order": 3, "title": "OOP", "description": "Classes and objects", "status": "completed" }
  ]
}
:::`

const invalidJsonRoadmap = `:::roadmap[Broken]
{invalid json here}
:::`

const missingFieldRoadmap = `:::roadmap[No Goal]
{
  "steps": [
    { "order": 1, "title": "Step 1", "status": "upcoming" }
  ]
}
:::`

const emptyStepsRoadmap = `:::roadmap[Empty Roadmap]
{
  "goal": "Nothing",
  "steps": []
}
:::`

const duplicateOrderRoadmap = `:::roadmap[Bad Order]
{
  "goal": "Test",
  "steps": [
    { "order": 1, "title": "First", "status": "upcoming" },
    { "order": 1, "title": "Also first", "status": "upcoming" }
  ]
}
:::`

const invalidStatusRoadmap = `:::roadmap[Bad Status]
{
  "goal": "Test",
  "steps": [
    { "order": 1, "title": "Step", "status": "unknown_status" }
  ]
}
:::`

const validRecord = `:::record[Today I Learned]
- Date: today
- Key insight: learned about closures
- Questions: how do they affect performance?
:::`

const shortRecord = `:::record[Quick Note]
ok
:::`

describe('evaluateResponse', () => {
  describe('valid lesson blocks', () => {
    it('passes a complete valid lesson', () => {
      const result = evaluateResponse(validLesson)
      expect(result.passed).toBe(true)
      expect(result.stats.lessons).toBe(1)
    })

    it('reports warnings and errors on minimal lesson', () => {
      const result = evaluateResponse(minimalLesson)
      expect(result.issues.length).toBeGreaterThan(0)
      const hasWarning = result.issues.some(i => i.type === 'warning')
      expect(hasWarning).toBe(true)
    })
  })

  describe('lesson HTML validation', () => {
    it('detects missing <html> tag', () => {
      const noHtml = ':::lesson[Bad]\n<body><p>no html tag</p></body>\n:::'
      const result = evaluateResponse(noHtml)
      const htmlIssue = result.issues.find(i => i.message.includes('<html'))
      expect(htmlIssue?.type).toBe('warning')
    })

    it('detects missing <body> tag', () => {
      const noBody = ':::lesson[Bad]\n<html><head></head><p>no body</p></html>\n:::'
      const result = evaluateResponse(noBody)
      const bodyIssue = result.issues.find(i => i.message.includes('<body'))
      expect(bodyIssue?.type).toBe('warning')
    })

    it('detects very short content', () => {
      const short = ':::lesson[Tiny]\n<html><body>Hi</body></html>\n:::'
      const result = evaluateResponse(short)
      const contentIssue = result.issues.find(i => i.message.includes('Content too short'))
      expect(contentIssue?.type).toBe('error')
    })
  })

  describe('reference validation', () => {
    it('passes a valid reference', () => {
      const result = evaluateResponse(validReference)
      expect(result.passed).toBe(true)
      expect(result.stats.references).toBe(1)
    })

    it('warns on reference missing HTML structure', () => {
      const result = evaluateResponse(invalidReference)
      expect(result.issues.length).toBeGreaterThan(0)
      const missingHtml = result.issues.some(i => i.message.includes('<html'))
      expect(missingHtml).toBe(true)
    })

    it('warns on reference with no term entries', () => {
      const result = evaluateResponse(invalidReference)
      const noTerms = result.issues.some(i => i.message.includes('No term entries'))
      expect(noTerms).toBe(true)
    })
  })

  describe('roadmap validation', () => {
    it('passes a valid roadmap', () => {
      const result = evaluateResponse(validRoadmap)
      expect(result.passed).toBe(true)
      expect(result.stats.roadmaps).toBe(1)
    })

    it('detects invalid JSON in roadmap', () => {
      const result = evaluateResponse(invalidJsonRoadmap)
      expect(result.passed).toBe(false)
      const jsonIssue = result.issues.find(i => i.message.includes('Invalid JSON'))
      expect(jsonIssue).toBeDefined()
      expect(jsonIssue?.type).toBe('error')
    })

    it('warns on missing goal field', () => {
      const result = evaluateResponse(missingFieldRoadmap)
      const goalIssue = result.issues.find(i => i.message.includes('"goal"'))
      expect(goalIssue).toBeDefined()
      expect(goalIssue?.type).toBe('warning')
    })

    it('warns on empty steps array', () => {
      const result = evaluateResponse(emptyStepsRoadmap)
      const emptySteps = result.issues.find(i => i.message.includes('zero steps'))
      expect(emptySteps?.type).toBe('warning')
    })

    it('detects duplicate order values', () => {
      const result = evaluateResponse(duplicateOrderRoadmap)
      const orderIssue = result.issues.find(i => i.message.includes('ascending order'))
      expect(orderIssue?.type).toBe('error')
    })

    it('detects invalid step status', () => {
      const result = evaluateResponse(invalidStatusRoadmap)
      const statusIssue = result.issues.find(i => i.message.includes('invalid status'))
      expect(statusIssue).toBeDefined()
      expect(statusIssue?.type).toBe('error')
    })

    it('handles missing steps array', () => {
      const content = ':::roadmap[No Steps]\n{"goal":"test"}\n:::'
      const result = evaluateResponse(content)
      const stepsIssue = result.issues.find(i => i.message.includes('"steps"'))
      expect(stepsIssue?.type).toBe('error')
    })

    it('validates all steps have titles', () => {
      const content = ':::roadmap[Bad]\n{"goal":"test","steps":[{"order":1,"status":"upcoming"}]}\n:::'
      const result = evaluateResponse(content)
      const titleIssue = result.issues.find(i => i.message.includes('"title"'))
      expect(titleIssue?.type).toBe('error')
    })
  })

  describe('record validation', () => {
    it('passes a valid record', () => {
      const result = evaluateResponse(validRecord)
      expect(result.passed).toBe(true)
      expect(result.stats.records).toBe(1)
    })

    it('warns on very short record', () => {
      const result = evaluateResponse(shortRecord)
      const shortIssue = result.issues.find(i => i.message.includes('very short'))
      expect(shortIssue?.type).toBe('warning')
    })

    it('warns on record without bullet format', () => {
      const noBullets = ':::record[No Format]\nJust some plain text\n:::'
      const result = evaluateResponse(noBullets)
      const bulletIssue = result.issues.find(i => i.message.includes('bullet'))
      expect(bulletIssue?.type).toBe('warning')
    })
  })

  describe('mixed content', () => {
    it('evaluates multiple block types together', () => {
      const content = [validLesson, validReference, validRoadmap, validRecord].join('\n\n')
      const result = evaluateResponse(content)
      expect(result.passed).toBe(true)
      expect(result.stats.lessons).toBe(1)
      expect(result.stats.references).toBe(1)
      expect(result.stats.roadmaps).toBe(1)
      expect(result.stats.records).toBe(1)
    })

    it('reports issues across all blocks', () => {
      const content = [invalidJsonRoadmap, invalidReference].join('\n\n')
      const result = evaluateResponse(content)
      expect(result.passed).toBe(false)
      expect(result.issues.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('plain text (no blocks)', () => {
    it('warns on response with no structured blocks', () => {
      const result = evaluateResponse('Just a plain text response from the AI.')
      expect(result.issues.some(i => i.message.includes('no ::lesson/::reference/::roadmap/::record blocks'))).toBe(true)
    })

    it('handles empty string', () => {
      const result = evaluateResponse('')
      expect(result.stats.textLength).toBe(0)
      expect(result.stats.lessons).toBe(0)
    })
  })

  describe('stats', () => {
    it('reports correct text length', () => {
      const result = evaluateResponse(validLesson)
      expect(result.stats.textLength).toBe(validLesson.length)
    })

    it('reports zero for missing block types', () => {
      const result = evaluateResponse(validReference)
      expect(result.stats.lessons).toBe(0)
      expect(result.stats.references).toBe(1)
      expect(result.stats.roadmaps).toBe(0)
      expect(result.stats.records).toBe(0)
    })
  })

  describe('edge cases', () => {
    it('handles roadmap with non-array steps', () => {
      const content = ':::roadmap[Bad]\n{"goal":"test","steps":"not an array"}\n:::'
      const result = evaluateResponse(content)
      expect(result.passed).toBe(false)
    })

    it('handles roadmap steps with missing order field', () => {
      const content = ':::roadmap[No Order]\n{"goal":"test","steps":[{"title":"Step 1","status":"upcoming"}]}\n:::'
      const result = evaluateResponse(content)
      expect(result.passed).toBe(true)
    })

    it('handles very short goal', () => {
      const content = ':::roadmap[Short]\n{"goal":"Hi","steps":[{"order":1,"title":"Step","status":"upcoming"}]}\n:::'
      const result = evaluateResponse(content)
      const goalIssue = result.issues.find(i => i.message.includes('goal'))
      expect(goalIssue).toBeDefined()
    })
  })
})
