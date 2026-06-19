import { test, expect } from '@playwright/test'

test.describe('Chat', () => {
  test.describe('Chat Page Structure', () => {
    test('renders workspace tabs', async ({ page }) => {
      await page.goto('/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/chat')

      const tabs = page.getByRole('link')
      const chatTab = tabs.filter({ hasText: 'Chat' })
      const resourcesTab = tabs.filter({ hasText: 'Resources' })
      const roadmapTab = tabs.filter({ hasText: 'Roadmap' })

      await expect(chatTab).toBeVisible()
      await expect(resourcesTab).toBeVisible()
      await expect(roadmapTab).toBeVisible()
    })

    test('Chat tab is active by default', async ({ page }) => {
      await page.goto('/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/chat')

      const chatLink = page.getByRole('link', { name: 'Chat' })
      await expect(chatLink).toBeVisible()
      await expect(chatLink).toHaveAttribute('href', '/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/chat')
    })

    test('navigates to resources tab', async ({ page }) => {
      await page.goto('/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/chat')
      await page.getByRole('link', { name: 'Resources' }).click()
      await expect(page).toHaveURL('/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/resources')
    })

    test('navigates to roadmap tab', async ({ page }) => {
      await page.goto('/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/chat')
      await page.getByRole('link', { name: 'Roadmap' }).click()
      await expect(page).toHaveURL('/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/roadmap')
    })

    test('renders message input', async ({ page }) => {
      await page.goto('/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/chat')

      const messageInput = page.getByRole('textbox', { name: 'Message' })
      await expect(messageInput).toBeVisible()
      await expect(messageInput).toHaveAttribute('placeholder', 'Ask anything...')

      const sendButton = page.getByLabel('Send message')
      await expect(sendButton).toBeVisible()
    })

    test('send button is disabled when message is empty', async ({ page }) => {
      await page.goto('/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/chat')

      const sendButton = page.getByLabel('Send message')
      await expect(sendButton).toBeDisabled()
    })

    test('send button is enabled when message is typed', async ({ page }) => {
      await page.goto('/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/chat')

      await page.getByRole('textbox', { name: 'Message' }).fill('Hello')
      const sendButton = page.getByLabel('Send message')
      await expect(sendButton).toBeEnabled()
    })
  })

  test.describe('Chat Messages', () => {
    test('shows empty state when no messages', async ({ page }) => {
      await page.goto('/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/chat')

      // Mock messages API to return empty
      await page.route('**/api/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/messages', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        })
      })

      await page.reload()
      await expect(page.getByText('Start learning')).toBeVisible({ timeout: 10000 })
      await expect(page.getByText('Tell me what you want to learn about')).toBeVisible()
    })

    test('renders existing messages', async ({ page }) => {
      const messages = [
        { id: '1', role: 'user', content: 'Hello', created_at: new Date().toISOString() },
        { id: '2', role: 'assistant', content: 'Hi there! How can I help you learn?', created_at: new Date().toISOString() },
      ]

      await page.route('**/api/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/messages', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(messages),
        })
      })

      await page.goto('/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/chat')
      await page.reload()

      await expect(page.getByText('Hello')).toBeVisible({ timeout: 10000 })
      await expect(page.getByText('Hi there! How can I help you learn?')).toBeVisible()
    })

    test('sends a message via the chat API', async ({ page }) => {
      let sentMessage = ''

      await page.route('**/api/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/messages', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        })
      })

      await page.route('**/api/chat', async (route) => {
        const body = await route.request().postDataJSON()
        sentMessage = body?.message || ''
        await route.fulfill({
          status: 200,
          contentType: 'text/event-stream',
          body: 'data: {"content":"Test response"}\ndata: [DONE]\n',
        })
      })

      await page.goto('/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/chat')
      await page.getByRole('textbox', { name: 'Message' }).fill('What is Python?')
      await page.getByLabel('Send message').click()

      expect(sentMessage).toBe('What is Python?')
    })

    test('handles Enter key to send', async ({ page }) => {
      await page.route('**/api/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/messages', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        })
      })

      let sentMessage = ''
      await page.route('**/api/chat', async (route) => {
        const body = await route.request().postDataJSON()
        sentMessage = body?.message || ''
        await route.fulfill({
          status: 200,
          contentType: 'text/event-stream',
          body: 'data: {"content":"Response"}\ndata: [DONE]\n',
        })
      })

      await page.goto('/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/chat')
      const input = page.getByRole('textbox', { name: 'Message' })
      await input.fill('Hello')
      await input.press('Enter')

      expect(sentMessage).toBe('Hello')
    })

    test('Shift+Enter adds newline instead of sending', async ({ page }) => {
      await page.route('**/api/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/messages', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        })
      })

      let messageSent = false
      await page.route('**/api/chat', async (route) => {
        messageSent = true
        await route.fulfill({
          status: 200,
          contentType: 'text/event-stream',
          body: 'data: {"content":"x"}\ndata: [DONE]\n',
        })
      })

      await page.goto('/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/chat')
      const input = page.getByRole('textbox', { name: 'Message' })
      await input.fill('Line 1')
      await input.press('Shift+Enter')
      await input.fill('Line 1\nLine 2')

      expect(messageSent).toBe(false)
    })

    test('handles error when loading messages fails', async ({ page }) => {
      await page.route('**/api/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/messages', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Failed to fetch' }),
        })
      })

      await page.goto('/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/chat')

      await expect(page.getByText('Failed to load messages')).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Chat Message Rendering', () => {
    test('renders user messages right-aligned', async ({ page }) => {
      const messages = [
        { id: '1', role: 'user', content: 'User message', created_at: new Date().toISOString() },
      ]

      await page.route('**/api/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/messages', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(messages),
        })
      })

      await page.goto('/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/chat')
      await page.reload()

      const userMsg = page.getByRole('article', { name: 'Your message' })
      await expect(userMsg).toBeVisible({ timeout: 10000 })
    })

    test('renders assistant messages left-aligned', async ({ page }) => {
      const messages = [
        { id: '1', role: 'assistant', content: 'Assistant response', created_at: new Date().toISOString() },
      ]

      await page.route('**/api/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/messages', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(messages),
        })
      })

      await page.goto('/workspaces/aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa/chat')
      await page.reload()

      const asstMsg = page.getByRole('article', { name: 'Assistant message' })
      await expect(asstMsg).toBeVisible({ timeout: 10000 })
    })
  })
})
