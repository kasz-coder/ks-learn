import { test, expect } from '@playwright/test'

const WORKSPACE_ID = 'aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa'
const MESSAGES_URL = `**/api/workspaces/${WORKSPACE_ID}/messages`

test.describe('Chat Loading State', () => {
  test('should not show "Start learning" when workspace has messages', async ({ page }) => {
    const messages = [
      { id: '1', role: 'user', content: 'Hello', created_at: new Date().toISOString() },
      { id: '2', role: 'assistant', content: 'Hi there!', created_at: new Date().toISOString() },
    ]

    await page.route(MESSAGES_URL, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ messages, total: 2 }),
      })
    })

    await page.goto(`/workspaces/${WORKSPACE_ID}/chat`)

    // "Start learning" should never appear when messages exist
    const startLearning = page.getByText('Start learning')
    await expect(startLearning).not.toBeVisible({ timeout: 15000 })

    // The actual messages should be visible
    await expect(page.getByText('Hello')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Hi there!')).toBeVisible()
  })

  test('should not show "Load earlier messages" when total <= PAGE_SIZE', async ({ page }) => {
    const messages = [
      { id: '1', role: 'user', content: 'Hello', created_at: new Date().toISOString() },
      { id: '2', role: 'assistant', content: 'Hi there!', created_at: new Date().toISOString() },
    ]

    await page.route(MESSAGES_URL, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ messages, total: 2 }),
      })
    })

    await page.goto(`/workspaces/${WORKSPACE_ID}/chat`)

    // "Load earlier messages" should NOT appear (total=2 < PAGE_SIZE=10)
    const loadMore = page.getByText('Load earlier messages')
    await expect(loadMore).not.toBeVisible({ timeout: 15000 })
  })

  test('should show shimmer skeleton while loading, not empty state', async ({ page }) => {
    let resolveMessages!: () => void
    const messagesPromise = new Promise<void>((resolve) => {
      resolveMessages = resolve
    })

    await page.route(MESSAGES_URL, async (route) => {
      await messagesPromise
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          messages: [
            { id: '1', role: 'user', content: 'Hello', created_at: new Date().toISOString() },
          ],
          total: 1,
        }),
      })
    })

    await page.goto(`/workspaces/${WORKSPACE_ID}/chat`)

    // While loading, skeleton placeholders should be visible and empty state should NOT
    const skeleton = page.locator('.animate-pulse-soft').first()
    await expect(skeleton).toBeVisible({ timeout: 5000 })

    // "Start learning" should NOT be visible during loading
    await expect(page.getByText('Start learning')).not.toBeVisible()

    // Resolve the API call
    resolveMessages()

    // After loading, messages should appear
    await expect(page.getByText('Hello')).toBeVisible({ timeout: 10000 })
  })

  test('flash regression: "Start learning" never visible when messages exist', async ({ page }) => {
    const messages = [
      { id: '1', role: 'user', content: 'Hello', created_at: new Date().toISOString() },
      { id: '2', role: 'assistant', content: 'Hi there!', created_at: new Date().toISOString() },
    ]

    await page.route(MESSAGES_URL, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ messages, total: 2 }),
      })
    })

    await page.goto(`/workspaces/${WORKSPACE_ID}/chat`)

    // Poll rapidly to catch any flash of the empty state
    const startLearning = page.getByText('Start learning')
    const loadEarlier = page.getByText('Load earlier messages')

    for (let i = 0; i < 50; i++) {
      const visible = await startLearning.isVisible()
      expect(visible).toBe(false)
      const loadVisible = await loadEarlier.isVisible()
      expect(loadVisible).toBe(false)
      await page.waitForTimeout(50)
    }

    await expect(page.getByText('Hello')).toBeVisible({ timeout: 10000 })
  })
})
