import { test, expect } from '@playwright/test'

const WORKSPACE_ID = 'aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa'

test.describe('Delete message', () => {
  test('delete button appears on hover for assistant message', async ({ page }) => {
    const messages = [
      { id: 'msg-1', role: 'user', content: 'Hello', created_at: new Date().toISOString() },
      { id: 'msg-2', role: 'assistant', content: 'Hi there!', created_at: new Date().toISOString() },
    ]

    await page.route(`**/api/workspaces/${WORKSPACE_ID}/messages`, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(messages) })
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
      }
    })

    await page.goto(`/workspaces/${WORKSPACE_ID}/chat`)
    await page.waitForTimeout(1000)

    const assistantMsg = page.getByRole('article', { name: 'Assistant message' })
    await expect(assistantMsg).toBeVisible({ timeout: 10000 })

    // Hover to reveal delete button
    await assistantMsg.hover()
    const deleteBtn = assistantMsg.getByLabel('Delete this message')
    await expect(deleteBtn).toBeVisible()
  })

  test('delete button appears on hover for user message', async ({ page }) => {
    const messages = [
      { id: 'msg-1', role: 'user', content: 'Hello', created_at: new Date().toISOString() },
    ]

    await page.route(`**/api/workspaces/${WORKSPACE_ID}/messages`, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(messages) })
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
      }
    })

    await page.goto(`/workspaces/${WORKSPACE_ID}/chat`)
    await page.waitForTimeout(1000)

    const userMsg = page.getByRole('article', { name: 'Your message' })
    await expect(userMsg).toBeVisible({ timeout: 10000 })

    await userMsg.hover()
    const deleteBtn = userMsg.getByLabel('Delete this message')
    await expect(deleteBtn).toBeVisible()
  })

  test('clicking delete removes message from UI', async ({ page }) => {
    const messages = [
      { id: 'msg-1', role: 'user', content: 'Hello', created_at: new Date().toISOString() },
      { id: 'msg-2', role: 'assistant', content: 'Hi there!', created_at: new Date().toISOString() },
    ]

    let deleteCalled = false
    await page.route(`**/api/workspaces/${WORKSPACE_ID}/messages`, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(messages) })
      } else if (route.request().method() === 'DELETE') {
        deleteCalled = true
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
      }
    })

    await page.goto(`/workspaces/${WORKSPACE_ID}/chat`)
    await page.waitForTimeout(1000)

    const assistantMsg = page.getByRole('article', { name: 'Assistant message' })
    await expect(assistantMsg).toBeVisible({ timeout: 10000 })

    await assistantMsg.hover()
    await assistantMsg.getByLabel('Delete this message').click()

    // Message should be removed from UI
    await expect(assistantMsg).not.toBeVisible({ timeout: 3000 })
    expect(deleteCalled).toBe(true)
  })

  test('delete sends correct messageIds to API', async ({ page }) => {
    const messages = [
      { id: 'msg-aaa', role: 'user', content: 'Test', created_at: new Date().toISOString() },
    ]

    let deletedIds: string[] = []
    await page.route(`**/api/workspaces/${WORKSPACE_ID}/messages`, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(messages) })
      } else if (route.request().method() === 'DELETE') {
        const body = route.request().postDataJSON()
        deletedIds = body.messageIds || []
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
      }
    })

    await page.goto(`/workspaces/${WORKSPACE_ID}/chat`)
    await page.waitForTimeout(1000)

    const userMsg = page.getByRole('article', { name: 'Your message' })
    await expect(userMsg).toBeVisible({ timeout: 10000 })

    await userMsg.hover()
    await userMsg.getByLabel('Delete this message').click()

    await expect(userMsg).not.toBeVisible({ timeout: 3000 })
    expect(deletedIds).toEqual(['msg-aaa'])
  })
})

test.describe('Retry message', () => {
  test('retry button appears on hover for assistant message', async ({ page }) => {
    const messages = [
      { id: 'msg-1', role: 'user', content: 'What is Python?', created_at: new Date().toISOString() },
      { id: 'msg-2', role: 'assistant', content: 'Python is a programming language.', created_at: new Date().toISOString() },
    ]

    await page.route(`**/api/workspaces/${WORKSPACE_ID}/messages`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(messages) })
    })

    await page.goto(`/workspaces/${WORKSPACE_ID}/chat`)
    await page.waitForTimeout(1000)

    const assistantMsg = page.getByRole('article', { name: 'Assistant message' })
    await expect(assistantMsg).toBeVisible({ timeout: 10000 })

    await assistantMsg.hover()
    const retryBtn = assistantMsg.getByLabel('Retry this message')
    await expect(retryBtn).toBeVisible()
  })

  test('retry does NOT appear on user messages', async ({ page }) => {
    const messages = [
      { id: 'msg-1', role: 'user', content: 'Hello', created_at: new Date().toISOString() },
    ]

    await page.route(`**/api/workspaces/${WORKSPACE_ID}/messages`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(messages) })
    })

    await page.goto(`/workspaces/${WORKSPACE_ID}/chat`)
    await page.waitForTimeout(1000)

    const userMsg = page.getByRole('article', { name: 'Your message' })
    await expect(userMsg).toBeVisible({ timeout: 10000 })

    await userMsg.hover()
    const retryBtn = userMsg.getByLabel('Retry this message')
    await expect(retryBtn).not.toBeVisible()
  })

  test('clicking retry removes assistant message and re-sends user message', async ({ page }) => {
    const messages = [
      { id: 'msg-1', role: 'user', content: 'What is Python?', created_at: new Date().toISOString() },
      { id: 'msg-2', role: 'assistant', content: 'Python is a language.', created_at: new Date().toISOString() },
    ]

    let sentMessage = ''
    await page.route(`**/api/workspaces/${WORKSPACE_ID}/messages`, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(messages) })
      } else if (route.request().method() === 'DELETE') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
      }
    })

    await page.route('**/api/chat', async (route) => {
      const body = route.request().postDataJSON()
      sentMessage = body?.message || ''
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: 'data: {"content":"Retry response"}\ndata: [DONE]\n',
      })
    })

    await page.goto(`/workspaces/${WORKSPACE_ID}/chat`)
    await page.waitForTimeout(1000)

    const assistantMsg = page.getByRole('article', { name: 'Assistant message' })
    await expect(assistantMsg).toBeVisible({ timeout: 10000 })

    await assistantMsg.hover()
    await assistantMsg.getByLabel('Retry this message').click()

    // Should re-send the user message that preceded this assistant message
    await expect.poll(() => sentMessage, { timeout: 5000 }).toBe('What is Python?')
  })
})
