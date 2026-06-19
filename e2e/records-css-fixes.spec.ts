import { test, expect } from '@playwright/test'

const WORKSPACE_ID = 'aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa'

test.describe('Records and CSS fixes', () => {
  test.describe('Record blocks render as cards in chat', () => {
    test('record block appears as a styled card, not plain text', async ({ page }) => {
      const recordContent = `- Date: today
- Key insight: Python uses dynamic typing
- Questions: What about type hints?`
      const messages = [
        {
          id: '1',
          role: 'assistant',
          content: `Here is your learning record:\n\n:::record[Python Basics Record]\n${recordContent}\n:::`,
          created_at: new Date().toISOString(),
        },
      ]

      await page.route(`**/api/workspaces/${WORKSPACE_ID}/messages`, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(messages),
        })
      })

      await page.goto(`/workspaces/${WORKSPACE_ID}/chat`)
      await page.waitForTimeout(1000)

      const recordLabel = page.getByText('Learning Record', { exact: true })
      await expect(recordLabel).toBeVisible({ timeout: 10000 })

      const recordTitle = page.getByText('Python Basics Record')
      await expect(recordTitle).toBeVisible()

      const insightLine = page.getByText('Python uses dynamic typing')
      await expect(insightLine).toBeVisible()
    })

    test('record card has purple styling', async ({ page }) => {
      const messages = [
        {
          id: '1',
          role: 'assistant',
          content: `:::record[Test Record]\n- Item one\n- Item two\n:::`,
          created_at: new Date().toISOString(),
        },
      ]

      await page.route(`**/api/workspaces/${WORKSPACE_ID}/messages`, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(messages),
        })
      })

      await page.goto(`/workspaces/${WORKSPACE_ID}/chat`)
      await page.waitForTimeout(1000)

      const recordCard = page.locator('[role="listitem"]').filter({ hasText: 'Test Record' })
      await expect(recordCard).toBeVisible({ timeout: 10000 })

      await expect(recordCard).toHaveClass(/bg-purple-50/)
    })

    test('record content shows all bullet lines', async ({ page }) => {
      const messages = [
        {
          id: '1',
          role: 'assistant',
          content: `:::record[Multi-line Record]\n- First point with details\n- Second point about concepts\n- Third point with examples\n- Fourth point for review\n:::`,
          created_at: new Date().toISOString(),
        },
      ]

      await page.route(`**/api/workspaces/${WORKSPACE_ID}/messages`, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(messages),
        })
      })

      await page.goto(`/workspaces/${WORKSPACE_ID}/chat`)
      await page.waitForTimeout(1000)

      await expect(page.getByText('First point with details')).toBeVisible({ timeout: 10000 })
      await expect(page.getByText('Second point about concepts')).toBeVisible()
      await expect(page.getByText('Third point with examples')).toBeVisible()
      await expect(page.getByText('Fourth point for review')).toBeVisible()
    })
  })

  test.describe('CSS injection in chat viewer', () => {
    test('iframe receives shared styles via injectSharedStyles', async ({ page }) => {
      const lessonHtml = `<!DOCTYPE html><html><head></head><body><h1>Test Lesson</h1><p>Content here</p></body></html>`
      const messages = [
        {
          id: '1',
          role: 'assistant',
          content: `:::lesson[CSS Test Lesson]\n${lessonHtml}\n:::`,
          created_at: new Date().toISOString(),
        },
      ]

      await page.route(`**/api/workspaces/${WORKSPACE_ID}/messages`, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(messages),
        })
      })

      await page.goto(`/workspaces/${WORKSPACE_ID}/chat`)
      await page.waitForTimeout(1000)

      const lessonCard = page.getByRole('listitem').filter({ hasText: 'CSS Test Lesson' })
      await expect(lessonCard).toBeVisible({ timeout: 10000 })

      await lessonCard.click()

      const viewer = page.locator('iframe.flex-1.w-full')
      await expect(viewer).toBeVisible({ timeout: 5000 })

      const srcDoc = await viewer.getAttribute('srcdoc')
      expect(srcDoc).toContain('TeachFlow Shared Lesson Styles')
      expect(srcDoc).toContain("font-family: 'Georgia'")
    })

    test('iframe with existing style tag still gets shared styles', async ({ page }) => {
      const lessonHtml = `<!DOCTYPE html><html><head><style>.custom { color: red; }</style></head><body><h1>Styled Lesson</h1></body></html>`
      const messages = [
        {
          id: '1',
          role: 'assistant',
          content: `:::lesson[Styled Lesson]\n${lessonHtml}\n:::`,
          created_at: new Date().toISOString(),
        },
      ]

      await page.route(`**/api/workspaces/${WORKSPACE_ID}/messages`, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(messages),
        })
      })

      await page.goto(`/workspaces/${WORKSPACE_ID}/chat`)
      await page.waitForTimeout(1000)

      const lessonCard = page.getByRole('listitem').filter({ hasText: 'Styled Lesson' })
      await expect(lessonCard).toBeVisible({ timeout: 10000 })

      await lessonCard.click()

      const viewer = page.locator('iframe.flex-1.w-full')
      await expect(viewer).toBeVisible({ timeout: 5000 })

      const srcDoc = await viewer.getAttribute('srcdoc')
      expect(srcDoc).toContain('TeachFlow Shared Lesson Styles')
      expect(srcDoc).toContain('.custom')
    })
  })

  test.describe('Mixed blocks rendering', () => {
    test('renders lesson, record, and reference in same message', async ({ page }) => {
      const messages = [
        {
          id: '1',
          role: 'assistant',
          content: `:::lesson[Quick Lesson]\n<!DOCTYPE html><html><body><p>Learn here</p></body></html>\n:::\n\n:::record[Session Notes]\n- Date: today\n- Took notes on basics\n:::\n\n:::reference[Quick Ref]\n<!DOCTYPE html><html><body><p>Reference content</p></body></html>\n:::`,
          created_at: new Date().toISOString(),
        },
      ]

      await page.route(`**/api/workspaces/${WORKSPACE_ID}/messages`, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(messages),
        })
      })

      await page.goto(`/workspaces/${WORKSPACE_ID}/chat`)
      await page.waitForTimeout(1000)

      const lessonBtn = page.getByRole('listitem').filter({ hasText: 'Quick Lesson' })
      await expect(lessonBtn).toBeVisible({ timeout: 10000 })

      const refBtn = page.getByRole('listitem').filter({ hasText: 'Quick Ref' })
      await expect(refBtn).toBeVisible()

      const recordCard = page.getByRole('listitem').filter({ hasText: 'Session Notes' })
      await expect(recordCard).toBeVisible()

      await expect(page.getByText('Took notes on basics')).toBeVisible()
    })
  })
})
